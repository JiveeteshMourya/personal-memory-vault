import { BlocksIcon } from "lucide-react";

import { AppRowActions } from "@/client/features/apps/app-row-actions";
import { RegisterAppButton } from "@/client/features/apps/register-app-button";
import { AppMonogram } from "@/client/components/app-monogram";
import { EmptyState } from "@/client/components/layout/empty-state";
import { LocalDateTime } from "@/client/components/local-date-time";
import { Badge } from "@/client/components/ui/badge";
import { Skeleton } from "@/client/components/ui/skeleton";
import { requireUser } from "@/server/middlewares/require-user.middleware";
import { listApps } from "@/server/services/app.service";

/** The owner's connected apps and their key status. Reads the session, so it renders behind <Suspense>. */
export async function AppList() {
  const user = await requireUser();
  const apps = await listApps(user.id);

  if (apps.length === 0) {
    return (
      <EmptyState
        icon={BlocksIcon}
        title="No connected apps"
        description="Register an app to give it a key. A key only proves who the app is: it can’t read or save anything until you grant access in Permissions."
        action={<RegisterAppButton />}
      />
    );
  }

  return (
    <ul className="divide-y rounded-xl border bg-card">
      {apps.map(app => (
        <li key={app.id} className="flex items-start gap-3 p-4">
          <AppMonogram name={app.name} />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-col gap-0.5">
              <h2 className="truncate font-medium">{app.name}</h2>
              {app.description && (
                <p className="line-clamp-2 max-w-prose text-sm text-muted-foreground">
                  {app.description}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              {app.activeKey ? (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <Badge variant="secondary">Active key</Badge>
                    <code className="font-mono text-foreground">{app.activeKey.prefix}…</code>
                  </span>
                  <span>
                    Last used{" "}
                    {app.activeKey.lastUsedAt ? (
                      <LocalDateTime value={app.activeKey.lastUsedAt} />
                    ) : (
                      "never"
                    )}
                  </span>
                </>
              ) : (
                <Badge variant="outline">No active key</Badge>
              )}
              <span>
                Added <LocalDateTime value={app.createdAt} />
              </span>
            </div>
          </div>
          <AppRowActions
            appId={app.id}
            appName={app.name}
            activeKeyId={app.activeKey?.id ?? null}
          />
        </li>
      ))}
    </ul>
  );
}

export function AppListSkeleton() {
  return (
    <div className="flex flex-col divide-y rounded-xl border bg-card" aria-hidden="true">
      {[0, 1, 2].map(i => (
        <div key={i} className="flex items-start gap-3 p-4">
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64 max-w-full" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
