import { connection } from "next/server";
import { ApiResponse } from "@/server/lib/api-response";
import { withErrorHandler } from "@/server/middlewares/error-handler.middleware";
import { checkDatabase } from "@/server/services/health.service";

/** Whether the vault and its database are up. Needs no API key. */
export const getHealth = withErrorHandler(async () => {
  // Answer at request time; with Cache Components a static GET would be prerendered at build.
  await connection();
  const db = await checkDatabase();
  const ok = db === "ok";
  // 503 when a dependency is down, so uptime monitors see the outage.
  return new ApiResponse(
    ok ? 200 : 503,
    { status: ok ? "ok" : "error", db },
    ok ? "Vault is up" : "Database is down"
  );
});
