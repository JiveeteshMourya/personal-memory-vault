// Rebuilds the semantic index from Postgres: for every account, it drops the account's Pinecone
// namespace (purging stale vectors), then decrypts, embeds and upserts each memory. Run with
// `bun run reindex` after seeding (the seed writes rows directly, without indexing) or whenever the
// index may have drifted. Logs counts only, never content.

import { asc, eq } from "drizzle-orm";
import { Errors } from "@pinecone-database/pinecone";
import type { MemoryAnnotations, MemoryDTO } from "@/data/memories";
import { indexMemories, type IndexableMemory } from "@/data/memory-index";
import { memories, users } from "@/db/schema";
import { decryptField } from "@/lib/crypto";
import { db } from "@/lib/db";
import { memoryIndex } from "@/lib/pinecone";

async function memoriesOf(userId: string): Promise<IndexableMemory[]> {
  // Reads the rows itself: the memories DAL imports the session helpers, which need Next.js.
  const rows = await db
    .select({
      id: memories.id,
      contentEncrypted: memories.contentEncrypted,
      annotationsEncrypted: memories.annotationsEncrypted,
      category: memories.category,
      sensitivity: memories.sensitivity,
      sourceType: memories.sourceType,
      sourceAppId: memories.sourceAppId,
      visibility: memories.visibility,
      occurredAt: memories.occurredAt,
      importance: memories.importance,
      confidence: memories.confidence,
      expiresAt: memories.expiresAt,
    })
    .from(memories)
    .where(eq(memories.userId, userId))
    .orderBy(asc(memories.createdAt));

  return rows.map(({ contentEncrypted, annotationsEncrypted, sourceType, sourceAppId, ...row }) => {
    const annotations = annotationsEncrypted
      ? (JSON.parse(decryptField(annotationsEncrypted)) as MemoryAnnotations)
      : null;
    const source: MemoryDTO["source"] =
      sourceType === "app" ? { type: "app", appId: sourceAppId } : { type: "user" };
    return {
      ...row,
      content: decryptField(contentEncrypted),
      source,
      tags: annotations?.tags ?? [],
    };
  });
}

async function reindex() {
  const index = await memoryIndex();
  const accounts = await db.select({ id: users.id }).from(users);
  let total = 0;
  for (const { id } of accounts) {
    try {
      await index.deleteNamespace(id);
    } catch (error) {
      // Nothing indexed for this account yet.
      if (!(error instanceof Errors.PineconeNotFoundError)) throw error;
    }
    const owned = await memoriesOf(id);
    await indexMemories(id, owned);
    total += owned.length;
    console.log(`Indexed ${owned.length} memories for account ${id}.`);
  }
  console.log(`Reindexed ${total} memories across ${accounts.length} accounts.`);
  return 0;
}

try {
  process.exitCode = await reindex();
} finally {
  await db.$client.end();
}
