import { ArchiveIcon } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Memories" };

export default function MemoriesPage() {
  return (
    <>
      <PageHeader
        title="Memories"
        description="Everything your apps have saved about you, encrypted and sorted by topic."
      />
      <EmptyState
        icon={ArchiveIcon}
        title="No memories yet"
        description="Memories your connected apps save, and ones you add yourself, will be listed here."
      />
    </>
  );
}
