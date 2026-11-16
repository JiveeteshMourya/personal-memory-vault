import type { Metadata } from "next";

import { OverviewContent } from "@/client/features/overview/overview-content";

export const metadata: Metadata = { title: "Overview" };

export default function OverviewPage() {
  return <OverviewContent />;
}
