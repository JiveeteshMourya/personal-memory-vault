import { FlaskConicalIcon } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Playground" };

export default function PlaygroundPage() {
  return (
    <>
      <PageHeader
        title="Playground"
        description="Send a test request as one of your apps and see what the vault would return."
      />
      <EmptyState
        icon={FlaskConicalIcon}
        title="Nothing to test yet"
        description="Connect an app and give it a permission first. Then you can try its requests here without affecting anything."
      />
    </>
  );
}
