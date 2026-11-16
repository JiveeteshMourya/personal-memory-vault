import type { MemoryCategory } from "@/shared/constants/memory-taxonomy";
import type { AccessAction, AccessChannel, AccessOutcome } from "@/shared/constants/permissions";

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
