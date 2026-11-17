import { ApiResponse } from "@/server/lib/api-response";
import { withErrorHandler } from "@/server/middlewares/error-handler.middleware";
import { requireApp } from "@/server/middlewares/require-app.middleware";
import { validateBody } from "@/server/middlewares/validate-body.middleware";
import { ingestMemories, retractMemories } from "@/server/services/ingest.service";
import { retractMemorySchema, writeMemorySchema } from "@/server/validators/memory.validator";

/** Writes what the app sent as classified memories, within its write grants. */
export const postMemories = withErrorHandler(async request => {
  const app = await requireApp(request);
  const body = await validateBody(request, writeMemorySchema);
  return new ApiResponse(201, await ingestMemories(app, body));
});

/** Retracts memories this app wrote itself. */
export const deleteMemories = withErrorHandler(async request => {
  const app = await requireApp(request);
  const body = await validateBody(request, retractMemorySchema);
  return new ApiResponse(200, await retractMemories(app, body));
});
