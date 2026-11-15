import type { Metadata } from "next";
import { Suspense } from "react";

import {
  MemoryList,
  MemoryListSkeleton,
} from "@/app/(dashboard)/dashboard/memories/_components/memory-list";
import { NewMemoryButton } from "@/app/(dashboard)/dashboard/memories/_components/new-memory-button";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Memories" };

// The header is static; the list reads the session and the URL's filters, so it streams in.
export default function MemoriesPage({ searchParams }: PageProps<"/dashboard/memories">) {
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
