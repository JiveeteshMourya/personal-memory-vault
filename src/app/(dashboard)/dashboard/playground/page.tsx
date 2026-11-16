import type { Metadata } from "next";

import { PlaygroundContent } from "@/client/features/playground/playground-content";

export const metadata: Metadata = { title: "Playground" };

export default function PlaygroundPage() {
  return <PlaygroundContent />;
}
