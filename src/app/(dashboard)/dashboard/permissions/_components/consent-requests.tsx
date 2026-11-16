import { KeyRoundIcon } from "lucide-react";

import {
  ConsentRequestActions,
  type ConsentSourceOption,
} from "@/app/(dashboard)/dashboard/permissions/_components/consent-request-actions";
import { AppMonogram } from "@/components/app-monogram";
import { LocalDateTime } from "@/components/local-date-time";
import { CategoryBadge } from "@/components/memory-badges";
import { listApps } from "@/data/apps";
import { listPendingConsentRequests } from "@/data/consent";
import { getAppPermissions } from "@/data/grants";
import { SENSITIVITY_CAP_LABELS } from "@/lib/memory-taxonomy";

/**
 * Apps' requests for access, waiting for the owner. Renders nothing when there are none. Reads the
 * session, so it renders behind <Suspense>.
 */
export async function ConsentRequests() {
  const requests = await listPendingConsentRequests();
  if (requests.length === 0) return null;

  const appIds = [...new Set(requests.map(request => request.appId))];
  const [apps, permissions] = await Promise.all([
    listApps(),
    Promise.all(appIds.map(async id => [id, await getAppPermissions(id)] as const)).then(
      entries => new Map(entries)
    ),
  ]);

  return (
    <section
      id="requests"
      aria-labelledby="requests-heading"
      className="mb-8 flex scroll-mt-24 flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <h2 id="requests-heading" className="flex items-center gap-2 font-medium">
          <KeyRoundIcon aria-hidden="true" className="size-4 text-key" />
          Waiting for you ({requests.length})
        </h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          Apps asking for access they don’t have. Approving grants only what you pick, and denying
          changes nothing.
        </p>
      </div>
      <ul className="divide-y divide-key/25 rounded-xl border border-key/45 bg-key/6 dark:bg-key/8">
        {requests.map(request => {
          const { grants, sources } = permissions.get(request.appId) ?? { grants: [], sources: [] };
          const currentCaps = Object.fromEntries(
            grants
              .filter(grant => grant.operation === request.operation)
              .map(grant => [grant.category, grant.maxSensitivity])
          );
          const allowed = new Set(sources.map(s => (s.type === "user" ? "user" : s.appId)));
          const sourceOptions: ConsentSourceOption[] =
            request.operation === "read"
              ? [
                  { source: "user", label: "Your entries", allowed: allowed.has("user") },
                  {
                    source: request.appId,
                    label: `${request.appName} (this app)`,
                    allowed: allowed.has(request.appId),
                  },
                  ...apps
                    .filter(app => app.id !== request.appId)
                    .map(app => ({
                      source: app.id,
                      label: app.name,
                      allowed: allowed.has(app.id),
                    })),
                ]
              : [];

          return (
            <li
              key={request.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex min-w-0 gap-3">
                <AppMonogram name={request.appName} />
                <div className="flex min-w-0 flex-col gap-2">
                  <p>
                    <span className="font-medium">{request.appName}</span>{" "}
                    <span className="text-muted-foreground">
                      wants to {request.operation === "read" ? "read" : "save"}
                    </span>
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {request.categories.map(category => (
                      <CategoryBadge key={category} category={category} />
                    ))}
                    <span className="text-xs text-muted-foreground">
                      {SENSITIVITY_CAP_LABELS[request.maxSensitivity].toLowerCase()}
                    </span>
                  </div>
                  <blockquote className="max-w-prose border-l-2 border-key/60 pl-3 text-sm whitespace-pre-wrap">
                    {request.reason}
                  </blockquote>
                  <span className="text-xs text-muted-foreground">
                    Asked <LocalDateTime value={request.createdAt} />
                  </span>
                </div>
              </div>
              <ConsentRequestActions
                request={{
                  id: request.id,
                  appName: request.appName,
                  operation: request.operation,
                  categories: request.categories,
                  maxSensitivity: request.maxSensitivity,
                }}
                currentCaps={currentCaps}
                sources={sourceOptions}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
