import Link from "next/link";
import { Suspense } from "react";

import { RedirectIfSignedIn } from "@/client/features/auth/redirect-if-signed-in";
import { Logo } from "@/client/components/logo";
import { ThemeToggle } from "@/client/components/theme-toggle";

// Sign-in and sign-up: the brand, the theme toggle and one centered card. The proxy only guards
// /dashboard; sending signed-in owners away from these pages needs a real session check (a stale
// cookie would otherwise bounce between here and /dashboard), so it streams in behind Suspense.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4 sm:px-6">
        <Link
          href="/"
          className="rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo />
        </Link>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 pt-10 pb-20 sm:pt-20">
        <div className="w-full max-w-sm">{children}</div>
      </main>
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
    </>
  );
}
