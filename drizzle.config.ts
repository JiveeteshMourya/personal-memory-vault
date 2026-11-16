import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs on Node outside Next.js, so nothing loads .env.local for it. Without the file,
// the var comes from the real environment.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

// drizzle-kit (generate, migrate, studio) uses the same database as the app.
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set. See .env.example.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/models/index.ts",
  out: "./drizzle",
  dbCredentials: { url },
});
