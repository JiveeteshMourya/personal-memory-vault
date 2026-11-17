import { ApiResponse } from "@/server/lib/api-response";
import { withErrorHandler } from "@/server/middlewares/error-handler.middleware";
import { requireApp } from "@/server/middlewares/require-app.middleware";
import { validateBody } from "@/server/middlewares/validate-body.middleware";
import { createConsentRequest } from "@/server/services/consent.service";
import { consentRequestSchema } from "@/server/validators/consent-request.validator";

/** Asks the owner for access this app doesn't have. No grant is needed to ask. */
export const postConsentRequest = withErrorHandler(async request => {
  const app = await requireApp(request);
  const body = await validateBody(request, consentRequestSchema);
  return new ApiResponse(201, await createConsentRequest(app, body));
});
