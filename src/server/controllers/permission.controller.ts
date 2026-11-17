import { ApiResponse } from "@/server/lib/api-response";
import { withErrorHandler } from "@/server/middlewares/error-handler.middleware";
import { requireApp } from "@/server/middlewares/require-app.middleware";
import { getAccessScope } from "@/server/services/grant.service";
import {
  CATEGORY_DESCRIPTIONS,
  CATEGORY_LABELS,
  MEMORY_CATEGORIES,
  SENSITIVITY_DESCRIPTIONS,
  SENSITIVITY_LABELS,
  SENSITIVITY_TIERS,
} from "@/shared/constants/memory-taxonomy";

const taxonomy = {
  categories: MEMORY_CATEGORIES.map(id => ({
    id,
    label: CATEGORY_LABELS[id],
    description: CATEGORY_DESCRIPTIONS[id],
  })),
  sensitivities: SENSITIVITY_TIERS.map(id => ({
    id,
    label: SENSITIVITY_LABELS[id],
    description: SENSITIVITY_DESCRIPTIONS[id],
  })),
};

/** The calling app's own access, so it can shape its requests (docs/public-api.md). */
export const getPermissions = withErrorHandler(async request => {
  // Reading the request's headers already makes this run at request time.
  const app = await requireApp(request);
  const [write, read] = await Promise.all([
    getAccessScope(app.userId, app.appId, "write"),
    getAccessScope(app.userId, app.appId, "read"),
  ]);
  const otherApps = read.sources.appIds.filter(id => id !== app.appId);

  return new ApiResponse(200, {
    app: { id: app.appId, name: app.appName },
    write: write.categories,
    read: read.categories,
    // A count only: which other apps the owner uses is private too.
    sources: {
      ownEntries: read.sources.ownEntries,
      thisApp: read.sources.appIds.includes(app.appId),
      otherAppsCount: otherApps.length,
    },
    taxonomy,
  });
});
