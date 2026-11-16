import "server-only";
import { Errors, Pinecone, type Index, type RecordMetadata } from "@pinecone-database/pinecone";
import { EMBEDDING_DIMENSIONS } from "@/lib/ai";
import { env } from "@/lib/env";

// The semantic index on Pinecone serverless. Import it only from the Data Access Layer
// (`src/data/memory-index.ts`) and scripts. It holds vectors and labels, never memory content.

let opening: Promise<Index> | undefined;

async function openIndex(): Promise<Index> {
  const pc = new Pinecone({ apiKey: env.PINECONE_API_KEY });
  let host: string;
  try {
    ({ host } = await pc.indexes.describe(env.PINECONE_INDEX));
  } catch (error) {
    if (!(error instanceof Errors.PineconeNotFoundError)) throw error;
    // First use: create it. The free Starter plan only offers AWS us-east-1.
    const created = await pc.indexes.create({
      name: env.PINECONE_INDEX,
      schema: {
        fields: {
          _values: { type: "dense_vector", dimension: EMBEDDING_DIMENSIONS, metric: "cosine" },
        },
      },
      deployment: { deploymentType: "managed", cloud: "aws", region: "us-east-1" },
      waitUntilReady: true,
    });
    host = created.host;
  }
  return pc.index({ host });
}

/** The memory index, created on first use. A failed attempt is retried on the next call. */
export function memoryIndex<T extends RecordMetadata>(): Promise<Index<T>> {
  opening ??= openIndex().catch(error => {
    opening = undefined;
    throw error;
  });
  return opening as Promise<Index<T>>;
}
