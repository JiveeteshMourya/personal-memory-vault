import type {
  MemoryCategory,
  MemoryEntity,
  Provenance,
  Sensitivity,
  Visibility,
} from "@/shared/constants/memory-taxonomy";

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
