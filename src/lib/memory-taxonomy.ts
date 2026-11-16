// The labels every memory carries (docs/classification-model.md). Grants, the policy engine, the
// semantic index and AI classification all build on these lists.
// No imports: the schema files (loaded by drizzle-kit) and client components use it too.

/** Platform-agnostic topics: they fit any kind of GenAI app, not only wellbeing. */
export const MEMORY_CATEGORIES = [
  "identity",
  "preferences",
  "goals",
  "interests",
  "activity",
  "sleep",
  "diet",
  "health",
  "mood",
  "work",
  "education",
  "social",
  "relationships",
  "finance",
  "travel",
  "other",
] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

/** Ordered by the harm if leaked, least first. A grant caps access at a tier. */
export const SENSITIVITY_TIERS = ["shareable", "personal", "private", "protected"] as const;

export type Sensitivity = (typeof SENSITIVITY_TIERS)[number];

/** A tier's position in `SENSITIVITY_TIERS`: 0 for shareable up to 3 for protected. */
export function sensitivityRank(tier: Sensitivity): number {
  return SENSITIVITY_TIERS.indexOf(tier);
}

/** `shared` memories can reach any app the owner allows; `app_private` ones only their writer. */
export const MEMORY_VISIBILITIES = ["shared", "app_private"] as const;

export type Visibility = (typeof MEMORY_VISIBILITIES)[number];

/** How a memory came to be known, which caps how much it's trusted. The owner's own are `user_stated`. */
export const MEMORY_PROVENANCES = [
  "user_stated",
  "user_confirmed",
  "app_observed",
  "app_inferred",
  "imported",
] as const;

export type Provenance = (typeof MEMORY_PROVENANCES)[number];

/** What kind of text an app sent. A hint for extraction, stored (encrypted) with each memory. */
export const MEMORY_CONTENT_TYPES = [
  "note",
  "conversation",
  "journal",
  "event",
  "observation",
  "document",
  "summary",
  "profile",
] as const;

export type ContentType = (typeof MEMORY_CONTENT_TYPES)[number];

/** Kinds of people, places and things a memory can mention. */
export const MEMORY_ENTITY_TYPES = [
  "person",
  "place",
  "organization",
  "product",
  "condition",
  "other",
] as const;

export type EntityType = (typeof MEMORY_ENTITY_TYPES)[number];

/** A person, place or thing a memory mentions. Stored encrypted, like the content. */
export type MemoryEntity = { name: string; type: EntityType };

export const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  identity: "Identity",
  preferences: "Preferences",
  goals: "Goals",
  interests: "Interests",
  activity: "Activity",
  sleep: "Sleep",
  diet: "Diet",
  health: "Health",
  mood: "Mood",
  work: "Work",
  education: "Education",
  social: "Social",
  relationships: "Relationships",
  finance: "Finance",
  travel: "Travel",
  other: "Other",
};

export const CATEGORY_DESCRIPTIONS: Record<MemoryCategory, string> = {
  identity: "Name, age, background, languages, pronouns, where they’re from.",
  preferences: "Likes, dislikes, styles and constraints, like vegetarian or concise answers.",
  goals: "What they’re working towards, short and long term.",
  interests: "Hobbies, media and topics they follow.",
  activity: "Exercise, workouts, steps and other physical activity.",
  sleep: "Sleep times, duration and quality.",
  diet: "Meals, eating habits, allergies and nutrition.",
  health: "Symptoms, conditions, medication and appointments.",
  mood: "Emotions, stress, energy and mental wellbeing.",
  work: "Job, projects, colleagues and career.",
  education: "Studies, courses and skills being learned.",
  social: "Friends, events and community.",
  relationships: "Partner, family and close relationships.",
  finance: "Income, spending, debts and accounts.",
  travel: "Trips, places, commutes and whereabouts.",
  other: "Anything that fits nowhere else.",
};

export const SENSITIVITY_LABELS: Record<Sensitivity, string> = {
  shareable: "Shareable",
  personal: "Personal",
  private: "Private",
  protected: "Protected",
};

/** What leaking a memory of each tier could cost, with examples. */
export const SENSITIVITY_DESCRIPTIONS: Record<Sensitivity, string> = {
  shareable: "Fine for any app to know: tastes, interests, skills, a first name.",
  personal: "Could be used to profile you: routines, workouts, meals, sleep, schedule.",
  private: "Could cause emotional or social harm: moods, relationships, family matters.",
  protected: "Could cause concrete harm: health conditions, money, beliefs, exact location.",
};

export const PROVENANCE_LABELS: Record<Provenance, string> = {
  user_stated: "Stated",
  user_confirmed: "Confirmed",
  app_observed: "Observed",
  app_inferred: "Inferred",
  imported: "Imported",
};
