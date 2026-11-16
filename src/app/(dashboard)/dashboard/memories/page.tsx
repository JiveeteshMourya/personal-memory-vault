import type { Metadata } from "next";

import { MemoriesContent } from "@/client/features/memories/memories-content";

export const metadata: Metadata = { title: "Memories" };

export default function MemoriesPage({ searchParams }: PageProps<"/dashboard/memories">) {
  return <MemoriesContent searchParams={searchParams} />;
}
