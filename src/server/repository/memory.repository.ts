import "server-only";
import { and, asc, count, desc, eq, inArray, or } from "drizzle-orm";
import { decryptField, encryptField } from "@/server/lib/crypto";
import { db } from "@/server/lib/db";
import { memories } from "@/server/models";
import {
  MEMORY_CATEGORIES,
  SENSITIVITY_TIERS,
  type ContentType,
  type MemoryCategory,
  type MemoryEntity,
  type Provenance,
  type Visibility,
} from "@/shared/constants/memory-taxonomy";
import type {
  MemoryCounts,
  MemoryDTO,
  MemoryFilters,
  MemoryInput,
  MemoryPage,
} from "@/shared/types/memory.types";

// The owner's memories in Postgres. Content and annotations are encrypted here on the way in and
// decrypted on the way out. Not session-checked: every function takes the owner's id and only
// touches that owner's rows. Call it from services, after authorization.

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

/** The owner's memories, newest first, filtered and paginated. */
export async function listMemories(userId: string, filters: MemoryFilters): Promise<MemoryPage> {
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const rows = await db
    .select(dtoColumns)
    .from(memories)
    .where(
      and(
        eq(memories.userId, userId),
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

/** Every one of the owner's memories, oldest first, e.g. to rebuild the semantic index. */
export async function listAllMemories(userId: string): Promise<MemoryDTO[]> {
  const rows = await db
    .select(dtoColumns)
    .from(memories)
    .where(eq(memories.userId, userId))
    .orderBy(asc(memories.createdAt));
  return rows.map(toDTO);
}

/** Counts of the owner's memories. Reads labels only: nothing is decrypted. */
export async function getMemoryCounts(userId: string): Promise<MemoryCounts> {
  const rows = await db
    .select({
      category: memories.category,
      sensitivity: memories.sensitivity,
      sourceType: memories.sourceType,
      total: count(),
    })
    .from(memories)
    .where(eq(memories.userId, userId))
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

/**
 * Loads and decrypts the owner's memories with these ids, in the order of `ids` (so a relevance
 * ranking survives). Ids that don't exist or belong to someone else are left out. When an app is
 * served, the caller must already have restricted `ids` to what it may disclose.
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

/**
 * Encrypts and stores memories for the owner in one statement: all or none. Doesn't index them.
 * The caller must already have checked that `source` may write each one for this owner.
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
 * Replaces a memory's content, category, sensitivity and date. The source and the app-written labels
 * never change. Returns null if the memory doesn't exist or isn't the owner's.
 */
export async function updateMemory(
  userId: string,
  id: string,
  input: MemoryInput
): Promise<MemoryDTO | null> {
  const [row] = await db
    .update(memories)
    .set({
      contentEncrypted: encryptField(input.content),
      category: input.category,
      sensitivity: input.sensitivity,
      occurredAt: input.occurredAt,
    })
    .where(and(eq(memories.id, id), eq(memories.userId, userId)))
    .returning(dtoColumns);
  return row ? toDTO(row) : null;
}

/** Deletes one of the owner's memories. False if it doesn't exist or isn't theirs. */
export async function deleteMemory(userId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(memories)
    .where(and(eq(memories.id, id), eq(memories.userId, userId)))
    .returning({ id: memories.id });
  return deleted.length > 0;
}

/** Whether `appId` already wrote a memory into the owner's vault with this `externalId`. */
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
 * Deletes memories that `appId` itself wrote into the owner's vault, matching any of the given ids,
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
