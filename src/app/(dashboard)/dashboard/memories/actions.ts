"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createMemory, deleteMemory, updateMemory } from "@/data/memories";
import { MEMORY_CATEGORIES, SENSITIVITY_TIERS } from "@/lib/memory-taxonomy";

const MEMORIES_PATH = "/dashboard/memories";

/**
 * What the memory form gets back. Nothing echoes the submitted content: the form submits without
 * resetting, so its fields keep what the owner typed.
 */
export type MemoryFormState =
  | { ok: true }
  | {
      ok: false;
      errors?: {
        content?: string[];
        category?: string[];
        sensitivity?: string[];
        occurredAt?: string[];
      };
      message?: string;
    }
  | undefined;

const memorySchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, { error: "Write down the memory." })
    .max(2000, { error: "Use 2,000 characters or fewer." }),
  category: z.enum(MEMORY_CATEGORIES, { error: "Pick a category." }),
  sensitivity: z.enum(SENSITIVITY_TIERS, { error: "Pick a sensitivity." }),
  // The browser converts the local date and time it shows into an ISO instant before submitting.
  occurredAt: z.iso
    .datetime({ offset: true, error: "Pick a date and time." })
    .transform(value => new Date(value)),
});

const memoryId = z.uuid();

const NOT_FOUND = "This memory no longer exists.";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function parseMemory(formData: FormData) {
  return memorySchema.safeParse({
    content: field(formData, "content"),
    category: field(formData, "category"),
    sensitivity: field(formData, "sensitivity"),
    occurredAt: field(formData, "occurredAt"),
  });
}

export async function createMemoryAction(
  _state: MemoryFormState,
  formData: FormData
): Promise<MemoryFormState> {
  const parsed = parseMemory(formData);
  if (!parsed.success) {
    return { ok: false, errors: z.flattenError(parsed.error).fieldErrors };
  }

  await createMemory(parsed.data);
  revalidatePath(MEMORIES_PATH);
  return { ok: true };
}

export async function updateMemoryAction(
  _state: MemoryFormState,
  formData: FormData
): Promise<MemoryFormState> {
  const id = memoryId.safeParse(field(formData, "id"));
  if (!id.success) return { ok: false, message: NOT_FOUND };

  const parsed = parseMemory(formData);
  if (!parsed.success) {
    return { ok: false, errors: z.flattenError(parsed.error).fieldErrors };
  }

  // Null when the id is missing or another owner's: the DAL only updates the owner's rows.
  const updated = await updateMemory(id.data, parsed.data);
  if (!updated) return { ok: false, message: NOT_FOUND };

  revalidatePath(MEMORIES_PATH);
  return { ok: true };
}

export async function deleteMemoryAction(id: string): Promise<{ ok: boolean }> {
  const parsed = memoryId.safeParse(id);
  if (!parsed.success) return { ok: false };

  const deleted = await deleteMemory(parsed.data);
  if (deleted) revalidatePath(MEMORIES_PATH);
  return { ok: deleted };
}
