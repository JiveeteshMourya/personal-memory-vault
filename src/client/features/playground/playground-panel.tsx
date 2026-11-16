import { BlocksIcon } from "lucide-react";
import Link from "next/link";

import { PlaygroundForm } from "@/client/features/playground/playground-form";
import { EmptyState } from "@/client/components/layout/empty-state";
import { Button } from "@/client/components/ui/button";
import { Skeleton } from "@/client/components/ui/skeleton";
import { requireUser } from "@/server/middlewares/require-user.middleware";
import { listApps } from "@/server/services/app.service";

/** The Playground for the owner's apps. Reads the session, so it renders behind <Suspense>. */
export async function PlaygroundPanel() {
  const user = await requireUser();
  const apps = await listApps(user.id);

  if (apps.length === 0) {
    return (
      <EmptyState
        icon={BlocksIcon}
        title="Nothing to test yet"
        description="Connect an app and give it a read permission and a source first. Then you can try its requests here."
        action={
          <Button variant="outline" render={<Link href="/dashboard/apps" />} nativeButton={false}>
            Go to Apps
          </Button>
        }
      />
    );
  }

  return <PlaygroundForm apps={apps.map(({ id, name }) => ({ id, name }))} />;
}

export function PlaygroundSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]" aria-hidden="true">
      <div className="flex flex-col gap-5 rounded-xl border bg-card p-4">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="min-h-48 rounded-xl" />
    </div>
  );
}
