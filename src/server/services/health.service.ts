import "server-only";
import { DrizzleQueryError } from "drizzle-orm";
import { logger } from "@/server/lib/logger";
import * as healthRepository from "@/server/repository/health.repository";

export type DatabaseStatus = "ok" | "error";

/** Pings the database. Never throws: a failure is logged and reported as "error". */
export async function checkDatabase(): Promise<DatabaseStatus> {
  try {
    await healthRepository.pingDatabase();
    return "ok";
  } catch (error) {
    // Drizzle wraps driver errors; the cause (e.g. ECONNREFUSED, a bad password) is the useful part.
    logger.warn("Database health check failed", {
      error: error instanceof DrizzleQueryError ? error.cause : error,
    });
    return "error";
  }
}
