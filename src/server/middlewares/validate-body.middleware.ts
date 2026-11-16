import type { z } from "zod";
import { ApiError } from "@/server/lib/api-error";

/**
 * Reads a controller's JSON body and validates it. Pass a `z.strictObject` schema, so an unknown
 * field is a 400 and typos surface at once. Invalid JSON or a schema mismatch throws, and
 * `errorResponse` answers with 400 `validation_error`.
 */
export async function validateBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<z.output<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "validation_error", "The request body must be valid JSON");
  }
  return schema.parse(body);
}
