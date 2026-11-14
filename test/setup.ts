import { mock } from "bun:test";

// `server-only` throws outside React Server Components. Tests run server code directly.
mock.module("server-only", () => ({}));

// Tests never connect to Postgres (they mock `@/lib/db`), but importing `env` needs a valid URL,
// whichever env files Bun loads under test.
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/memory_vault";
