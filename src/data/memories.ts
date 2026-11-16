import "server-only";
import { and, count, desc, eq, inArray, or } from "drizzle-orm";
import { requireUser } from "@/data/auth";
import { indexMemories, removeFromIndex } from "@/data/memory-index";
import { memories } from "@/db/schema";
import { decryptField, encryptField } from "@/lib/crypto";
import { db } from "@/lib/db";
import { errorSummary, logger } from "@/lib/logger";
import {
  MEMORY_CATEGORIES,
  SENSITIVITY_TIERS,
  type ContentType,
  type MemoryCategory,
  type MemoryEntity,
  type Provenance,
  type Sensitivity,
  type Visibility,
} from "@/lib/memory-taxonomy";

/** Who wrote a memory: the owner, or a connected app (`appId` null once that app is deleted). */
export type MemorySource = { type: "user" } | { type: "app"; appId: string | null };

/** A decrypted memory. Only ever returned to the owner or to an authorized caller. */
export type MemoryDTO = {
  id: string;
  content: string;
  category: MemoryCategory;
  sensitivity: Sensitivity;
  source: MemorySource;
  provenance: Provenance;
  /** 0–1: how far the memory can be trusted. */
  confidence: number;
  /** 1–5: ranks the memory higher at read time. */
  importance: number;
  visibility: Visibility;
  /** Never shared with an app after this. */
  expiresAt: Date | null;
  sessionId: string | null;
  tags: string[];
  entities: MemoryEntity[];
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

/** Extra context an app's write stores with each memory, encrypted like the content. */
export type MemoryAnnotations = {
  tags: string[];
  entities: MemoryEntity[];
  contentType: ContentType | null;
  domain: string | null;
};

/**
 * A memory to insert. The labels default to an owner's own entry: stated, fully trusted, average
 * importance, shared and never expiring.
 */
export type NewMemory = MemoryInput & {
  provenance?: Provenance;
  confidence?: number;
  importance?: number;
  visibility?: Visibility;
  expiresAt?: Date | null;
  sessionId?: string;
  externalId?: string;
  annotations?: MemoryAnnotations;
};

export type MemoryFilters = {
  category?: MemoryCategory;
  sensitivity?: Sensitivity;
  source?: MemorySource["type"];
  /** 1-based. */
  page?: number;
};

export type MemoryPage = { memories: MemoryDTO[]; page: number; hasNextPage: boolean };

/** How many memories the owner has, by topic, by tier and by who wrote them. */
export type MemoryCounts = {
  total: number;
  byCategory: Record<MemoryCategory, number>;
  bySensitivity: Record<Sensitivity, number>;
  bySource: Record<MemorySource["type"], number>;
};

export const MEMORY_PAGE_SIZE = 20;

// Every column a DTO needs, and nothing else (no user_id, no external_id).
const dtoColumns = {
  id: memories.id,
  contentEncrypted: memories.contentEncrypted,
  category: memories.category,
  sensitivity: memories.sensitivity,
  sourceType: memories.sourceType,
  sourceAppId: memories.sourceAppId,
  provenance: memories.provenance,
  confidence: memories.confidence,
  importance: memories.importance,
  visibility: memories.visibility,
  expiresAt: memories.expiresAt,
  sessionId: memories.sessionId,
  annotationsEncrypted: memories.annotationsEncrypted,
  occurredAt: memories.occurredAt,
  createdAt: memories.createdAt,
};

type MemoryRow = {
  [K in keyof typeof dtoColumns]: (typeof memories.$inferSelect)[K];
};

function toDTO({
  contentEncrypted,
  annotationsEncrypted,
  sourceType,
  sourceAppId,
  ...labels
}: MemoryRow): MemoryDTO {
  const annotations = annotationsEncrypted
    ? (JSON.parse(decryptField(annotationsEncrypted)) as MemoryAnnotations)
    : null;
  return {
    ...labels,
    content: decryptField(contentEncrypted),
    source: sourceType === "app" ? { type: "app", appId: sourceAppId } : { type: "user" },
    tags: annotations?.tags ?? [],
    entities: annotations?.entities ?? [],
  };
}

/**
 * Keeps the semantic index in step with an owner's change. The change itself already succeeded, so a
 * failure is only logged (by id, never content) and repaired by `bun run reindex`.
 */
async function syncIndex(memoryId: string, sync: () => Promise<void>) {
  try {
    await sync();
  } catch (error) {
    logger.warn("Couldn't sync a memory with the semantic index", {
      memoryId,
      error: errorSummary(error),
    });
  }
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

/** Counts of the owner's memories. Reads labels only: nothing is decrypted. */
export async function getMemoryCounts(): Promise<MemoryCounts> {
  const user = await requireUser();
  const rows = await db
    .select({
      category: memories.category,
      sensitivity: memories.sensitivity,
      sourceType: memories.sourceType,
      total: count(),
    })
    .from(memories)
    .where(eq(memories.userId, user.id))
    .groupBy(memories.category, memories.sensitivity, memories.sourceType);

  const counts: MemoryCounts = {
    total: 0,
    byCategory: Object.fromEntries(
      MEMORY_CATEGORIES.map(c => [c, 0])
    ) as MemoryCounts["byCategory"],
    bySensitivity: Object.fromEntries(
      SENSITIVITY_TIERS.map(t => [t, 0])
    ) as MemoryCounts["bySensitivity"],
    bySource: { user: 0, app: 0 },
  };
  for (const { category, sensitivity, sourceType, total } of rows) {
    counts.total += total;
    counts.byCategory[category] += total;
    counts.bySensitivity[sensitivity] += total;
    counts.bySource[sourceType] += total;
  }
  return counts;
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

/**
 * The owner's memories with these ids, in the order of `ids`. Ids that no longer exist (or were
 * never the owner's) are left out.
 */
export async function listMemoriesByIds(ids: string[]): Promise<MemoryDTO[]> {
  const user = await requireUser();
  return getMemoriesByIds(user.id, ids);
}

/** Stores a memory the owner wrote themselves, and indexes it. */
export async function createMemory(input: MemoryInput): Promise<MemoryDTO> {
  const user = await requireUser();
  const [memory] = await insertMemories(user.id, [input], { type: "user" });
  await syncIndex(memory!.id, () => indexMemories(user.id, [memory!]));
  return memory!;
}

/**
 * Replaces a memory's content, category, sensitivity and date, and re-indexes it. The source and the
 * app-written labels never change. Returns null if the memory doesn't exist or isn't the owner's.
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
  if (!row) return null;
  const memory = toDTO(row);
  await syncIndex(memory.id, () => indexMemories(user.id, [memory]));
  return memory;
}

/** Deletes one of the owner's memories and its vector. False if it doesn't exist or isn't theirs. */
export async function deleteMemory(id: string): Promise<boolean> {
  const user = await requireUser();
  const deleted = await db
    .delete(memories)
    .where(and(eq(memories.id, id), eq(memories.userId, user.id)))
    .returning({ id: memories.id });
  if (deleted.length === 0) return false;
  await syncIndex(id, () => removeFromIndex(user.id, [id]));
  return true;
}

// ── Low-level: NOT session-checked. Only call after authorizing the access (the gateway's
// permission checks, or a trusted script). ──

/**
 * Encrypts and stores memories for `userId` in one statement: all or none. Doesn't index them. Only
 * call after authorization: the caller must already have checked that `source` may write each one
 * for this owner.
 */
export async function insertMemories(
  userId: string,
  inputs: NewMemory[],
  // Only a deleted app leaves a memory without an app id; a new memory always names its writer.
  source: { type: "user" } | { type: "app"; appId: string }
): Promise<MemoryDTO[]> {
  if (inputs.length === 0) return [];
  const rows = await db
    .insert(memories)
    .values(
      inputs.map(({ content, annotations, ...input }) => ({
        ...input,
        userId,
        contentEncrypted: encryptField(content),
        annotationsEncrypted: annotations ? encryptField(JSON.stringify(annotations)) : null,
        sourceType: source.type,
        sourceAppId: source.type === "app" ? source.appId : null,
      }))
    )
    .returning(dtoColumns);
  return rows.map(toDTO);
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

/** Whether `appId` already wrote a memory into `userId`'s vault with this `externalId`. */
export async function hasExternalId(
  userId: string,
  appId: string,
  externalId: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: memories.id })
    .from(memories)
    .where(
      and(
        eq(memories.userId, userId),
        eq(memories.sourceAppId, appId),
        eq(memories.externalId, externalId)
      )
    )
    .limit(1);
  return row !== undefined;
}

/**
 * Deletes memories that `appId` itself wrote into `userId`'s vault, matching any of the given ids,
 * external ids or session. Other writers' memories are never touched; with no criteria, nothing is
 * deleted. Returns what was deleted. Doesn't touch the index.
 */
export async function deleteAppMemories(
  userId: string,
  appId: string,
  match: { ids?: string[]; externalIds?: string[]; sessionId?: string }
): Promise<{ id: string; category: MemoryCategory }[]> {
  const criteria = [
    match.ids?.length ? inArray(memories.id, match.ids) : undefined,
    match.externalIds?.length ? inArray(memories.externalId, match.externalIds) : undefined,
    match.sessionId ? eq(memories.sessionId, match.sessionId) : undefined,
  ].filter(criterion => criterion !== undefined);
  // Without this guard, an empty `or()` would match every memory the app wrote.
  if (criteria.length === 0) return [];

  return db
    .delete(memories)
    .where(and(eq(memories.userId, userId), eq(memories.sourceAppId, appId), or(...criteria)))
    .returning({ id: memories.id, category: memories.category });
}
