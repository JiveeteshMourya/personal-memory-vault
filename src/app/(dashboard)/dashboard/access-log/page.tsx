import { ScrollTextIcon } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Access log" };

export default function AccessLogPage() {
  return (
    <>
      <PageHeader
        title="Access log"
        description="Every time an app saved to or asked your vault, and what it got back."
      />
      <EmptyState
        icon={ScrollTextIcon}
        title="No requests yet"
        description="When an app asks for context, you’ll see what it asked, why, and exactly what it received."
      />
    </>
  );
}
