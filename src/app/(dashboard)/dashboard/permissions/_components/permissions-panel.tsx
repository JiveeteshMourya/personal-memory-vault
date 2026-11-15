import { BlocksIcon } from "lucide-react";
import Link from "next/link";
import { z } from "zod";

import { AppPicker } from "@/app/(dashboard)/dashboard/permissions/_components/app-picker";
import { GrantSelect } from "@/app/(dashboard)/dashboard/permissions/_components/grant-select";
import { RevokeAllButton } from "@/app/(dashboard)/dashboard/permissions/_components/revoke-all-button";
import {
  SourceSwitches,
  type SourceOption,
} from "@/app/(dashboard)/dashboard/permissions/_components/source-switches";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listApps } from "@/data/apps";
import { getAppPermissions } from "@/data/grants";
import { CATEGORY_DESCRIPTIONS, CATEGORY_LABELS, MEMORY_CATEGORIES } from "@/lib/memory-taxonomy";

// An unknown or foreign app id falls back to the first app: the URL is user-editable.
const searchSchema = z.object({ app: z.uuid().optional().catch(undefined) });

const COLUMNS = "sm:grid-cols-[minmax(0,1fr)_11rem_11rem]";

/** One app's grants and sources. Reads the session and the URL, so it renders behind <Suspense>. */
export async function PermissionsPanel({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { app: requestedId } = searchSchema.parse(await searchParams);
  const apps = await listApps();

  if (apps.length === 0) {
    return (
      <EmptyState
        icon={BlocksIcon}
        title="No connected apps"
        description="Register an app first. Every app starts with no access: it can’t save or read anything until you allow it here."
        action={
          <Button variant="outline" render={<Link href="/dashboard/apps" />} nativeButton={false}>
            Go to Apps
          </Button>
        }
      />
    );
  }

  const app = apps.find(candidate => candidate.id === requestedId) ?? apps[0]!;
  const { grants, sources } = await getAppPermissions(app.id);
  const caps = new Map(grants.map(grant => [`${grant.operation}:${grant.category}`, grant]));
  const allowed = sources.map(source => (source.type === "user" ? "user" : source.appId));
  const readsAnything = grants.some(grant => grant.operation === "read");

  const options: SourceOption[] = [
    { source: "user", label: "Your entries", description: "Memories you added yourself." },
    {
      source: app.id,
      label: `${app.name} (this app)`,
      description: "What this app saved itself.",
    },
    ...apps
      .filter(other => other.id !== app.id)
      .map(other => ({
        source: other.id,
        label: other.name,
        description: "What this app saved.",
      })),
  ];

  return (
    <div className="group/permissions flex flex-col gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AppPicker apps={apps.map(({ id, name }) => ({ id, name }))} selectedId={app.id} />
        <RevokeAllButton
          appId={app.id}
          appName={app.name}
          disabled={grants.length === 0 && sources.length === 0}
        />
      </div>

      {/* Keyed by app, so switching apps never carries a pending change over. */}
      <div
        key={app.id}
        className="flex flex-col gap-8 transition-opacity group-has-data-pending/permissions:opacity-60"
      >
        <section aria-labelledby="topics-heading" className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="topics-heading" className="font-medium">
              What {app.name} may read and save
            </h2>
            <p className="max-w-prose text-sm text-muted-foreground">
              Pick the most sensitive tier allowed in each topic. Anything above it, or in a topic
              with no access, is never shown to the app or saved from it.
            </p>
          </div>
          <div className="rounded-xl border bg-card">
            <div
              aria-hidden="true"
              className={`hidden gap-4 border-b px-4 py-2 text-xs font-medium text-muted-foreground sm:grid ${COLUMNS}`}
            >
              <span>Topic</span>
              <span>Read</span>
              <span>Save</span>
            </div>
            <ul className="divide-y">
              {MEMORY_CATEGORIES.map(category => (
                <li key={category} className={`grid gap-3 p-4 sm:items-center sm:gap-4 ${COLUMNS}`}>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-medium">{CATEGORY_LABELS[category]}</span>
                    <span className="text-sm text-muted-foreground">
                      {CATEGORY_DESCRIPTIONS[category]}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:contents">
                    {(["read", "write"] as const).map(operation => (
                      <GrantSelect
                        key={operation}
                        appId={app.id}
                        operation={operation}
                        category={category}
                        label={operation === "read" ? "Read" : "Save"}
                        value={caps.get(`${operation}:${category}`)?.maxSensitivity ?? null}
                      />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="sources-heading" className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="sources-heading" className="font-medium">
              Reads data from
            </h2>
            <p className="max-w-prose text-sm text-muted-foreground">
              Whose memories {app.name} may read, within the topics above. Each source stays off
              until you switch it on, this app’s own saves included.
            </p>
            {readsAnything && allowed.length === 0 && (
              <p className="max-w-prose text-sm font-medium">
                {app.name} may read some topics but has no source yet, so it can’t read anything.
              </p>
            )}
          </div>
          <SourceSwitches appId={app.id} options={options} allowed={allowed} />
        </section>
      </div>
    </div>
  );
}

export function PermissionsSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-hidden="true">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Skeleton className="h-8 w-full sm:w-64" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-4">
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
            <Skeleton className="hidden h-8 w-44 sm:block" />
            <Skeleton className="hidden h-8 w-44 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
