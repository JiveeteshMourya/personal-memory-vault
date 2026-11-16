import { z } from "zod";
import { requestContext } from "@/data/context";
import { instant, languageTag, timeZone } from "@/lib/api-fields";
import { errorResponse } from "@/lib/api-errors";
import { requireApp } from "@/lib/app-auth";
import {
  CONTEXT_DEPTHS,
  CONTEXT_FORMATS,
  CONTEXT_ORIGINS,
  CONTEXT_PERSPECTIVES,
  CONTEXT_RECENCIES,
  CONTEXT_TASKS,
} from "@/lib/context-options";
import { MEMORY_CATEGORIES } from "@/lib/memory-taxonomy";
import { parseBody } from "@/lib/parse-body";

const categories = z.array(z.enum(MEMORY_CATEGORIES)).max(MEMORY_CATEGORIES.length);
const terms = (maxLength: number) => z.array(z.string().trim().min(1).max(maxLength)).max(20);

// docs/public-api.md, `POST /context`. Defaults are applied by `requestContext`.
const contextSchema = z.strictObject({
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

/** Answers the app's request with a short context built only from memories it may read. */
export async function POST(request: Request) {
  try {
    const app = await requireApp(request);
    const body = await parseBody(request, contextSchema);
    const { response } = await requestContext(app, body, "api");
    return Response.json(response);
  } catch (e) {
    return errorResponse(e);
  }
}
