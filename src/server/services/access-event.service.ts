import "server-only";
import * as accessEventRepository from "@/server/repository/access-event.repository";
import type { AccessEventInput } from "@/server/repository/access-event.repository";
import type { AccessEventPage } from "@/shared/types/access-event.types";

export type { AccessEventInput };

export const ACCESS_EVENT_PAGE_SIZE = 20;

/**
 * Records one app access in the owner's access log. Returns the event's id, which the API hands back
 * as `requestId`, so an app's request and the owner's log entry match. Only call it with an identity
 * from `requireApp` (or the owner's own app pick in the Playground).
 */
export function recordAccess(event: AccessEventInput): Promise<string> {
  return accessEventRepository.insertAccessEvent(event);
}

/** The owner's access log, newest first. Pass the id of the owner from `requireUser`. */
export function listAccessEvents(
  userId: string,
  page = 1,
  pageSize = ACCESS_EVENT_PAGE_SIZE
): Promise<AccessEventPage> {
  return accessEventRepository.listAccessEvents(userId, page, pageSize);
}
