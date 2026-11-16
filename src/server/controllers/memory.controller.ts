import { z } from "zod";
import { withErrorHandler } from "@/server/middlewares/error-handler.middleware";
import { requireApp } from "@/server/middlewares/require-app.middleware";
import { validateBody } from "@/server/middlewares/validate-body.middleware";
import { ingestMemories, retractMemories } from "@/server/services/ingest.service";
import {
  MEMORY_CATEGORIES,
  MEMORY_CONTENT_TYPES,
  MEMORY_ENTITY_TYPES,
  MEMORY_PROVENANCES,
  MEMORY_VISIBILITIES,
  SENSITIVITY_TIERS,
} from "@/shared/constants/memory-taxonomy";
import { datetime, instant, languageTag, timeZone } from "@/shared/validators/api-fields";

// docs/public-api.md, `POST /memories`.
const writeSchema = z
  .strictObject({
    content: z.string().trim().min(1).max(8000).optional(),
    messages: z
      .array(
        z.strictObject({
          role: z.enum(["user", "assistant", "system", "tool"]),
          content: z.string().max(4000),
          timestamp: datetime.optional(),
        })
      )
      .min(1)
      .max(50)
      .optional(),
    contentType: z.enum(MEMORY_CONTENT_TYPES).optional(),
    mode: z.enum(["extract", "verbatim"]).default("extract"),
    provenance: z.enum(MEMORY_PROVENANCES).optional(),
    confidence: z.number().min(0).max(1).optional(),
    importance: z.int().min(1).max(5).optional(),
    occurredAt: instant.optional(),
    timezone: timeZone.optional(),
    expiresAt: instant.optional(),
    language: languageTag.optional(),
    domain: z.string().trim().min(1).max(40).optional(),
    categoryHints: z.array(z.enum(MEMORY_CATEGORIES)).max(MEMORY_CATEGORIES.length).optional(),
    sensitivityFloor: z.enum(SENSITIVITY_TIERS).optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    entities: z
      .array(
        z.strictObject({
          name: z.string().trim().min(1).max(100),
          type: z.enum(MEMORY_ENTITY_TYPES),
        })
      )
      .max(20)
      .optional(),
    sessionId: z.string().min(1).max(100).optional(),
    externalId: z.string().min(1).max(100).optional(),
    visibility: z.enum(MEMORY_VISIBILITIES).default("shared"),
    dryRun: z.boolean().default(false),
  })
  .refine(body => (body.content === undefined) !== (body.messages === undefined), {
    error: "Send exactly one of content and messages",
    path: ["content"],
  })
  .refine(body => body.mode === "extract" || (body.content?.length ?? Infinity) <= 2000, {
    error: "Verbatim mode needs content of 2,000 characters or fewer",
    path: ["mode"],
  });

// docs/public-api.md, `DELETE /memories`.
const retractSchema = z
  .strictObject({
    ids: z.array(z.uuid()).max(100).optional(),
    externalIds: z.array(z.string().min(1).max(100)).max(100).optional(),
    sessionId: z.string().min(1).max(100).optional(),
  })
  .refine(body => Boolean(body.ids?.length || body.externalIds?.length || body.sessionId), {
    error: "Send at least one of ids, externalIds and sessionId",
  });

/** Writes what the app sent as classified memories, within its write grants. */
export const postMemories = withErrorHandler(async request => {
  const app = await requireApp(request);
  const body = await validateBody(request, writeSchema);
  return Response.json(await ingestMemories(app, body), { status: 201 });
});

/** Retracts memories this app wrote itself. */
export const deleteMemories = withErrorHandler(async request => {
  const app = await requireApp(request);
  const body = await validateBody(request, retractSchema);
  return Response.json(await retractMemories(app, body));
});
