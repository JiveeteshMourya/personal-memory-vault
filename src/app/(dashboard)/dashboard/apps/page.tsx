import { BlocksIcon } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Apps" };

export default function AppsPage() {
  return (
    <>
      <PageHeader
        title="Apps"
        description="The apps connected to your vault and the keys they use to reach it."
      />
      <EmptyState
        icon={BlocksIcon}
        title="No connected apps"
        description="Connect an app to let it save memories. Connecting doesn’t let it read anything."
      />
    </>
  );
}
