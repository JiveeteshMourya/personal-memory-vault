import type { Metadata } from "next";
import { Suspense } from "react";

import { Overview, OverviewSkeleton } from "@/app/(dashboard)/dashboard/_components/overview";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Overview" };

// The header is static; the overview reads the session, so it streams in.
export default function OverviewPage() {
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
