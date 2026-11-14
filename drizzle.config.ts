import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs on Node outside Next.js, so nothing loads .env.local for it. On CI or a deploy
// host there is no file and the var comes from the real environment.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

// drizzle-kit (generate, migrate, studio) uses the direct connection, not the app's pooled URL.
const url = process.env.DIRECT_URL;
if (!url) {
  throw new Error("DIRECT_URL is not set. See .env.example.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url },
});
