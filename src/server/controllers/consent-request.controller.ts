import { z } from "zod";
import { withErrorHandler } from "@/server/middlewares/error-handler.middleware";
import { requireApp } from "@/server/middlewares/require-app.middleware";
import { validateBody } from "@/server/middlewares/validate-body.middleware";
import { createConsentRequest } from "@/server/services/consent.service";
import { MEMORY_CATEGORIES, SENSITIVITY_TIERS } from "@/shared/constants/memory-taxonomy";
import { GRANT_OPERATIONS } from "@/shared/constants/permissions";

// docs/public-api.md, `POST /consent-requests`.
const consentSchema = z.strictObject({
  operation: z.enum(GRANT_OPERATIONS),
  categories: z.array(z.enum(MEMORY_CATEGORIES)).min(1).max(MEMORY_CATEGORIES.length),
  maxSensitivity: z.enum(SENSITIVITY_TIERS).default("personal"),
  reason: z.string().trim().min(1).max(300),
});

/** Asks the owner for access this app doesn't have. No grant is needed to ask. */
export const postConsentRequest = withErrorHandler(async request => {
  const app = await requireApp(request);
  const body = await validateBody(request, consentSchema);
  return Response.json(await createConsentRequest(app, body), { status: 201 });
});
