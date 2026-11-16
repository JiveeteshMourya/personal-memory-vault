import { z } from "zod";
import { createConsentRequest } from "@/data/consent";
import { GRANT_OPERATIONS } from "@/db/schema";
import { errorResponse } from "@/lib/api-errors";
import { requireApp } from "@/lib/app-auth";
import { MEMORY_CATEGORIES, SENSITIVITY_TIERS } from "@/lib/memory-taxonomy";
import { parseBody } from "@/lib/parse-body";

// docs/public-api.md, `POST /consent-requests`.
const consentSchema = z.strictObject({
  operation: z.enum(GRANT_OPERATIONS),
  categories: z.array(z.enum(MEMORY_CATEGORIES)).min(1).max(MEMORY_CATEGORIES.length),
  maxSensitivity: z.enum(SENSITIVITY_TIERS).default("personal"),
  reason: z.string().trim().min(1).max(300),
});

/** Asks the owner for access this app doesn't have. No grant is needed to ask. */
export async function POST(request: Request) {
  try {
    const app = await requireApp(request);
    const body = await parseBody(request, consentSchema);
    return Response.json(await createConsentRequest(app, body), { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
