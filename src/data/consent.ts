import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import type { AppIdentity } from "@/data/apps";
import { recordAccess } from "@/data/access-events";
import { requireUser } from "@/data/auth";
import { lockOwnedApps } from "@/data/grants";
import {
  appGrants,
  appSourceAccess,
  connectedApps,
  consentRequests,
  type ConsentStatus,
  type GrantOperation,
} from "@/db/schema";
import { decryptField, encryptField } from "@/lib/crypto";
import { db } from "@/lib/db";
import {
  MEMORY_CATEGORIES,
  sensitivityRank,
  type MemoryCategory,
  type Sensitivity,
} from "@/lib/memory-taxonomy";
import type { AccessSource } from "@/lib/policy/evaluate-access";

// Apps asking the owner for access they don't have (docs/public-api.md, `POST /consent-requests`).
// Asking needs no grant and changes nothing. Only the owner's approval writes grants, and only
// within what was asked: an approval can narrow a request, never widen it.

/** A validated `POST /api/v1/consent-requests` body. */
export type ConsentRequestInput = {
  operation: GrantOperation;
  categories: MemoryCategory[];
  maxSensitivity: Sensitivity;
  reason: string;
};

/** A request waiting for the owner, with the app's reason decrypted. */
export type ConsentRequestDTO = {
  id: string;
  appId: string;
  appName: string;
  operation: GrantOperation;
  /** In taxonomy order. */
  categories: MemoryCategory[];
  maxSensitivity: Sensitivity;
  reason: string;
  createdAt: Date;
};

/** What the owner allows when approving: the request itself, or a narrower part of it. */
export type ConsentDecision = {
  categories: MemoryCategory[];
  maxSensitivity: Sensitivity;
  /** Reads only: sources to allow on top of those the app already has. */
  sources: AccessSource[];
};

const inTaxonomyOrder = (categories: MemoryCategory[]) =>
  MEMORY_CATEGORIES.filter(category => categories.includes(category));

// ── Low-level: NOT session-checked. Only for the gateway, with an identity from `requireApp`. ──

/** Files an app's request for the owner to decide, and records it in the access log. */
export async function createConsentRequest(
  app: Pick<AppIdentity, "userId" | "appId" | "appName">,
  input: ConsentRequestInput
): Promise<{ id: string; status: ConsentStatus }> {
  const categories = inTaxonomyOrder(input.categories);
  const [row] = await db
    .insert(consentRequests)
    .values({
      userId: app.userId,
      appId: app.appId,
      operation: input.operation,
      categories,
      maxSensitivity: input.maxSensitivity,
      reasonEncrypted: encryptField(input.reason),
    })
    .returning({ id: consentRequests.id, status: consentRequests.status });

  await recordAccess({
    app,
    action: "consent",
    channel: "api",
    // Filing was accepted; what the app gets is up to the owner.
    outcome: "allowed",
    purpose: input.reason,
    categories,
  });
  return row!;
}

// ── Owner-scoped: each function checks the session and only touches the owner's requests. ──

/** Requests still waiting for the owner, newest first. */
export async function listPendingConsentRequests(): Promise<ConsentRequestDTO[]> {
  const user = await requireUser();
  const rows = await db
    .select({
      id: consentRequests.id,
      appId: consentRequests.appId,
      appName: connectedApps.name,
      operation: consentRequests.operation,
      categories: consentRequests.categories,
      maxSensitivity: consentRequests.maxSensitivity,
      reasonEncrypted: consentRequests.reasonEncrypted,
      createdAt: consentRequests.createdAt,
    })
    .from(consentRequests)
    .innerJoin(connectedApps, eq(connectedApps.id, consentRequests.appId))
    .where(and(eq(consentRequests.userId, user.id), eq(consentRequests.status, "pending")))
    .orderBy(desc(consentRequests.createdAt), desc(consentRequests.id));

  return rows.map(({ reasonEncrypted, ...request }) => ({
    ...request,
    reason: decryptField(reasonEncrypted),
  }));
}

/**
 * Approves a pending request with what the owner allowed, in one transaction: grants each chosen
 * category up to the chosen tier (an existing higher cap stays: approving never lowers access),
 * allows the chosen sources, and marks the request approved. False if the request isn't the
 * owner's or isn't pending anymore, or if the decision asks for more than the app did.
 */
export async function approveConsentRequest(
  id: string,
  decision: ConsentDecision
): Promise<boolean> {
  const user = await requireUser();
  const owned = and(eq(consentRequests.id, id), eq(consentRequests.userId, user.id));

  return db.transaction(async tx => {
    // Read without a lock first: the apps must be locked before the request, as an app delete
    // (which cascades to its requests) locks them.
    const [request] = await tx
      .select({
        appId: consentRequests.appId,
        operation: consentRequests.operation,
        categories: consentRequests.categories,
        maxSensitivity: consentRequests.maxSensitivity,
      })
      .from(consentRequests)
      .where(owned);
    if (!request) return false;

    const categories = inTaxonomyOrder(decision.categories);
    const narrows =
      categories.length > 0 &&
      categories.every(category => request.categories.includes(category)) &&
      sensitivityRank(decision.maxSensitivity) <= sensitivityRank(request.maxSensitivity) &&
      (request.operation === "read" || decision.sources.length === 0);
    if (!narrows) return false;

    const sourceAppIds = decision.sources.flatMap(s => (s.type === "app" ? [s.appId] : []));
    if (!(await lockOwnedApps(tx, user.id, [request.appId, ...sourceAppIds]))) return false;

    const [pending] = await tx
      .select({ id: consentRequests.id })
      .from(consentRequests)
      .where(and(owned, eq(consentRequests.status, "pending")))
      .for("update");
    if (!pending) return false;

    const existing = await tx
      .select({ category: appGrants.category, maxSensitivity: appGrants.maxSensitivity })
      .from(appGrants)
      .where(and(eq(appGrants.appId, request.appId), eq(appGrants.operation, request.operation)));
    const caps = new Map(existing.map(grant => [grant.category, grant.maxSensitivity]));
    const raised = categories.filter(category => {
      const cap = caps.get(category);
      return !cap || sensitivityRank(cap) < sensitivityRank(decision.maxSensitivity);
    });

    if (raised.length > 0) {
      await tx
        .insert(appGrants)
        .values(
          raised.map(category => ({
            userId: user.id,
            appId: request.appId,
            operation: request.operation,
            category,
            maxSensitivity: decision.maxSensitivity,
          }))
        )
        .onConflictDoUpdate({
          target: [appGrants.appId, appGrants.operation, appGrants.category],
          set: { maxSensitivity: decision.maxSensitivity },
        });
    }

    if (decision.sources.length > 0) {
      await tx
        .insert(appSourceAccess)
        .values(
          decision.sources.map(source => ({
            userId: user.id,
            appId: request.appId,
            sourceAppId: source.type === "app" ? source.appId : null,
          }))
        )
        .onConflictDoNothing();
    }

    await tx
      .update(consentRequests)
      .set({ status: "approved", decidedAt: sql`now()` })
      .where(owned);
    return true;
  });
}

/** Denies a pending request. Nothing else changes. False if it isn't the owner's or isn't pending. */
export async function denyConsentRequest(id: string): Promise<boolean> {
  const user = await requireUser();
  const denied = await db
    .update(consentRequests)
    .set({ status: "denied", decidedAt: sql`now()` })
    .where(
      and(
        eq(consentRequests.id, id),
        eq(consentRequests.userId, user.id),
        eq(consentRequests.status, "pending")
      )
    )
    .returning({ id: consentRequests.id });
  return denied.length > 0;
}
