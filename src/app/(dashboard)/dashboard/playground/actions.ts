"use server";

import { z } from "zod";

import { listApps } from "@/data/apps";
import { requireUser } from "@/data/auth";
import { requestContext, type ContextCoverage } from "@/data/context";
import type { MemorySource } from "@/data/memories";
import { ApiError } from "@/lib/api-errors";
import { CONTEXT_ORIGINS, CONTEXT_PERSPECTIVES, CONTEXT_TASKS } from "@/lib/context-options";
import {
  MEMORY_CATEGORIES,
  type MemoryCategory,
  type Provenance,
  type Sensitivity,
} from "@/lib/memory-taxonomy";

/** A memory the test request disclosed, shown in full: the owner is the one looking. */
export type PlaygroundMemory = {
  id: string;
  content: string;
  category: MemoryCategory;
  sensitivity: Sensitivity;
  source: MemorySource;
  provenance: Provenance;
  confidence: number;
  occurredAt: Date;
};

export type PlaygroundResult = {
  requestId: string;
  context: string;
  charCount: number;
  maxChars: number;
  coverage: ContextCoverage;
  withheldCategories: MemoryCategory[];
  memories: PlaygroundMemory[];
};

type PlaygroundField =
  "appId" | "query" | "purpose" | "task" | "origin" | "categories" | "maxChars" | "perspective";

/** What the Playground form gets back. Nothing echoes the form: its fields keep what was typed. */
export type PlaygroundState =
  | { ok: true; result: PlaygroundResult }
  | { ok: false; errors?: Partial<Record<PlaygroundField, string[]>>; message?: string }
  | undefined;

// An empty form field means "not given".
const emptyToUndefined = <T extends string>(value: T) =>
  value === "" ? undefined : (value as Exclude<T, "">);

const playgroundSchema = z.object({
  appId: z.uuid({ error: "Pick an app." }),
  query: z
    .string()
    .trim()
    .min(1, { error: "Ask the vault something." })
    .max(2000, { error: "Use 2,000 characters or fewer." }),
  purpose: z
    .string()
    .trim()
    .max(200, { error: "Use 200 characters or fewer." })
    .transform(emptyToUndefined),
  task: z.enum(CONTEXT_TASKS).or(z.literal("")).transform(emptyToUndefined),
  origin: z.enum(CONTEXT_ORIGINS, { error: "Pick whose memories it may draw on." }),
  categories: z.array(z.enum(MEMORY_CATEGORIES)),
  maxChars: z.coerce
    .number()
    .int({ error: "Use a whole number from 20 to 100." })
    .min(20, { error: "Use a whole number from 20 to 100." })
    .max(100, { error: "Use a whole number from 20 to 100." }),
  perspective: z.enum(CONTEXT_PERSPECTIVES, { error: "Pick a perspective." }),
});

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/**
 * Runs a context request as one of the owner's apps, exactly as the API would, and returns what it
 * would get back plus the memories behind it. It's a real request: it lands in the access log.
 */
export async function runPlaygroundAction(
  _state: PlaygroundState,
  formData: FormData
): Promise<PlaygroundState> {
  const parsed = playgroundSchema.safeParse({
    appId: field(formData, "appId"),
    query: field(formData, "query"),
    purpose: field(formData, "purpose"),
    task: field(formData, "task"),
    origin: field(formData, "origin"),
    categories: formData.getAll("categories"),
    maxChars: field(formData, "maxChars"),
    perspective: field(formData, "perspective"),
  });
  if (!parsed.success) {
    return { ok: false, errors: z.flattenError(parsed.error).fieldErrors };
  }
  const { appId, categories, ...request } = parsed.data;

  const user = await requireUser();
  // Only the owner's own apps: someone else's app id is simply not found.
  const app = (await listApps()).find(candidate => candidate.id === appId);
  if (!app) return { ok: false, message: "This app no longer exists." };

  try {
    const { response, disclosed } = await requestContext(
      { userId: user.id, appId: app.id, appName: app.name },
      // No topics picked means every granted one.
      { ...request, categories: categories.length > 0 ? categories : undefined },
      "playground"
    );
    return {
      ok: true,
      result: {
        requestId: response.requestId,
        context: response.context,
        charCount: response.charCount,
        maxChars: request.maxChars,
        coverage: response.coverage,
        withheldCategories: response.withheldCategories,
        memories: disclosed.map(memory => ({
          id: memory.id,
          content: memory.content,
          category: memory.category,
          sensitivity: memory.sensitivity,
          source: memory.source,
          provenance: memory.provenance,
          confidence: memory.confidence,
          occurredAt: memory.occurredAt,
        })),
      },
    };
  } catch (error) {
    if (error instanceof ApiError && error.code === "read_denied") {
      return {
        ok: false,
        message: `${app.name} can’t read anything yet. Give it a read permission and a source on Permissions.`,
      };
    }
    if (error instanceof ApiError && error.code === "processing_failed") {
      return { ok: false, message: "The AI provider or the search index failed. Try again." };
    }
    throw error;
  }
}
