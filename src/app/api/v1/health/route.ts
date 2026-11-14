import { connection } from "next/server";
import { checkDatabase } from "@/data/health";
import { errorResponse } from "@/lib/api-errors";

export async function GET() {
  try {
    // Answer at request time; with Cache Components a static GET would be prerendered at build.
    await connection();
    const db = await checkDatabase();
    const ok = db === "ok";
    // 503 when a dependency is down, so uptime monitors see the outage.
    return Response.json({ status: ok ? "ok" : "error", db }, { status: ok ? 200 : 503 });
  } catch (e) {
    return errorResponse(e);
  }
}
