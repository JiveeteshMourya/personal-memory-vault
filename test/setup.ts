import { mock } from "bun:test";

// `server-only` throws outside React Server Components. Tests run server code directly.
mock.module("server-only", () => ({}));

// Tests never connect to Postgres (they mock `@/server/lib/db`), sign anyone in (they mock `@/server/lib/auth`) or
// call OpenAI or Qdrant, but importing `env` needs valid values, whichever env files Bun loads.
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/memory_vault";
process.env.BETTER_AUTH_SECRET ??= "test-secret-that-is-at-least-32-characters-long";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.MEMORY_ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString("base64");
process.env.OPENAI_API_KEY ??= "test-openai-key";
