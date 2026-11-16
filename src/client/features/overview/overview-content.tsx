import { Suspense } from "react";

import { PageHeader } from "@/client/components/layout/page-header";
import { Overview, OverviewSkeleton } from "@/client/features/overview/overview";

// The header is static; the overview reads the session, so it streams in.
export function OverviewContent() {
  return (
    <>
      <PageHeader
        title="Overview"
        description="What your vault holds, which apps can use it, and what they asked for lately."
      />
      <Suspense fallback={<OverviewSkeleton />}>
        <Overview />
      </Suspense>
    </>
  );
}
