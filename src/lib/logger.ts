type LogLevel = "info" | "warn" | "error";
type LogMeta = Record<string, unknown>;

// Errors serialize to `{}` by default, and their extra props (e.g. a DB error's `detail`)
// can echo user data, so keep only name, message and stack.
function serializeErrors(_key: string, value: unknown) {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
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
 * App-wide logger. Never pass memory content or secrets in the message or meta:
 * log ids, counts and outcomes instead.
 */
export const logger = {
  info: (message: string, meta?: LogMeta) => write("info", message, meta),
  warn: (message: string, meta?: LogMeta) => write("warn", message, meta),
  error: (message: string, meta?: LogMeta) => write("error", message, meta),
};
