import type { Metadata } from "next";

import { AppsContent } from "@/client/features/apps/apps-content";

export const metadata: Metadata = { title: "Apps" };

export default function AppsPage() {
  return <AppsContent />;
}
