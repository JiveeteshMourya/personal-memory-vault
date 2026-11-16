import type { Metadata } from "next";

import { AccessLogContent } from "@/client/features/access-log/access-log-content";

export const metadata: Metadata = { title: "Access log" };

export default function AccessLogPage({ searchParams }: PageProps<"/dashboard/access-log">) {
  return <AccessLogContent searchParams={searchParams} />;
}
