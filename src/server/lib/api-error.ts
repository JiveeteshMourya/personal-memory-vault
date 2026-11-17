/** One field a request got wrong: its dotted path (e.g. `messages.3.role`) and what's wrong. */
export type ApiFieldError = { path: string; message: string };

/**
 * A failed `/api/v1` answer. Services and middlewares throw it, and the error handler
 * (`@/server/middlewares/error-handler.middleware`) sends
 * `{ statusCode, success: false, message, data: null, code, errors }`. `code` is the stable,
 * snake_case reason apps branch on (`read_denied`, `validation_error`, …).
 */
export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message = "Something went wrong",
    readonly errors: ApiFieldError[] = []
  ) {
    super(message);
    this.name = "ApiError";
  }
}
