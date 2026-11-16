import "server-only";
import { z } from "zod";

// Every phase that needs a new env var adds it here and to `.env.example`.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // The app's Postgres connection; on hosted Supabase, the transaction pooler. drizzle-kit reads
  // DIRECT_URL on its own (see drizzle.config.ts); the app never does.
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  // Signs and encrypts Better Auth's cookies and tokens. Rotating it signs everyone out.
  BETTER_AUTH_SECRET: z.string().min(32),
  // The app's public origin, e.g. http://localhost:3000. Better Auth trusts it for CSRF checks.
  BETTER_AUTH_URL: z.url(),
  // The AES-256-GCM key for memory content: 32 random bytes, base64. Changing or losing it makes
  // every stored memory unreadable.
  MEMORY_ENCRYPTION_KEY: z.base64().refine(value => Buffer.from(value, "base64").length === 32, {
    error: "Must be 32 bytes, base64-encoded.",
  }),
  // OpenAI: one key covers extraction (OPENAI_MODEL) and embeddings (OPENAI_EMBEDDING_MODEL).
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1).default("gpt-6-luna"),
  OPENAI_EMBEDDING_MODEL: z.string().min(1).default("text-embedding-3-small"),
  // Qdrant (docker-compose): the semantic index. The collection is created on first use.
  // 127.0.0.1 rather than localhost, which can resolve to ::1 while the port is bound to IPv4.
  QDRANT_URL: z.url({ protocol: /^https?$/ }).default("http://127.0.0.1:6333"),
  QDRANT_COLLECTION: z
    .string()
    .regex(/^[a-z0-9_-]{1,64}$/, {
      error: "Lowercase letters, digits, hyphens and underscores only.",
    })
    .default("memories"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Invalid environment variables:\n${z.prettifyError(parsed.error)}\nSee .env.example.`
  );
}

export const env = parsed.data;
