import type { Metadata } from "next";

import { SignInContent } from "@/client/features/auth/sign-in-content";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return <SignInContent />;
}
