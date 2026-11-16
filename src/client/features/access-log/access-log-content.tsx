import { Suspense } from "react";

import { PageHeader } from "@/client/components/layout/page-header";
import { AccessLogList, AccessLogSkeleton } from "@/client/features/access-log/access-log-list";

// The header is static; the list reads the session and the page in the URL, so it streams in.
export function AccessLogContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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
