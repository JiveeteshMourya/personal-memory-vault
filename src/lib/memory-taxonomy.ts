// The fixed vocabulary every memory is filed under. Grants (Phase 06), the semantic index
// (Phase 10) and AI classification (Phase 11) all build on these lists.
// No imports: the `memories` schema (loaded by drizzle-kit) and client components use it too.

export const MEMORY_CATEGORIES = [
  "activity",
  "sleep",
  "diet",
  "mood",
  "health",
  "work",
  "social",
  "finance",
  "relationships",
  "personal",
] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

/** Ordered from least to most sensitive. Grants cap access at a maximum level. */
export const SENSITIVITY_LEVELS = ["low", "moderate", "high", "restricted"] as const;

export type Sensitivity = (typeof SENSITIVITY_LEVELS)[number];

/** A level's position in `SENSITIVITY_LEVELS`: 0 for low up to 3 for restricted. */
export function sensitivityRank(level: Sensitivity): number {
  return SENSITIVITY_LEVELS.indexOf(level);
}

export const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  activity: "Activity",
  sleep: "Sleep",
  diet: "Diet",
  mood: "Mood",
  health: "Health",
  work: "Work",
  social: "Social",
  finance: "Finance",
  relationships: "Relationships",
  personal: "Personal",
};

export const SENSITIVITY_LABELS: Record<Sensitivity, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
  restricted: "Restricted",
};
