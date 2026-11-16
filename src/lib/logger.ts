type LogLevel = "info" | "warn" | "error";
type LogMeta = Record<string, unknown>;

// Errors serialize to `{}` by default, and their extra props (e.g. a DB error's `detail`)
// can echo user data, so keep only name, message, stack and a string `code`. A code is a system
// code (`ECONNREFUSED`) or a Postgres SQLSTATE (`28P01`), never data.
function serializeErrors(_key: string, value: unknown) {
  if (value instanceof Error) {
    const code = "code" in value && typeof value.code === "string" ? value.code : undefined;
    return { name: value.name, message: value.message, code, stack: value.stack };
  }
  return value;
}

function write(level: LogLevel, message: string, meta?: LogMeta) {
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}`;
  if (!meta) {
    console[level](line);
    return;
  }
  let serialized: string;
  try {
    serialized = JSON.stringify(meta, serializeErrors);
  } catch {
    serialized = "[unserializable meta]";
  }
  console[level](line, serialized);
}

/**
 * An error's name and HTTP status, without its message. Log this for third-party (AI, vector index)
 * errors, whose messages could echo what was sent to them.
 */
export function errorSummary(error: unknown): LogMeta {
  if (!(error instanceof Error)) return { name: typeof error };
  const status = "status" in error && typeof error.status === "number" ? error.status : undefined;
  return { name: error.name, status };
}

/**
 * App-wide logger. Never pass memory content or secrets in the message or meta:
 * log ids, counts and outcomes instead.
 */
export const logger = {
  info: (message: string, meta?: LogMeta) => write("info", message, meta),
  warn: (message: string, meta?: LogMeta) => write("warn", message, meta),
  error: (message: string, meta?: LogMeta) => write("error", message, meta),
};
