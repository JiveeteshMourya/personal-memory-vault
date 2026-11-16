import { Suspense } from "react";

import { PageHeader } from "@/client/components/layout/page-header";
import { AppList, AppListSkeleton } from "@/client/features/apps/app-list";
import { RegisterAppButton } from "@/client/features/apps/register-app-button";

// The header is static; the list reads the session, so it streams in.
export function AppsContent() {
  return (
    <>
      <PageHeader
        title="Apps"
        description="The apps that reach your vault, each with its own key. A key proves who an app is; what it may read or save is up to you."
        actions={<RegisterAppButton />}
      />
      <Suspense fallback={<AppListSkeleton />}>
        <AppList />
      </Suspense>
    </>
  );
}
