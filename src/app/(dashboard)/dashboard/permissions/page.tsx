import type { Metadata } from "next";
import { Suspense } from "react";

import { ConsentRequests } from "@/app/(dashboard)/dashboard/permissions/_components/consent-requests";
import {
  PermissionsPanel,
  PermissionsSkeleton,
} from "@/app/(dashboard)/dashboard/permissions/_components/permissions-panel";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Permissions" };

// The header is static. The pending requests and the panel read the session (and the panel the
// chosen app), so they stream in; the requests show nothing until there are some.
export default function PermissionsPage({ searchParams }: PageProps<"/dashboard/permissions">) {
  return (
    <>
      <PageHeader
        title="Permissions"
        description="What each app may read and save, topic by topic, and whose memories it may read. Everything starts switched off."
      />
      <Suspense fallback={null}>
        <ConsentRequests />
      </Suspense>
      <Suspense fallback={<PermissionsSkeleton />}>
        <PermissionsPanel searchParams={searchParams} />
      </Suspense>
    </>
  );
}
