import "server-only";
import type { Schemas } from "@qdrant/js-client-rest";
import { embed } from "@/server/lib/ai";
import { memoryCollection } from "@/server/lib/qdrant";
import {
  sensitivityRank,
  type MemoryCategory,
  type Visibility,
} from "@/shared/constants/memory-taxonomy";
import type { AccessScope } from "@/shared/types/grant.types";
import type { MemoryDTO } from "@/shared/types/memory.types";

// The semantic index: one Qdrant point per memory, keyed by the memory's id, in a collection shared
// by every account. Each point's `userId` payload is its owner, and EVERY search and delete filters
// on it: that filter is what keeps one account's vectors out of another's results. The payload holds
// only the labels search filters on, NEVER content: content lives encrypted in Postgres, fetched by
// id only after authorization (`getMemoriesByIds`, then `canRead` on every row).
// Writes wait until they're applied, so a memory is searchable as soon as a call returns.
// Nothing here reads the session, so scripts (`bun run reindex`) can use it too.

/** What indexing needs from a memory. */
export type IndexableMemory = Pick<
  MemoryDTO,
  | "id"
  | "content"
  | "tags"
  | "category"
  | "sensitivity"
  | "source"
  | "visibility"
  | "occurredAt"
  | "importance"
  | "confidence"
  | "expiresAt"
>;

type MemoryVectorPayload = {
  userId: string;
  category: MemoryCategory;
  sensitivityRank: number;
  /** "user" for the owner's own entries, else the writing app's id. */
  source: string;
  visibility: Visibility;
  /** Epoch milliseconds, so ranges can be filtered. */
  occurredAt: number;
  importance: number;
  confidence: number;
  /** Epoch milliseconds. Left out when the memory never expires (matched by `is_empty`). */
  expiresAt?: number;
};

export type SearchHit = { id: string; score: number };

const OWNER_SOURCE = "user";
// One embeddings call and one upsert per batch, keeping both requests small.
const BATCH_SIZE = 50;

function ownedBy(userId: string): Schemas["Condition"] {
  return { key: "userId", match: { value: userId } };
}

function embeddingText(memory: IndexableMemory) {
  return memory.tags.length ? `${memory.content}\nTags: ${memory.tags.join(", ")}` : memory.content;
}

function payloadOf(userId: string, memory: IndexableMemory, source: string): MemoryVectorPayload {
  return {
    userId,
    category: memory.category,
    sensitivityRank: sensitivityRank(memory.sensitivity),
    source,
    visibility: memory.visibility,
    occurredAt: memory.occurredAt.getTime(),
    importance: memory.importance,
    confidence: memory.confidence,
    ...(memory.expiresAt && { expiresAt: memory.expiresAt.getTime() }),
  };
}

/**
 * Embeds memories (content plus tags) and upserts them as the owner's points, replacing any earlier
 * point for the same id. A memory whose app was deleted is never shareable, so it's skipped.
 */
export async function indexMemories(userId: string, memories: IndexableMemory[]): Promise<void> {
  const sourced = memories.flatMap(memory => {
    const { source } = memory;
    if (source.type === "user") return [{ memory, source: OWNER_SOURCE }];
    return source.appId ? [{ memory, source: source.appId }] : [];
  });
  if (sourced.length === 0) return;

  const { client, name } = await memoryCollection();
  for (let start = 0; start < sourced.length; start += BATCH_SIZE) {
    const batch = sourced.slice(start, start + BATCH_SIZE);
    const vectors = await embed(batch.map(({ memory }) => embeddingText(memory)));
    await client.upsert(name, {
      wait: true,
      points: batch.map(({ memory, source }, i) => ({
        id: memory.id,
        vector: vectors[i]!,
        payload: payloadOf(userId, memory, source),
      })),
    });
  }
}

/** Removes the owner's points for these memories. Unknown ids, and other owners' points, are left. */
export async function removeFromIndex(userId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { client, name } = await memoryCollection();
  await client.delete(name, { wait: true, filter: { must: [ownedBy(userId), { has_id: ids }] } });
}

/** Removes every point the owner has, e.g. before rebuilding them. */
export async function clearIndex(userId: string): Promise<void> {
  const { client, name } = await memoryCollection();
  await client.delete(name, { wait: true, filter: { must: [ownedBy(userId)] } });
}

/**
 * The ids of the owner's memories nearest to `vector`, best first, with their cosine similarity.
 * Searches only what `scope` allows: its categories up to each tier cap and its sources, plus the
 * `readerAppId`'s own `app_private` memories, and nothing expired. Pass the reader's read scope,
 * narrowed to the request (fewer categories or sources), never widened. An empty scope returns
 * nothing without searching. Callers must still check `canRead` on every fetched row.
 */
export async function searchMemoryIds(
  userId: string,
  {
    vector,
    scope,
    readerAppId,
    timeRange,
    topK,
  }: {
    vector: number[];
    scope: AccessScope;
    readerAppId: string;
    timeRange?: { from?: Date; to?: Date };
    topK: number;
  }
): Promise<SearchHit[]> {
  const sources = [...(scope.sources.ownEntries ? [OWNER_SOURCE] : []), ...scope.sources.appIds];
  // Default deny: an empty `should` or `any` must never reach the index.
  if (scope.operation !== "read" || scope.categories.length === 0 || sources.length === 0) {
    return [];
  }

  const filter: Schemas["Filter"] = {
    must: [
      ownedBy(userId),
      {
        should: scope.categories.map(({ category, maxSensitivity }) => ({
          must: [
            { key: "category", match: { value: category } },
            { key: "sensitivityRank", range: { lte: sensitivityRank(maxSensitivity) } },
          ],
        })),
      },
      { key: "source", match: { any: sources } },
      {
        should: [
          { key: "visibility", match: { value: "shared" } },
          { key: "source", match: { value: readerAppId } },
        ],
      },
      {
        should: [
          { is_empty: { key: "expiresAt" } },
          { key: "expiresAt", range: { gt: Date.now() } },
        ],
      },
      ...(timeRange?.from ? [{ key: "occurredAt", range: { gte: timeRange.from.getTime() } }] : []),
      ...(timeRange?.to ? [{ key: "occurredAt", range: { lte: timeRange.to.getTime() } }] : []),
    ],
  };

  const { client, name } = await memoryCollection();
  const { points } = await client.query(name, { query: vector, filter, limit: topK });
  return points.map(point => ({ id: String(point.id), score: point.score }));
}
