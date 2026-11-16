import "server-only";
import { QdrantClient } from "@qdrant/js-client-rest";
import { EMBEDDING_DIMENSIONS } from "@/server/lib/ai";
import { env } from "@/server/lib/env";

// The semantic index on the local Qdrant (docker-compose). Import it only from its repository
// (`src/server/repository/memory-index.repository.ts`). It holds vectors and labels, never content.

export type MemoryCollection = { client: QdrantClient; name: string };

let opening: Promise<MemoryCollection> | undefined;

async function openCollection(): Promise<MemoryCollection> {
  const client = new QdrantClient({ url: env.QDRANT_URL });
  const name = env.QDRANT_COLLECTION;
  const { exists } = await client.collectionExists(name);
  if (!exists) {
    // First use: one collection for every account, partitioned by the `userId` payload field.
    await client.createCollection(name, {
      vectors: { size: EMBEDDING_DIMENSIONS, distance: "Cosine" },
    });
    await client.createPayloadIndex(name, {
      field_name: "userId",
      field_schema: { type: "keyword", is_tenant: true },
      wait: true,
    });
  }
  return { client, name };
}

/** The memory collection, created on first use. A failed attempt is retried on the next call. */
export function memoryCollection(): Promise<MemoryCollection> {
  opening ??= openCollection().catch(error => {
    opening = undefined;
    throw error;
  });
  return opening;
}
