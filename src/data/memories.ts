import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { requireUser } from "@/data/auth";
import { memories } from "@/db/schema";
import { decryptField, encryptField } from "@/lib/crypto";
import { db } from "@/lib/db";
import type { MemoryCategory, Sensitivity } from "@/lib/memory-taxonomy";

/** Who wrote a memory: the owner, or a connected app. */
export type MemorySource = { type: "user" } | { type: "app"; appId: string };

/** A decrypted memory. Only ever returned to the owner or to an authorized caller. */
export type MemoryDTO = {
  id: string;
  content: string;
  category: MemoryCategory;
  sensitivity: Sensitivity;
  source: MemorySource;
  occurredAt: Date;
  createdAt: Date;
};

/** What a caller supplies to create or replace a memory. `occurredAt` defaults to now. */
export type MemoryInput = {
  content: string;
  category: MemoryCategory;
  sensitivity: Sensitivity;
  occurredAt?: Date;
};

export type MemoryFilters = {
  category?: MemoryCategory;
  sensitivity?: Sensitivity;
  source?: MemorySource["type"];
  /** 1-based. */
  page?: number;
};

export type MemoryPage = { memories: MemoryDTO[]; page: number; hasNextPage: boolean };

export const MEMORY_PAGE_SIZE = 20;

// Every column a DTO needs, and nothing else (no user_id).
const dtoColumns = {
  id: memories.id,
  contentEncrypted: memories.contentEncrypted,
  category: memories.category,
  sensitivity: memories.sensitivity,
  sourceType: memories.sourceType,
  sourceAppId: memories.sourceAppId,
  occurredAt: memories.occurredAt,
  createdAt: memories.createdAt,
};

type MemoryRow = {
  [K in keyof typeof dtoColumns]: (typeof memories.$inferSelect)[K];
};

function toDTO(row: MemoryRow): MemoryDTO {
  return {
    id: row.id,
    content: decryptField(row.contentEncrypted),
    category: row.category,
    sensitivity: row.sensitivity,
    // The memories_source_check constraint guarantees an app id for app-written rows.
    source: row.sourceType === "app" ? { type: "app", appId: row.sourceAppId! } : { type: "user" },
    occurredAt: row.occurredAt,
    createdAt: row.createdAt,
  };
}

// ── Owner-scoped: each function checks the session and only touches the owner's rows. ──

/** The owner's memories, newest first, filtered and paginated. */
export async function listMemories(filters: MemoryFilters = {}): Promise<MemoryPage> {
  const user = await requireUser();
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const rows = await db
    .select(dtoColumns)
    .from(memories)
    .where(
      and(
        eq(memories.userId, user.id),
        filters.category && eq(memories.category, filters.category),
        filters.sensitivity && eq(memories.sensitivity, filters.sensitivity),
        filters.source && eq(memories.sourceType, filters.source)
      )
    )
    .orderBy(desc(memories.occurredAt), desc(memories.id))
    // One extra row tells whether there is a next page.
    .limit(MEMORY_PAGE_SIZE + 1)
    .offset((page - 1) * MEMORY_PAGE_SIZE);

  return {
    memories: rows.slice(0, MEMORY_PAGE_SIZE).map(toDTO),
    page,
    hasNextPage: rows.length > MEMORY_PAGE_SIZE,
  };
}

/** One of the owner's memories, or null if it doesn't exist or isn't theirs. */
export async function getMemory(id: string): Promise<MemoryDTO | null> {
  const user = await requireUser();
  const [row] = await db
    .select(dtoColumns)
    .from(memories)
    .where(and(eq(memories.id, id), eq(memories.userId, user.id)));
  return row ? toDTO(row) : null;
}

/** Stores a memory the owner wrote themselves. */
export async function createMemory(input: MemoryInput): Promise<MemoryDTO> {
  const user = await requireUser();
  return insertMemory(user.id, input, { type: "user" });
}

/**
 * Replaces a memory's content, category, sensitivity and date. The source never changes.
 * Returns null if the memory doesn't exist or isn't the owner's.
 */
export async function updateMemory(id: string, input: MemoryInput): Promise<MemoryDTO | null> {
  const user = await requireUser();
  const [row] = await db
    .update(memories)
    .set({
      contentEncrypted: encryptField(input.content),
      category: input.category,
      sensitivity: input.sensitivity,
      occurredAt: input.occurredAt,
    })
    .where(and(eq(memories.id, id), eq(memories.userId, user.id)))
    .returning(dtoColumns);
  return row ? toDTO(row) : null;
}

/** Deletes one of the owner's memories. Returns false if it doesn't exist or isn't theirs. */
export async function deleteMemory(id: string): Promise<boolean> {
  const user = await requireUser();
  const deleted = await db
    .delete(memories)
    .where(and(eq(memories.id, id), eq(memories.userId, user.id)))
    .returning({ id: memories.id });
  return deleted.length > 0;
}

// ── Low-level: NOT session-checked. Only call after authorizing the access (the gateway's
// permission checks, or a trusted script). ──

/**
 * Encrypts and stores a memory for `userId`. Only call after authorization: the caller must
 * already have checked that `source` may write this memory for this owner.
 */
export async function insertMemory(
  userId: string,
  input: MemoryInput,
  source: MemorySource
): Promise<MemoryDTO> {
  const [row] = await db
    .insert(memories)
    .values({
      userId,
      contentEncrypted: encryptField(input.content),
      category: input.category,
      sensitivity: input.sensitivity,
      sourceType: source.type,
      sourceAppId: source.type === "app" ? source.appId : null,
      occurredAt: input.occurredAt,
    })
    .returning(dtoColumns);
  return toDTO(row!);
}

/**
 * Loads and decrypts `userId`'s memories with these ids, in the order of `ids` (so a relevance
 * ranking survives). Ids that don't exist or belong to someone else are left out. Only call after
 * authorization: the caller must already have restricted `ids` to what it may disclose.
 */
export async function getMemoriesByIds(userId: string, ids: string[]): Promise<MemoryDTO[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select(dtoColumns)
    .from(memories)
    .where(and(eq(memories.userId, userId), inArray(memories.id, ids)));
  const position = new Map(ids.map((id, index) => [id, index]));
  return rows.map(toDTO).sort((a, b) => position.get(a.id)! - position.get(b.id)!);
}
