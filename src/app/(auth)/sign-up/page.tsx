import type { Metadata } from "next";

import { SignUpContent } from "@/client/features/auth/sign-up-content";

export const metadata: Metadata = { title: "Create your vault" };

export default function SignUpPage() {
  return <SignUpContent />;
}
