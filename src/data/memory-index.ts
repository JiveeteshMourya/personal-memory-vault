import "server-only";
import type { MemoryDTO } from "@/data/memories";
import { embed } from "@/lib/ai";
import { sensitivityRank, type MemoryCategory, type Visibility } from "@/lib/memory-taxonomy";
import { memoryIndex } from "@/lib/pinecone";
import type { AccessScope } from "@/lib/policy/evaluate-access";

// The semantic index: one Pinecone namespace per owner, one vector per memory. A vector's metadata
// holds only the labels search filters on, NEVER content: content lives encrypted in Postgres,
// fetched by id only after authorization (`getMemoriesByIds`, then `canRead` on every row).
// Imports only types from `@/data/memories`, so scripts can use it.

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

type MemoryVectorMetadata = {
  category: MemoryCategory;
  sensitivityRank: number;
  /** "user" for the owner's own entries, else the writing app's id. */
  source: string;
  visibility: Visibility;
  /** Epoch milliseconds, so ranges can be filtered. */
  occurredAt: number;
  importance: number;
  confidence: number;
  /** Epoch milliseconds. Left out when the memory never expires: Pinecone has no nulls. */
  expiresAt?: number;
};

export type SearchHit = { id: string; score: number };

const OWNER_SOURCE = "user";
// Keeps each upsert well under Pinecone's 2 MB request limit.
const BATCH_SIZE = 50;

function embeddingText(memory: IndexableMemory) {
  return memory.tags.length ? `${memory.content}\nTags: ${memory.tags.join(", ")}` : memory.content;
}

function metadataOf(memory: IndexableMemory, source: string): MemoryVectorMetadata {
  return {
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
 * Embeds memories (content plus tags) and upserts them into the owner's namespace, replacing any
 * earlier vector for the same id. A memory whose app was deleted is never shareable, so it's skipped.
 */
export async function indexMemories(userId: string, memories: IndexableMemory[]): Promise<void> {
  const sourced = memories.flatMap(memory => {
    const { source } = memory;
    if (source.type === "user") return [{ memory, source: OWNER_SOURCE }];
    return source.appId ? [{ memory, source: source.appId }] : [];
  });
  if (sourced.length === 0) return;

  const index = await memoryIndex<MemoryVectorMetadata>();
  for (let start = 0; start < sourced.length; start += BATCH_SIZE) {
    const batch = sourced.slice(start, start + BATCH_SIZE);
    const vectors = await embed(batch.map(({ memory }) => embeddingText(memory)));
    await index.upsert({
      namespace: userId,
      records: batch.map(({ memory, source }, i) => ({
        id: memory.id,
        values: vectors[i]!,
        metadata: metadataOf(memory, source),
      })),
    });
  }
}

/** Removes memories' vectors from the owner's namespace. Unknown ids are ignored. */
export async function removeFromIndex(userId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const index = await memoryIndex<MemoryVectorMetadata>();
  for (let start = 0; start < ids.length; start += 1000) {
    await index.deleteMany({ namespace: userId, ids: ids.slice(start, start + 1000) });
  }
}

/**
 * The ids of the owner's memories nearest to `vector`, best first, with their similarity. Searches
 * only what `scope` allows: its categories up to each tier cap and its sources, plus the
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
  // Default deny: an empty `$or` or `$in` must never reach the index.
  if (scope.operation !== "read" || scope.categories.length === 0 || sources.length === 0) {
    return [];
  }

  const filter = {
    $and: [
      {
        $or: scope.categories.map(({ category, maxSensitivity }) => ({
          category: { $eq: category },
          sensitivityRank: { $lte: sensitivityRank(maxSensitivity) },
        })),
      },
      { source: { $in: sources } },
      { $or: [{ visibility: { $eq: "shared" } }, { source: { $eq: readerAppId } }] },
      { $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: Date.now() } }] },
      ...(timeRange?.from ? [{ occurredAt: { $gte: timeRange.from.getTime() } }] : []),
      ...(timeRange?.to ? [{ occurredAt: { $lte: timeRange.to.getTime() } }] : []),
    ],
  };

  const index = await memoryIndex<MemoryVectorMetadata>();
  const { matches } = await index.query({ namespace: userId, vector, topK, filter });
  return matches.map(match => ({ id: match.id, score: match.score ?? 0 }));
}
