import "server-only";
import { desc, eq } from "drizzle-orm";
import type { AppIdentity } from "@/data/apps";
import { requireUser } from "@/data/auth";
import {
  accessEvents,
  type AccessAction,
  type AccessChannel,
  type AccessOutcome,
} from "@/db/schema";
import { decryptField, encryptField } from "@/lib/crypto";
import { db } from "@/lib/db";
import type { MemoryCategory } from "@/lib/memory-taxonomy";

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

/** An access event as the owner sees it, with the purpose and query decrypted. */
export type AccessEventDTO = {
  id: string;
  /** Null once the app is deleted; `appName` still names it. */
  appId: string | null;
  appName: string;
  action: AccessAction;
  channel: AccessChannel;
  outcome: AccessOutcome;
  purpose: string | null;
  query: string | null;
  categories: MemoryCategory[];
  memoryIds: string[];
  withheldCount: number;
  sessionId: string | null;
  createdAt: Date;
};

export type AccessEventPage = { events: AccessEventDTO[]; page: number; hasNextPage: boolean };

export const ACCESS_EVENT_PAGE_SIZE = 20;

// ── Low-level: NOT session-checked. Only for the gateway, with an identity from `requireApp` (or
// the owner's own app choice in the Playground). ──

/** Records one app access in the owner's access log. */
export async function recordAccess(event: AccessEventInput): Promise<void> {
  await db.insert(accessEvents).values({
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
  });
}

// ── Owner-scoped ──

/** The owner's access log, newest first, `ACCESS_EVENT_PAGE_SIZE` per page (1-based). */
export async function listAccessEvents(page = 1): Promise<AccessEventPage> {
  const user = await requireUser();
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
    .where(eq(accessEvents.userId, user.id))
    .orderBy(desc(accessEvents.createdAt), desc(accessEvents.id))
    // One extra row tells whether there is a next page.
    .limit(ACCESS_EVENT_PAGE_SIZE + 1)
    .offset((current - 1) * ACCESS_EVENT_PAGE_SIZE);

  return {
    events: rows
      .slice(0, ACCESS_EVENT_PAGE_SIZE)
      .map(({ purposeEncrypted, queryEncrypted, ...event }) => ({
        ...event,
        purpose: purposeEncrypted ? decryptField(purposeEncrypted) : null,
        query: queryEncrypted ? decryptField(queryEncrypted) : null,
      })),
    page: current,
    hasNextPage: rows.length > ACCESS_EVENT_PAGE_SIZE,
  };
}
