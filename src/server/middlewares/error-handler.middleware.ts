import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { ApiError } from "@/server/lib/api-error";
import { logger } from "@/server/lib/logger";

/** A `/api/v1` controller: takes the request, answers with a `Response`. */
export type Controller = (request: Request) => Promise<Response>;

function errorBody(status: number, code: string, message: string, details?: unknown) {
  return Response.json(
    { error: { code, message, ...(details !== undefined && { details }) } },
    { status }
  );
}

/**
 * Maps anything thrown in a controller to the public `{ error: { code, message, details? } }` body.
 * Next.js control-flow errors (e.g. `connection()` ending a prerender, `notFound()`) are rethrown
 * so Next can handle them.
 */
export function errorResponse(error: unknown): Response {
  unstable_rethrow(error);

  if (error instanceof ApiError) {
    return errorBody(error.status, error.code, error.message, error.details);
  }

  if (error instanceof z.ZodError) {
    // A tree, because request bodies nest (e.g. `messages[3].role`).
    return errorBody(400, "validation_error", "Invalid request", z.treeifyError(error));
  }

  logger.error("Unhandled API error", { error });
  return errorBody(500, "internal_error", "Something went wrong");
}

/** Wraps a controller so anything it throws is answered by `errorResponse`. */
export function withErrorHandler(controller: Controller): Controller {
  return async request => {
    try {
      return await controller(request);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
