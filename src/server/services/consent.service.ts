import "server-only";
import * as consentRepository from "@/server/repository/consent.repository";
import type { ConsentRequestInput } from "@/server/repository/consent.repository";
import { recordAccess } from "@/server/services/access-event.service";
import type { AppIdentity } from "@/server/services/app.service";
import { MEMORY_CATEGORIES, type MemoryCategory } from "@/shared/constants/memory-taxonomy";
import type { ConsentStatus } from "@/shared/constants/permissions";
import type { ConsentDecision, ConsentRequestDTO } from "@/shared/types/consent.types";

export type { ConsentRequestInput };

// Apps asking the owner for access they don't have (docs/public-api.md, `POST /consent-requests`).
// Asking needs no grant and changes nothing. Only the owner's approval writes grants, and only
// within what was asked: an approval can narrow a request, never widen it.

const inTaxonomyOrder = (categories: MemoryCategory[]) =>
  MEMORY_CATEGORIES.filter(category => categories.includes(category));

// ── App-facing: only with an identity from `requireApp`. ──

/** Files an app's request for the owner to decide, and records it in the access log. */
export async function createConsentRequest(
  app: Pick<AppIdentity, "userId" | "appId" | "appName">,
  input: ConsentRequestInput
): Promise<{ id: string; status: ConsentStatus }> {
  const categories = inTaxonomyOrder(input.categories);
  const request = await consentRepository.insertConsentRequest(app.userId, app.appId, {
    ...input,
    categories,
  });

  await recordAccess({
    app,
    action: "consent",
    channel: "api",
    // Filing was accepted; what the app gets is up to the owner.
    outcome: "allowed",
    purpose: input.reason,
    categories,
  });
  return request;
}

// ── Owner-facing: pass the id of the owner from `requireUser`. Only the owner's requests are read
// or decided. ──

/** Requests still waiting for the owner, newest first. */
export function listPendingConsentRequests(userId: string): Promise<ConsentRequestDTO[]> {
  return consentRepository.listPendingConsentRequests(userId);
}

/**
 * Approves a pending request with what the owner allowed, atomically, never lowering an existing
 * cap. False if the request isn't the owner's or isn't pending anymore, or if the decision asks for
 * more than the app did.
 */
export function approveConsentRequest(
  userId: string,
  id: string,
  decision: ConsentDecision
): Promise<boolean> {
  return consentRepository.approveConsentRequest(userId, id, {
    ...decision,
    categories: inTaxonomyOrder(decision.categories),
  });
}

/** Denies a pending request. Nothing else changes. False if it isn't the owner's or isn't pending. */
export function denyConsentRequest(userId: string, id: string): Promise<boolean> {
  return consentRepository.denyConsentRequest(userId, id);
}
