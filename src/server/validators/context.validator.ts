import { z } from "zod";
import {
  CONTEXT_DEPTHS,
  CONTEXT_FORMATS,
  CONTEXT_ORIGINS,
  CONTEXT_PERSPECTIVES,
  CONTEXT_RECENCIES,
  CONTEXT_TASKS,
} from "@/shared/constants/context-options";
import { MEMORY_CATEGORIES } from "@/shared/constants/memory-taxonomy";
import { instant, languageTag, timeZone } from "@/shared/validators/api-fields";

const categories = z.array(z.enum(MEMORY_CATEGORIES)).max(MEMORY_CATEGORIES.length);
const terms = (maxLength: number) => z.array(z.string().trim().min(1).max(maxLength)).max(20);

// docs/public-api.md, `POST /context`. Defaults are applied by `requestContext`.
export const contextSchema = z.strictObject({
  query: z.string().trim().min(1).max(2000),
  purpose: z.string().trim().min(1).max(200).optional(),
  task: z.enum(CONTEXT_TASKS).optional(),
  conversation: z
    .array(
      z.strictObject({
        role: z.enum(["user", "assistant", "system", "tool"]),
        content: z.string().max(4000),
      })
    )
    .max(20)
    .optional(),
  knownFacts: terms(300).optional(),
  keywords: terms(100).optional(),
  entities: terms(100).optional(),
  // An empty filter would silently match nothing, so it isn't accepted: leave the field out instead.
  categories: categories.min(1).optional(),
  excludeCategories: categories.optional(),
  origin: z.enum(CONTEXT_ORIGINS).optional(),
  timeRange: z.strictObject({ from: instant.optional(), to: instant.optional() }).optional(),
  recency: z.enum(CONTEXT_RECENCIES).optional(),
  depth: z.enum(CONTEXT_DEPTHS).optional(),
  minConfidence: z.number().min(0).max(1).optional(),
  maxChars: z.int().min(20).max(100).optional(),
  format: z.enum(CONTEXT_FORMATS).optional(),
  perspective: z.enum(CONTEXT_PERSPECTIVES).optional(),
  language: languageTag.optional(),
  timezone: timeZone.optional(),
  includeSources: z.boolean().optional(),
  sessionId: z.string().min(1).max(100).optional(),
});
