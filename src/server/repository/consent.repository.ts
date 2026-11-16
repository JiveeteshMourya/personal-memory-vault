import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { decryptField, encryptField } from "@/server/lib/crypto";
import { db } from "@/server/lib/db";
import { appGrants, appSourceAccess, connectedApps, consentRequests } from "@/server/models";
import { lockOwnedApps } from "@/server/repository/grant.repository";
import {
  sensitivityRank,
  type MemoryCategory,
  type Sensitivity,
} from "@/shared/constants/memory-taxonomy";
import type { ConsentStatus, GrantOperation } from "@/shared/constants/permissions";
import type { ConsentDecision, ConsentRequestDTO } from "@/shared/types/consent.types";

// Consent requests: apps asking the owner for access they don't have. The app's reason is encrypted
// here on the way in and decrypted on the way out. Not session-checked: every function takes the
// owner's id and only touches that owner's requests. Call it from services, after authorization.

/** A validated `POST /api/v1/consent-requests` body. */
export type ConsentRequestInput = {
  operation: GrantOperation;
  categories: MemoryCategory[];
  maxSensitivity: Sensitivity;
  reason: string;
};

/** Files an app's request for its owner to decide. */
export async function insertConsentRequest(
  userId: string,
  appId: string,
  input: ConsentRequestInput
): Promise<{ id: string; status: ConsentStatus }> {
  const [row] = await db
    .insert(consentRequests)
    .values({
      userId,
      appId,
      operation: input.operation,
      categories: input.categories,
      maxSensitivity: input.maxSensitivity,
      reasonEncrypted: encryptField(input.reason),
    })
    .returning({ id: consentRequests.id, status: consentRequests.status });
  return row!;
}

/** Requests still waiting for the owner, newest first. */
export async function listPendingConsentRequests(userId: string): Promise<ConsentRequestDTO[]> {
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
    .where(and(eq(consentRequests.userId, userId), eq(consentRequests.status, "pending")))
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
  userId: string,
  id: string,
  decision: ConsentDecision
): Promise<boolean> {
  const owned = and(eq(consentRequests.id, id), eq(consentRequests.userId, userId));

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

    const { categories } = decision;
    const narrows =
      categories.length > 0 &&
      categories.every(category => request.categories.includes(category)) &&
      sensitivityRank(decision.maxSensitivity) <= sensitivityRank(request.maxSensitivity) &&
      (request.operation === "read" || decision.sources.length === 0);
    if (!narrows) return false;

    const sourceAppIds = decision.sources.flatMap(s => (s.type === "app" ? [s.appId] : []));
    if (!(await lockOwnedApps(tx, userId, [request.appId, ...sourceAppIds]))) return false;

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
            userId,
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
            userId,
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
export async function denyConsentRequest(userId: string, id: string): Promise<boolean> {
  const denied = await db
    .update(consentRequests)
    .set({ status: "denied", decidedAt: sql`now()` })
    .where(
      and(
        eq(consentRequests.id, id),
        eq(consentRequests.userId, userId),
        eq(consentRequests.status, "pending")
      )
    )
    .returning({ id: consentRequests.id });
  return denied.length > 0;
}
