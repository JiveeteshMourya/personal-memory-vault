import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import { env } from "@/lib/env";

// Dev hot reloads re-run this module. Keep one connection pool per process instead of a new one
// per reload.
const globalForDb = globalThis as unknown as { pgClient?: postgres.Sql };

// postgres.js connects lazily, on the first query. `prepare: false` because Supabase's transaction
// pooler (the hosted DATABASE_URL) can't use prepared statements.
const client = globalForDb.pgClient ?? postgres(env.DATABASE_URL, { prepare: false });

if (env.NODE_ENV !== "production") {
  globalForDb.pgClient = client;
}

/**
 * The Drizzle client. Import it only from the Data Access Layer (`src/data/*`) and scripts,
 * never from components or route handlers.
 */
export const db = drizzle({ client, schema });
