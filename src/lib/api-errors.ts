import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { logger } from "@/lib/logger";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function errorBody(status: number, code: string, message: string, details?: unknown) {
  return Response.json(
    { error: { code, message, ...(details !== undefined && { details }) } },
    { status }
  );
}

/**
 * Maps anything thrown in a route handler to the public `{ error: { code, message, details? } }` body.
 * Next.js control-flow errors (e.g. `connection()` ending a prerender, `notFound()`) are rethrown
 * so Next can handle them.
 */
export function errorResponse(error: unknown): Response {
  unstable_rethrow(error);

  if (error instanceof ApiError) {
    return errorBody(error.status, error.code, error.message, error.details);
  }

  if (error instanceof z.ZodError) {
    return errorBody(400, "validation_error", "Invalid request", z.flattenError(error));
  }

  logger.error("Unhandled API error", { error });
  return errorBody(500, "internal_error", "Something went wrong");
}
