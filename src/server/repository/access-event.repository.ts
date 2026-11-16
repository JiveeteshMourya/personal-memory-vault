import "server-only";
import { desc, eq } from "drizzle-orm";
import { decryptField, encryptField } from "@/server/lib/crypto";
import { db } from "@/server/lib/db";
import { accessEvents } from "@/server/models";
import type { AppIdentity } from "@/server/repository/app.repository";
import type { MemoryCategory } from "@/shared/constants/memory-taxonomy";
import type { AccessAction, AccessChannel, AccessOutcome } from "@/shared/constants/permissions";
import type { AccessEventPage } from "@/shared/types/access-event.types";

// The owner's access log. The purpose and query are encrypted here on the way in and decrypted on
// the way out. Not session-checked: call it from services, after authorization.

/** One app access to record. `purpose` and `query` are encrypted before they're stored. */
export type AccessEventInput = {
  app: Pick<AppIdentity, "userId" | "appId" | "appName">;
  action: AccessAction;
  channel: AccessChannel;
  outcome: AccessOutcome;
  purpose?: string;
  query?: string;
  categories?: MemoryCategory[];
  /** The memories written, retracted or disclosed. */
  memoryIds?: string[];
  withheldCount?: number;
  sessionId?: string;
};

/** Stores one app access in its owner's access log, and returns the event's id. */
export async function insertAccessEvent(event: AccessEventInput): Promise<string> {
  const [row] = await db
    .insert(accessEvents)
    .values({
      userId: event.app.userId,
      appId: event.app.appId,
      appName: event.app.appName,
      action: event.action,
      channel: event.channel,
      outcome: event.outcome,
      purposeEncrypted: event.purpose ? encryptField(event.purpose) : null,
      queryEncrypted: event.query ? encryptField(event.query) : null,
      categories: event.categories ?? [],
      memoryIds: event.memoryIds ?? [],
      withheldCount: event.withheldCount ?? 0,
      sessionId: event.sessionId ?? null,
    })
    .returning({ id: accessEvents.id });
  return row!.id;
}

/** The owner's access log, newest first, `pageSize` per page (1-based). */
export async function listAccessEvents(
  userId: string,
  page: number,
  pageSize: number
): Promise<AccessEventPage> {
  const current = Math.max(1, Math.floor(page));
  const rows = await db
    .select({
      id: accessEvents.id,
      appId: accessEvents.appId,
      appName: accessEvents.appName,
      action: accessEvents.action,
      channel: accessEvents.channel,
      outcome: accessEvents.outcome,
      purposeEncrypted: accessEvents.purposeEncrypted,
      queryEncrypted: accessEvents.queryEncrypted,
      categories: accessEvents.categories,
      memoryIds: accessEvents.memoryIds,
      withheldCount: accessEvents.withheldCount,
      sessionId: accessEvents.sessionId,
      createdAt: accessEvents.createdAt,
    })
    .from(accessEvents)
    .where(eq(accessEvents.userId, userId))
    .orderBy(desc(accessEvents.createdAt), desc(accessEvents.id))
    // One extra row tells whether there is a next page.
    .limit(pageSize + 1)
    .offset((current - 1) * pageSize);

  return {
    events: rows.slice(0, pageSize).map(({ purposeEncrypted, queryEncrypted, ...event }) => ({
      ...event,
      purpose: purposeEncrypted ? decryptField(purposeEncrypted) : null,
      query: queryEncrypted ? decryptField(queryEncrypted) : null,
    })),
    page: current,
    hasNextPage: rows.length > pageSize,
  };
}
