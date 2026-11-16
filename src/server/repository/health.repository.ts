import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/server/lib/db";

/** Runs a trivial query. Throws when the database can't be reached. */
export async function pingDatabase(): Promise<void> {
  await db.execute(sql`select 1`);
}
