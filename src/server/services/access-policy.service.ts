// The vault's access rules (docs/classification-model.md), as pure functions: no I/O, no clock
// unless given one. Everything is denied unless a grant and, for reads, a source permission allow
// it. Callers decide here BEFORE retrieving anything, and re-check every fetched row with `canRead`.

import {
  MEMORY_CATEGORIES,
  sensitivityRank,
  type MemoryCategory,
  type Sensitivity,
  type Visibility,
} from "@/shared/constants/memory-taxonomy";
import type { GrantOperation } from "@/shared/constants/permissions";
import type { AccessScope, AccessSource, Grant } from "@/shared/types/grant.types";
import type { MemorySource } from "@/shared/types/memory.types";

/** The labels `canRead` needs from a memory. All are required, so none can be forgotten. */
export type ReadableMemory = {
  category: MemoryCategory;
  sensitivity: Sensitivity;
  source: MemorySource;
  visibility: Visibility;
  expiresAt: Date | null;
};

/** Builds an app's scope for one operation from its stored grants and source permissions. */
export function evaluateAccess({
  grants,
  sources,
  operation,
}: {
  grants: Grant[];
  sources: AccessSource[];
  operation: GrantOperation;
}): AccessScope {
  const caps = new Map<MemoryCategory, Sensitivity>();
  for (const grant of grants) {
    if (grant.operation !== operation) continue;
    const current = caps.get(grant.category);
    // Two grants for one category can't be stored; if they ever were, the stricter one wins.
    if (!current || sensitivityRank(grant.maxSensitivity) < sensitivityRank(current)) {
      caps.set(grant.category, grant.maxSensitivity);
    }
  }

  const categories = MEMORY_CATEGORIES.flatMap(category => {
    const maxSensitivity = caps.get(category);
    return maxSensitivity ? [{ category, maxSensitivity }] : [];
  });

  if (operation === "write") {
    return { operation, categories, sources: { ownEntries: false, appIds: [] } };
  }
  const appIds = [...new Set(sources.flatMap(s => (s.type === "app" ? [s.appId] : [])))];
  return {
    operation,
    categories,
    sources: { ownEntries: sources.some(s => s.type === "user"), appIds },
  };
}

function withinCap(scope: AccessScope, category: MemoryCategory, sensitivity: Sensitivity) {
  const cap = scope.categories.find(c => c.category === category);
  return cap !== undefined && sensitivityRank(sensitivity) <= sensitivityRank(cap.maxSensitivity);
}

/** Whether an app may store a memory classified as `category` at `sensitivity`. */
export function canWrite(
  scope: AccessScope,
  category: MemoryCategory,
  sensitivity: Sensitivity
): boolean {
  return scope.operation === "write" && withinCap(scope, category, sensitivity);
}

/**
 * Whether the app `readerAppId` may receive `memory`. All four rules must hold: category and tier
 * within a read grant, an allowed source, `shared` visibility (or the reader wrote it), and not
 * expired. A memory left by a deleted app (no app id) is never shared.
 */
export function canRead(
  scope: AccessScope,
  memory: ReadableMemory,
  readerAppId: string,
  now: Date = new Date()
): boolean {
  if (scope.operation !== "read") return false;
  if (!withinCap(scope, memory.category, memory.sensitivity)) return false;

  const { source } = memory;
  if (source.type === "user") {
    if (!scope.sources.ownEntries) return false;
  } else if (source.appId === null || !scope.sources.appIds.includes(source.appId)) {
    return false;
  }

  const wroteIt = source.type === "app" && source.appId === readerAppId;
  if (memory.visibility !== "shared" && !wroteIt) return false;

  return memory.expiresAt === null || memory.expiresAt > now;
}
