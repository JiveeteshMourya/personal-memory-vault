import { KeyRoundIcon } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Permissions" };

export default function PermissionsPage() {
  return (
    <>
      <PageHeader
        title="Permissions"
        description="Which topics each app may read, and for what purpose."
      />
      <EmptyState
        icon={KeyRoundIcon}
        title="No app can read your memories"
        description="Every app starts with no read access. The rules you grant each app will be listed here, and you can revoke them at any time."
      />
    </>
  );
}
