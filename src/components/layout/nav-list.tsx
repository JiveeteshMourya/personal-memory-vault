import Link from "next/link";

import { navItems } from "@/components/layout/nav-items";

// Renders on the server (as the sidebar's Suspense fallback, with no active item) and on the
// client (inside `SidebarNav`, which knows the current path).
export function NavList({
  activeHref,
  onNavigate,
}: {
  activeHref?: string;
  onNavigate?: () => void;
}) {
  return (
    <ul className="flex flex-col gap-0.5">
      {navItems.map(({ href, label, icon: Icon }) => (
        <li key={href}>
          <Link
            href={href}
            onClick={onNavigate}
            aria-current={href === activeHref ? "page" : undefined}
            className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/75 transition-colors outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-sidebar-ring/50 aria-[current=page]:bg-sidebar-accent aria-[current=page]:text-sidebar-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0 aria-[current=page]:[&_svg]:text-sidebar-primary"
          >
            <Icon aria-hidden="true" />
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
