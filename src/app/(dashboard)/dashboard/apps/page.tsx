import type { Metadata } from "next";
import { Suspense } from "react";

import { AppList, AppListSkeleton } from "@/app/(dashboard)/dashboard/apps/_components/app-list";
import { RegisterAppButton } from "@/app/(dashboard)/dashboard/apps/_components/register-app-button";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Apps" };

// The header is static; the list reads the session, so it streams in.
export default function AppsPage() {
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
