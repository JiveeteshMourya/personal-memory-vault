import { Suspense } from "react";

import { PageHeader } from "@/client/components/layout/page-header";
import { MemoryList, MemoryListSkeleton } from "@/client/features/memories/memory-list";
import { NewMemoryButton } from "@/client/features/memories/new-memory-button";

// The header is static; the list reads the session and the URL's filters, so it streams in.
export function MemoriesContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <>
      <PageHeader
        title="Memories"
        description="What you and your apps have saved about you, encrypted and sorted by topic."
        actions={<NewMemoryButton />}
      />
      <Suspense fallback={<MemoryListSkeleton />}>
        <MemoryList searchParams={searchParams} />
      </Suspense>
    </>
  );
}
