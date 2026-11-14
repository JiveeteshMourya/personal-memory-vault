import "server-only";
import { DrizzleQueryError, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export type DatabaseStatus = "ok" | "error";

/** Pings the database with a trivial query. Never throws: a failure is logged and reported as "error". */
export async function checkDatabase(): Promise<DatabaseStatus> {
  try {
    await db.execute(sql`select 1`);
    return "ok";
  } catch (error) {
    // Drizzle wraps driver errors; the cause (e.g. ECONNREFUSED, a bad password) is the useful part.
    logger.warn("Database health check failed", {
      error: error instanceof DrizzleQueryError ? error.cause : error,
    });
    return "error";
  }
}
