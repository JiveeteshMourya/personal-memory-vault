import type { MemoryCategory, Sensitivity } from "@/shared/constants/memory-taxonomy";

export type ContextCoverage = {
  memoriesUsed: number;
  /** The categories of the memories used, in taxonomy order. */
  categories: MemoryCategory[];
  /** When the memories used occurred; null when none were used. */
  timeSpan: { from: Date; to: Date } | null;
};

/** What an app may learn about a memory behind its context: never content, never the source. */
export type ContextSource = {
  category: MemoryCategory;
  sensitivity: Sensitivity;
  occurredAt: Date;
};

/** The `POST /api/v1/context` response body. */
export type ContextResponse = {
  requestId: string;
  context: string;
  /** The length of `context`, at most the request's `maxChars`. */
  charCount: number;
  coverage: ContextCoverage;
  withheldCategories: MemoryCategory[];
  sources?: ContextSource[];
  generatedAt: Date;
};
