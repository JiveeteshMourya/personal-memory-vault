import type { Metadata } from "next";
import { Suspense } from "react";

import {
  AccessLogList,
  AccessLogSkeleton,
} from "@/app/(dashboard)/dashboard/access-log/_components/access-log-list";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Access log" };

// The header is static; the list reads the session and the page in the URL, so it streams in.
export default function AccessLogPage({ searchParams }: PageProps<"/dashboard/access-log">) {
  return (
    <>
      <PageHeader
        title="Access log"
        description="Every time an app saved to or asked your vault, and what it got back."
      />
      <Suspense fallback={<AccessLogSkeleton />}>
        <AccessLogList searchParams={searchParams} />
      </Suspense>
    </>
  );
}
