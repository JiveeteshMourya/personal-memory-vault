import "server-only";
import { z } from "zod";

// Every phase that needs a new env var adds it here and to `.env.example`.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Invalid environment variables:\n${z.prettifyError(parsed.error)}\nSee .env.example.`
  );
}

export const env = parsed.data;
