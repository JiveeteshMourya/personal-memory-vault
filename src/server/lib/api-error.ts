/**
 * An error with a public status, code and message. Services and middlewares throw it, and the error
 * handler (`@/server/middlewares/error-handler.middleware`) answers with
 * `{ error: { code, message, details? } }`.
 */
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
