import Link from "next/link";
import { Suspense } from "react";

import { MobileNav } from "@/components/layout/mobile-nav";
import { NavList } from "@/components/layout/nav-list";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

// Dashboard chrome: a sidebar from `md` up, a drawer below it, and a header with the theme
// toggle and the user menu. Pages render inside <main> and start with a `PageHeader`.
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh">
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 items-center px-5">
          <Link
            href="/"
            className="rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Logo />
          </Link>
        </div>
        <nav aria-label="Dashboard" className="flex-1 overflow-y-auto px-3 py-2">
          {/* usePathname suspends under Cache Components when a page below has an unknown
              dynamic param; the fallback keeps the sidebar in the static shell. */}
          <Suspense fallback={<NavList />}>
            <SidebarNav />
          </Suspense>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur sm:px-6">
          <MobileNav />
          <Link
            href="/"
            className="rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:hidden"
          >
            <Logo />
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main id="main" className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
