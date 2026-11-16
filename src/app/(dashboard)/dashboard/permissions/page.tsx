import type { Metadata } from "next";

import { PermissionsContent } from "@/client/features/permissions/permissions-content";

export const metadata: Metadata = { title: "Permissions" };

export default function PermissionsPage({ searchParams }: PageProps<"/dashboard/permissions">) {
  return <PermissionsContent searchParams={searchParams} />;
}
