import { Suspense } from "react";

import { PageHeader } from "@/client/components/layout/page-header";
import { ConsentRequests } from "@/client/features/permissions/consent-requests";
import {
  PermissionsPanel,
  PermissionsSkeleton,
} from "@/client/features/permissions/permissions-panel";

// The header is static. The pending requests and the panel read the session (and the panel the
// chosen app), so they stream in; the requests show nothing until there are some.
export function PermissionsContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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
