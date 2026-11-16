import type { Metadata } from "next";
import { Suspense } from "react";

import {
  PlaygroundPanel,
  PlaygroundSkeleton,
} from "@/app/(dashboard)/dashboard/playground/_components/playground-panel";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Playground" };

// The header is static; the panel reads the session and the owner's apps, so it streams in.
export default function PlaygroundPage() {
  return (
    <>
      <PageHeader
        title="Playground"
        description="Ask your vault something as one of your apps, and see exactly what that app would get back and which memories it came from."
      />
      <Suspense fallback={<PlaygroundSkeleton />}>
        <PlaygroundPanel />
      </Suspense>
    </>
  );
}
