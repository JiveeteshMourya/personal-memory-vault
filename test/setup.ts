import { mock } from "bun:test";

// `server-only` throws outside React Server Components. Tests run server code directly.
mock.module("server-only", () => ({}));

// Tests never connect to Postgres (they mock `@/lib/db`) or sign anyone in (they mock `@/lib/auth`),
// but importing `env` needs valid values, whichever env files Bun loads under test.
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/memory_vault";
process.env.BETTER_AUTH_SECRET ??= "test-secret-that-is-at-least-32-characters-long";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.MEMORY_ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString("base64");
