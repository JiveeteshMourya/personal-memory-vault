import type { MemoryCategory, Sensitivity } from "@/shared/constants/memory-taxonomy";
import type { GrantOperation } from "@/shared/constants/permissions";

/** One allowed category and the highest tier allowed in it. */
export type CategoryCap = { category: MemoryCategory; maxSensitivity: Sensitivity };

/** A stored grant: an app may read or write one category, up to a tier. */
export type Grant = CategoryCap & { operation: GrantOperation };

/** A writer whose memories a reading app may see: the owner's own entries, or one connected app. */
export type AccessSource = { type: "user" } | { type: "app"; appId: string };

/** Everything the owner has allowed one app: its grants and whose memories it may read. */
export type AppPermissions = { grants: Grant[]; sources: AccessSource[] };

/** What an app may do for one operation, decided by the policy engine. Anything not listed is denied. */
export type AccessScope = {
  operation: GrantOperation;
  /** The allowed categories with their caps, in taxonomy order. Empty means no access at all. */
  categories: CategoryCap[];
  /** Reads only: whose memories may be read. Always empty for a write scope. */
  sources: { ownEntries: boolean; appIds: string[] };
};
