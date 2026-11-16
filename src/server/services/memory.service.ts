import "server-only";
import { errorSummary, logger } from "@/server/lib/logger";
import * as memoryIndexRepository from "@/server/repository/memory-index.repository";
import * as memoryRepository from "@/server/repository/memory.repository";
import type {
  MemoryCounts,
  MemoryDTO,
  MemoryFilters,
  MemoryInput,
  MemoryPage,
} from "@/shared/types/memory.types";

// The owner's own view of their memories. Pass the id of the owner from `requireUser`: only that
// owner's memories are read or changed. Apps write and read through the ingest and context services.

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

/** The owner's memories, newest first, filtered and paginated. */
export function listMemories(userId: string, filters: MemoryFilters = {}): Promise<MemoryPage> {
  return memoryRepository.listMemories(userId, filters);
}

/** Counts of the owner's memories. Reads labels only: nothing is decrypted. */
export function getMemoryCounts(userId: string): Promise<MemoryCounts> {
  return memoryRepository.getMemoryCounts(userId);
}

/**
 * The owner's memories with these ids, in the order of `ids`. Ids that no longer exist (or were
 * never the owner's) are left out.
 */
export function listMemoriesByIds(userId: string, ids: string[]): Promise<MemoryDTO[]> {
  return memoryRepository.getMemoriesByIds(userId, ids);
}

/** Stores a memory the owner wrote themselves, and indexes it. */
export async function createMemory(userId: string, input: MemoryInput): Promise<MemoryDTO> {
  const [memory] = await memoryRepository.insertMemories(userId, [input], { type: "user" });
  await syncIndex(memory!.id, () => memoryIndexRepository.indexMemories(userId, [memory!]));
  return memory!;
}

/**
 * Replaces a memory's content, category, sensitivity and date, and re-indexes it. Returns null if the
 * memory doesn't exist or isn't the owner's.
 */
export async function updateMemory(
  userId: string,
  id: string,
  input: MemoryInput
): Promise<MemoryDTO | null> {
  const memory = await memoryRepository.updateMemory(userId, id, input);
  if (!memory) return null;
  await syncIndex(memory.id, () => memoryIndexRepository.indexMemories(userId, [memory]));
  return memory;
}

/** Deletes one of the owner's memories and its vector. False if it doesn't exist or isn't theirs. */
export async function deleteMemory(userId: string, id: string): Promise<boolean> {
  const deleted = await memoryRepository.deleteMemory(userId, id);
  if (!deleted) return false;
  await syncIndex(id, () => memoryIndexRepository.removeFromIndex(userId, [id]));
  return true;
}
