import { ApiResponse } from "@/server/lib/api-response";
import { withErrorHandler } from "@/server/middlewares/error-handler.middleware";
import { requireApp } from "@/server/middlewares/require-app.middleware";
import { validateBody } from "@/server/middlewares/validate-body.middleware";
import { requestContext } from "@/server/services/context.service";
import { contextSchema } from "@/server/validators/context.validator";

/** Answers the app's request with a short context built only from memories it may read. */
export const postContext = withErrorHandler(async request => {
  const app = await requireApp(request);
  const body = await validateBody(request, contextSchema);
  const { response } = await requestContext(app, body, "api");
  return new ApiResponse(200, response);
});
