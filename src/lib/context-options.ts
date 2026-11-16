// The options an app can pass to `POST /api/v1/context` (docs/public-api.md) to shape what it gets
// back. No imports: the Playground's client form uses these lists too.

/** What the app will do with the context. Shapes which facts lead. */
export const CONTEXT_TASKS = [
  "personalize",
  "answer",
  "recommend",
  "plan",
  "summarize_profile",
  "check_constraints",
] as const;

export type ContextTask = (typeof CONTEXT_TASKS)[number];

/** Whose memories to draw on: any allowed source, every allowed source but the asking app, or only it. */
export const CONTEXT_ORIGINS = ["any", "other_apps", "this_app"] as const;

export type ContextOrigin = (typeof CONTEXT_ORIGINS)[number];

/** How much newer memories are favoured when ranking. */
export const CONTEXT_RECENCIES = ["recent", "balanced", "all_time"] as const;

export type ContextRecency = (typeof CONTEXT_RECENCIES)[number];

/** How many memories to consider: speed against coverage. */
export const CONTEXT_DEPTHS = ["quick", "standard", "deep"] as const;

export type ContextDepth = (typeof CONTEXT_DEPTHS)[number];

export const CONTEXT_FORMATS = ["paragraph", "bullets"] as const;

export type ContextFormat = (typeof CONTEXT_FORMATS)[number];

/** "The user…" for a system prompt, or "You…" for text shown to the user. */
export const CONTEXT_PERSPECTIVES = ["third_person", "second_person"] as const;

export type ContextPerspective = (typeof CONTEXT_PERSPECTIVES)[number];

export const TASK_LABELS: Record<ContextTask, string> = {
  personalize: "Personalize",
  answer: "Answer",
  recommend: "Recommend",
  plan: "Plan",
  summarize_profile: "Summarize profile",
  check_constraints: "Check constraints",
};

export const ORIGIN_LABELS: Record<ContextOrigin, string> = {
  any: "Any allowed source",
  other_apps: "Everyone but this app",
  this_app: "Only this app",
};

export const PERSPECTIVE_LABELS: Record<ContextPerspective, string> = {
  third_person: "Third person (“The user…”)",
  second_person: "Second person (“You…”)",
};
