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
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Invalid environment variables:\n${z.prettifyError(parsed.error)}\nSee .env.example.`
  );
}

export const env = parsed.data;
