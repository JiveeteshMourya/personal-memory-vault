// Rebuilds the semantic index from Postgres: for every account, it drops the account's points
// (purging stale vectors), then decrypts, embeds and upserts each memory. Run with
// `bun run reindex` after seeding (the seed writes rows directly, without indexing), after wiping the
// Qdrant volume, or whenever the index may have drifted. Logs counts only, never content.

import { db } from "@/server/lib/db";
import { users } from "@/server/models";
import { clearIndex, indexMemories } from "@/server/repository/memory-index.repository";
import { listAllMemories } from "@/server/repository/memory.repository";

async function reindex() {
  const accounts = await db.select({ id: users.id }).from(users);
  let total = 0;
  for (const { id } of accounts) {
    await clearIndex(id);
    const owned = await listAllMemories(id);
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
