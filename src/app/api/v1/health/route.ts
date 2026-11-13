import { connection } from "next/server";
import { errorResponse } from "@/lib/api-errors";

export async function GET() {
  try {
    // Answer at request time; with Cache Components a static GET would be prerendered at build.
    await connection();
    return Response.json({ status: "ok" });
  } catch (e) {
    return errorResponse(e);
  }
}
