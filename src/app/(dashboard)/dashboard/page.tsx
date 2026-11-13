import { LayoutDashboardIcon } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Overview" };

export default function OverviewPage() {
  return (
    <>
      <PageHeader
        title="Overview"
        description="What your vault holds, which apps can use it, and what they asked for lately."
      />
      <EmptyState
        icon={LayoutDashboardIcon}
        title="Your vault is empty"
        description="Once an app is connected and saves memories, a summary of what’s stored and shared shows up here."
      />
    </>
  );
}
