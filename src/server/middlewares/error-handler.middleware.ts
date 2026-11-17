import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { ApiError } from "@/server/lib/api-error";
import { logger } from "@/server/lib/logger";

/** A `/api/v1` controller: takes the request, answers with a `Response`. */
export type Controller = (request: Request) => Promise<Response>;

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof z.ZodError) {
    const errors = error.issues.map(issue => ({
      path: issue.path.map(String).join("."),
      message: issue.message,
    }));
    return new ApiError(400, "validation_error", "Invalid request", errors);
  }

  logger.error("Unhandled API error", { error });
  return new ApiError(500, "internal_error");
}

/**
 * Maps anything thrown in a controller to the public error body
 * `{ statusCode, success: false, message, data: null, code, errors }`. Next.js control-flow errors
 * (e.g. `connection()` ending a prerender, `notFound()`) are rethrown so Next can handle them.
 */
export function errorResponse(error: unknown): Response {
  unstable_rethrow(error);

  const { statusCode, code, message, errors } = toApiError(error);
  return Response.json(
    { statusCode, success: false, message, data: null, code, errors },
    { status: statusCode }
  );
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
