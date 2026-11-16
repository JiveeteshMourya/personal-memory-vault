import "server-only";
import type { AppIdentity } from "@/data/apps";
import { recordAccess } from "@/data/access-events";
import { getAccessScope } from "@/data/grants";
import { searchMemoryIds, type SearchHit } from "@/data/memory-index";
import { getMemoriesByIds, type MemoryDTO } from "@/data/memories";
import type { AccessChannel, AccessOutcome } from "@/db/schema";
import {
  embed,
  projectContext,
  rewriteQuery,
  type ConversationTurn,
  type Projection,
} from "@/lib/ai";
import { ApiError } from "@/lib/api-errors";
import type {
  ContextDepth,
  ContextFormat,
  ContextOrigin,
  ContextPerspective,
  ContextRecency,
  ContextTask,
} from "@/lib/context-options";
import { errorSummary, logger } from "@/lib/logger";
import { MEMORY_CATEGORIES, type MemoryCategory, type Sensitivity } from "@/lib/memory-taxonomy";
import { canRead, type AccessScope } from "@/lib/policy/evaluate-access";

// How connected apps read (docs/public-api.md, docs/classification-model.md). Grants decide first,
// the search covers only the allowed slice, every fetched row is checked again, and only then does
// the AI see anything: memories that already passed. Nothing here logs content.

/** A validated `POST /api/v1/context` request. Anything left out takes the documented default. */
export type ContextRequest = {
  query: string;
  purpose?: string;
  task?: ContextTask;
  conversation?: ConversationTurn[];
  knownFacts?: string[];
  keywords?: string[];
  entities?: string[];
  categories?: MemoryCategory[];
  excludeCategories?: MemoryCategory[];
  origin?: ContextOrigin;
  timeRange?: { from?: Date; to?: Date };
  recency?: ContextRecency;
  depth?: ContextDepth;
  minConfidence?: number;
  maxChars?: number;
  format?: ContextFormat;
  perspective?: ContextPerspective;
  language?: string;
  timezone?: string;
  includeSources?: boolean;
  sessionId?: string;
};

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

export type ContextResult = {
  response: ContextResponse;
  /** The memories the context was built from, best first. For the owner's eyes only (Playground). */
  disclosed: MemoryDTO[];
};

/** The app a request is made as: an API caller from `requireApp`, or the owner's pick in the Playground. */
export type ContextIdentity = Pick<AppIdentity, "userId" | "appId" | "appName">;

const DEPTH: Record<ContextDepth, number> = { quick: 8, standard: 20, deep: 40 };

// How much a memory's freshness adds to its rank, halving every `halfLifeDays`.
const RECENCY: Record<ContextRecency, { weight: number; halfLifeDays: number }> = {
  recent: { weight: 0.25, halfLifeDays: 7 },
  balanced: { weight: 0.1, halfLifeDays: 30 },
  all_time: { weight: 0, halfLifeDays: 30 },
};

/** Hits less similar than this (cosine, text-embedding-3-small) are unrelated to the query. */
const MIN_SIMILARITY = 0.2;

const DAY_MS = 86_400_000;

const processingFailed = () =>
  new ApiError(502, "processing_failed", "Context processing failed. Try again.");

const hasSources = ({ sources }: AccessScope) => sources.ownEntries || sources.appIds.length > 0;

/** The read scope's sources, narrowed to the request's `origin`. Never adds one. */
function sourcesFor(scope: AccessScope, origin: ContextOrigin, appId: string) {
  const { ownEntries, appIds } = scope.sources;
  if (origin === "other_apps") return { ownEntries, appIds: appIds.filter(id => id !== appId) };
  if (origin === "this_app")
    return { ownEntries: false, appIds: appIds.filter(id => id === appId) };
  return scope.sources;
}

function searchText(query: string, request: ContextRequest) {
  return [query, request.keywords?.join(", "), request.entities?.join(", ")]
    .filter(Boolean)
    .join("\n");
}

/** Similarity first, nudged by freshness, importance and confidence. */
function rankOf(memory: MemoryDTO, similarity: number, recency: ContextRecency, now: Date) {
  const { weight, halfLifeDays } = RECENCY[recency];
  const ageDays = Math.max(0, now.getTime() - memory.occurredAt.getTime()) / DAY_MS;
  return (
    similarity +
    weight * 0.5 ** (ageDays / halfLifeDays) +
    0.03 * (memory.importance - 3) +
    0.1 * (memory.confidence - 1)
  );
}

/** Where the last of `text`'s segments that ends within `limit` characters ends (0 if none). */
function lastEndWithin(text: string, limit: number, segmenter: Intl.Segmenter) {
  let end = 0;
  for (const { index, segment } of segmenter.segment(text)) {
    const segmentEnd = index + segment.trimEnd().length;
    if (segmentEnd > limit) break;
    end = segmentEnd;
  }
  return end;
}

/**
 * Cuts `text` to at most `maxChars` characters: after the last whole sentence (or bullet line) that
 * fits, or, if even the first is too long, after a whole word plus "…". It measures UTF-16 code
 * units (JavaScript's `length`), never fewer than code points or graphemes, so the cap holds however
 * an app counts. Sentence and word boundaries never split a character.
 */
function capChars(text: string, maxChars: number, language: string) {
  if (text.length <= maxChars) return text;
  const sentences = new Intl.Segmenter(language, { granularity: "sentence" });
  const sentenceEnd = lastEndWithin(text, maxChars, sentences);
  if (sentenceEnd > 0) return text.slice(0, sentenceEnd);
  const words = new Intl.Segmenter(language, { granularity: "word" });
  // One character is kept for the ellipsis.
  const wordEnd = lastEndWithin(text, maxChars - 1, words);
  return `${text.slice(0, wordEnd).replace(/[\s,;:–—-]+$/u, "")}…`;
}

/**
 * Answers an app's natural-language request with a short projection of the memories it may read.
 * Throws 403 `read_denied` before any AI call when the app holds no read grant or no allowed
 * source, and 502 `processing_failed` when the AI or the index fails. Every answered request lands
 * in the owner's access log with exactly the memories disclosed; its id is the `requestId`.
 */
export async function requestContext(
  identity: ContextIdentity,
  request: ContextRequest,
  channel: AccessChannel
): Promise<ContextResult> {
  const { userId, appId } = identity;
  const audit = {
    app: identity,
    action: "context",
    channel,
    purpose: request.purpose,
    query: request.query,
    sessionId: request.sessionId,
  } as const;

  const scope = await getAccessScope(userId, appId, "read");
  if (scope.categories.length === 0 || !hasSources(scope)) {
    await recordAccess({ ...audit, outcome: "denied" });
    throw new ApiError(403, "read_denied", "This app holds no read grant or no allowed source");
  }

  // Only categories the app named itself are reported as withheld, so nothing else leaks.
  const granted = new Set(scope.categories.map(cap => cap.category));
  const requested = request.categories && new Set(request.categories);
  const excluded = new Set(request.excludeCategories);
  const withheldCategories = MEMORY_CATEGORIES.filter(c => requested?.has(c) && !granted.has(c));
  const narrowed: AccessScope = {
    operation: "read",
    categories: scope.categories.filter(
      ({ category }) => (!requested || requested.has(category)) && !excluded.has(category)
    ),
    sources: sourcesFor(scope, request.origin ?? "any", appId),
  };

  const now = new Date();
  const depth = DEPTH[request.depth ?? "standard"];
  const maxChars = request.maxChars ?? 100;
  const language = request.language ?? "en";
  let query = request.query;
  let hits: SearchHit[] = [];

  // A request narrowed to nothing never reaches the AI or the index.
  if (narrowed.categories.length > 0 && hasSources(narrowed)) {
    try {
      if (request.conversation?.length) query = await rewriteQuery(query, request.conversation);
      const [vector] = await embed([searchText(query, request)]);
      hits = await searchMemoryIds(userId, {
        vector: vector!,
        scope: narrowed,
        readerAppId: appId,
        timeRange: request.timeRange,
        // Over-fetched, so reranking has room to choose.
        topK: depth * 2,
      });
    } catch (error) {
      logger.error("Context search failed", { appId, error: errorSummary(error) });
      throw processingFailed();
    }
  }

  const similarity = new Map(
    hits.filter(hit => hit.score >= MIN_SIMILARITY).map(hit => [hit.id, hit.score])
  );
  const minConfidence = request.minConfidence ?? 0;
  const recency = request.recency ?? "balanced";
  // The index only searched the narrowed scope; every row is still checked again before use.
  const candidates = (await getMemoriesByIds(userId, [...similarity.keys()]))
    .filter(memory => canRead(narrowed, memory, appId, now) && memory.confidence >= minConfidence)
    .map(memory => ({ memory, rank: rankOf(memory, similarity.get(memory.id)!, recency, now) }))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, depth)
    .map(({ memory }) => memory);

  let context = "";
  let disclosed: MemoryDTO[] = [];
  if (candidates.length > 0) {
    let projection: Projection;
    try {
      projection = await projectContext({
        query,
        purpose: request.purpose,
        task: request.task,
        knownFacts: request.knownFacts,
        memories: candidates.map(({ content, category, occurredAt, confidence, provenance }) => ({
          content,
          category,
          occurredAt,
          confidence,
          provenance,
        })),
        format: request.format ?? "paragraph",
        perspective: request.perspective ?? "third_person",
        language,
        timezone: request.timezone ?? "UTC",
        maxChars,
        now,
      });
    } catch (error) {
      logger.error("Context projection failed", { appId, error: errorSummary(error) });
      throw processingFailed();
    }
    // An empty projection shares nothing. Otherwise the disclosed memories are the ones the model
    // says the text draws on; if it names none, every memory it saw counts, so the log can
    // over-report but never come up empty.
    if (projection.context) {
      context = capChars(projection.context, maxChars, language);
      const used = new Set(projection.used);
      disclosed = used.size > 0 ? candidates.filter((_, i) => used.has(i)) : candidates;
    }
  }

  const times = disclosed.map(memory => memory.occurredAt.getTime());
  const coverage: ContextCoverage = {
    memoriesUsed: disclosed.length,
    categories: MEMORY_CATEGORIES.filter(c => disclosed.some(memory => memory.category === c)),
    timeSpan: times.length
      ? { from: new Date(Math.min(...times)), to: new Date(Math.max(...times)) }
      : null,
  };
  const outcome: AccessOutcome =
    withheldCategories.length === 0
      ? "allowed"
      : narrowed.categories.length > 0
        ? "partial"
        : "denied";

  const requestId = await recordAccess({
    ...audit,
    outcome,
    categories: coverage.categories,
    memoryIds: disclosed.map(memory => memory.id),
    withheldCount: withheldCategories.length,
  });
  logger.info("Context request", {
    requestId,
    appId,
    channel,
    hits: hits.length,
    used: disclosed.length,
    topScore: hits[0] && Math.round(hits[0].score * 1000) / 1000,
  });

  return {
    response: {
      requestId,
      context,
      charCount: context.length,
      coverage,
      withheldCategories,
      ...(request.includeSources && {
        sources: disclosed.map(({ category, sensitivity, occurredAt }) => ({
          category,
          sensitivity,
          occurredAt,
        })),
      }),
      generatedAt: now,
    },
    disclosed,
  };
}
