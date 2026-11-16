import "server-only";
import {
  extractMemories,
  PROVENANCE_CONFIDENCE_CAPS,
  type ExtractedMemory,
  type TranscriptMessage,
} from "@/server/lib/ai";
import { ApiError } from "@/server/lib/api-error";
import { errorSummary, logger } from "@/server/lib/logger";
import { indexMemories, removeFromIndex } from "@/server/repository/memory-index.repository";
import {
  deleteAppMemories,
  hasExternalId,
  insertMemories,
  type NewMemory,
} from "@/server/repository/memory.repository";
import { recordAccess } from "@/server/services/access-event.service";
import { canWrite } from "@/server/services/access-policy.service";
import type { AppIdentity } from "@/server/services/app.service";
import { getAccessScope } from "@/server/services/grant.service";
import {
  sensitivityRank,
  type ContentType,
  type MemoryCategory,
  type MemoryEntity,
  type Provenance,
  type Sensitivity,
  type Visibility,
} from "@/shared/constants/memory-taxonomy";
import type { AccessScope } from "@/shared/types/grant.types";

// How connected apps write and retract memories (docs/public-api.md, docs/classification-model.md).
// Grants are checked before any text reaches the AI, and again on every extracted memory before it's
// stored. Nothing here logs content.

/** A validated `POST /api/v1/memories` body. Exactly one of `content` and `messages` is set. */
export type WriteRequest = {
  content?: string;
  messages?: TranscriptMessage[];
  contentType?: ContentType;
  mode: "extract" | "verbatim";
  provenance?: Provenance;
  confidence?: number;
  importance?: number;
  occurredAt?: Date;
  timezone?: string;
  expiresAt?: Date;
  language?: string;
  domain?: string;
  categoryHints?: MemoryCategory[];
  sensitivityFloor?: Sensitivity;
  tags?: string[];
  entities?: MemoryEntity[];
  sessionId?: string;
  externalId?: string;
  visibility: Visibility;
  dryRun: boolean;
};

/** A memory echoed back to the app that wrote it. `id` is null in a dry run. */
export type StoredMemory = {
  id: string | null;
  content: string;
  category: MemoryCategory;
  sensitivity: Sensitivity;
  occurredAt: Date;
  expiresAt: Date | null;
  importance: number;
};

/** A memory the app may not write: a category and a reason, never content. */
export type WithheldMemory = {
  category: MemoryCategory;
  reason: "no_write_grant" | "sensitivity_above_cap";
};

export type WriteResult = {
  requestId: string;
  stored: StoredMemory[];
  withheld: WithheldMemory[];
  duplicates: number;
  dryRun: boolean;
};

/** A validated `DELETE /api/v1/memories` body: at least one criterion. */
export type RetractRequest = { ids?: string[]; externalIds?: string[]; sessionId?: string };

const MAX_TAGS = 20;
const MAX_ENTITIES = 20;
const MAX_CONTENT_LENGTH = 2000;

const processingFailed = () =>
  new ApiError(502, "processing_failed", "Memory processing failed. Try again.");

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function mergeTags(...lists: string[][]) {
  const tags = lists.flat().map(tag => tag.trim().toLowerCase().slice(0, 40));
  return [...new Set(tags.filter(Boolean))].slice(0, MAX_TAGS);
}

function mergeEntities(...lists: MemoryEntity[][]) {
  const byKey = new Map<string, MemoryEntity>();
  for (const { name, type } of lists.flat()) {
    const trimmed = name.trim().slice(0, 100);
    const key = `${type}:${trimmed.toLowerCase()}`;
    if (trimmed && !byKey.has(key)) byKey.set(key, { name: trimmed, type });
  }
  return [...byKey.values()].slice(0, MAX_ENTITIES);
}

/** A memory ready to store, with every label the response echoes decided. */
type FinalMemory = NewMemory & Required<Pick<NewMemory, "occurredAt" | "importance" | "expiresAt">>;

/** Applies the request's floor, caps and overrides to what the model proposed. */
function finalize(
  memory: ExtractedMemory,
  request: WriteRequest,
  provenance: Provenance,
  receivedAt: Date
): FinalMemory {
  const floor = request.sensitivityFloor;
  return {
    content: memory.content.slice(0, MAX_CONTENT_LENGTH),
    category: memory.category,
    // The floor can only raise a tier, never lower it.
    sensitivity:
      floor && sensitivityRank(floor) > sensitivityRank(memory.sensitivity)
        ? floor
        : memory.sensitivity,
    occurredAt: memory.occurredAt ?? request.occurredAt ?? receivedAt,
    provenance,
    confidence: Math.min(
      clamp(memory.confidence, 0, 1),
      PROVENANCE_CONFIDENCE_CAPS[provenance],
      request.confidence ?? 1
    ),
    importance: request.importance ?? clamp(Math.round(memory.importance), 1, 5),
    visibility: request.visibility,
    expiresAt: request.expiresAt ?? memory.expiresAt,
    sessionId: request.sessionId,
    externalId: request.externalId,
    annotations: {
      tags: mergeTags(request.tags ?? [], memory.tags),
      entities: mergeEntities(request.entities ?? [], memory.entities),
      contentType: request.contentType ?? null,
      domain: request.domain ?? null,
    },
  };
}

function withheldReason(scope: AccessScope, category: MemoryCategory): WithheldMemory["reason"] {
  return scope.categories.some(cap => cap.category === category)
    ? "sensitivity_above_cap"
    : "no_write_grant";
}

const unique = <T>(values: T[]) => [...new Set(values)];

/**
 * Extracts, classifies and stores what an app sent, keeping only what its write grants allow.
 * Throws 403 `write_denied` before any AI call when the app may write nothing, and 502
 * `processing_failed` when the AI or the index fails (nothing is left stored then).
 */
export async function ingestMemories(
  app: AppIdentity,
  request: WriteRequest
): Promise<WriteResult> {
  const scope = await getAccessScope(app.userId, app.appId, "write");
  if (scope.categories.length === 0) {
    await recordAccess({
      app,
      action: "write",
      channel: "api",
      outcome: "denied",
      sessionId: request.sessionId,
    });
    throw new ApiError(403, "write_denied", "This app holds no write grant");
  }

  if (request.externalId && (await hasExternalId(app.userId, app.appId, request.externalId))) {
    const requestId = await recordAccess({
      app,
      action: "write",
      channel: "api",
      outcome: "allowed",
      sessionId: request.sessionId,
    });
    return { requestId, stored: [], withheld: [], duplicates: 1, dryRun: request.dryRun };
  }

  const receivedAt = new Date();
  const provenance = request.provenance ?? "app_observed";
  let extracted: ExtractedMemory[];
  try {
    extracted = await extractMemories({
      content: request.content,
      messages: request.messages,
      mode: request.mode,
      contentType: request.contentType,
      provenance,
      occurredAt: request.occurredAt ?? receivedAt,
      timezone: request.timezone,
      language: request.language,
      domain: request.domain,
      categoryHints: request.categoryHints,
    });
  } catch (error) {
    logger.error("Memory extraction failed", { appId: app.appId, error: errorSummary(error) });
    throw processingFailed();
  }

  const allowed: FinalMemory[] = [];
  const withheld: WithheldMemory[] = [];
  for (const memory of extracted.map(m => finalize(m, request, provenance, receivedAt))) {
    if (canWrite(scope, memory.category, memory.sensitivity)) allowed.push(memory);
    else
      withheld.push({ category: memory.category, reason: withheldReason(scope, memory.category) });
  }

  const toStored = (memory: Omit<StoredMemory, "id">, id: string | null): StoredMemory => ({
    id,
    content: memory.content,
    category: memory.category,
    sensitivity: memory.sensitivity,
    occurredAt: memory.occurredAt,
    expiresAt: memory.expiresAt,
    importance: memory.importance,
  });
  let stored = allowed.map(memory => toStored(memory, null));

  if (!request.dryRun && allowed.length > 0) {
    const inserted = await insertMemories(app.userId, allowed, { type: "app", appId: app.appId });
    try {
      await indexMemories(app.userId, inserted);
    } catch (error) {
      logger.error("Indexing new memories failed", {
        appId: app.appId,
        error: errorSummary(error),
      });
      // Stored should mean searchable, and a retry must not find a duplicate: undo the insert.
      await deleteAppMemories(app.userId, app.appId, { ids: inserted.map(m => m.id) });
      throw processingFailed();
    }
    stored = inserted.map(memory => toStored(memory, memory.id));
  }

  const requestId = await recordAccess({
    app,
    action: "write",
    channel: "api",
    outcome: withheld.length === 0 ? "allowed" : stored.length > 0 ? "partial" : "denied",
    categories: unique(stored.map(memory => memory.category)),
    memoryIds: stored.flatMap(memory => (memory.id ? [memory.id] : [])),
    withheldCount: withheld.length,
    sessionId: request.sessionId,
  });

  return { requestId, stored, withheld, duplicates: 0, dryRun: request.dryRun };
}

/**
 * Deletes memories this app wrote itself, matched by id, external id or session, and removes them
 * from the index. Never touches other writers' memories; no grant is needed.
 */
export async function retractMemories(
  app: AppIdentity,
  request: RetractRequest
): Promise<{ deleted: number }> {
  const deleted = await deleteAppMemories(app.userId, app.appId, request);
  const ids = deleted.map(memory => memory.id);
  try {
    await removeFromIndex(app.userId, ids);
  } catch (error) {
    // The rows are gone, so no app can be served them; `bun run reindex` drops the stale vectors.
    logger.warn("Couldn't remove retracted memories from the semantic index", {
      memoryIds: ids,
      error: errorSummary(error),
    });
  }
  await recordAccess({
    app,
    action: "retract",
    channel: "api",
    outcome: "allowed",
    categories: unique(deleted.map(memory => memory.category)),
    memoryIds: ids,
    sessionId: request.sessionId,
  });
  return { deleted: ids.length };
}
