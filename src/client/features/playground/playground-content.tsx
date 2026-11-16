import { Suspense } from "react";

import { PageHeader } from "@/client/components/layout/page-header";
import { PlaygroundPanel, PlaygroundSkeleton } from "@/client/features/playground/playground-panel";

// The header is static; the panel reads the session and the owner's apps, so it streams in.
export function PlaygroundContent() {
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
