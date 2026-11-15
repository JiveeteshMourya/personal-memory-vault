import type { Metadata } from "next";
import { Suspense } from "react";

import {
  PermissionsPanel,
  PermissionsSkeleton,
} from "@/app/(dashboard)/dashboard/permissions/_components/permissions-panel";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Permissions" };

// The header is static; the panel reads the session and the chosen app, so it streams in.
export default function PermissionsPage({ searchParams }: PageProps<"/dashboard/permissions">) {
  return (
    <>
      <PageHeader
        title="Permissions"
        description="What each app may read and save, topic by topic, and whose memories it may read. Everything starts switched off."
      />
      <Suspense fallback={<PermissionsSkeleton />}>
        <PermissionsPanel searchParams={searchParams} />
      </Suspense>
    </>
  );
}
