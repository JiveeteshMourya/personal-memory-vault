/**
 * A successful `/api/v1` answer. The body is the envelope
 * `{ statusCode, success, message, data }`; `ApiError` is the failure side of it.
 */
export class ApiResponse<T> extends Response {
  constructor(statusCode: number, data: T, message = "Success") {
    super(JSON.stringify({ statusCode, success: statusCode < 400, message, data }), {
      status: statusCode,
      headers: { "content-type": "application/json" },
    });
  }
}
