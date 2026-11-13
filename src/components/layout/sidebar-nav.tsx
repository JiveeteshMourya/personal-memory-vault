"use client";

import { usePathname } from "next/navigation";

import { navItems } from "@/components/layout/nav-items";
import { NavList } from "@/components/layout/nav-list";

// The active section is the longest nav href that is the current path or one of its parents,
// so `/dashboard/memories/abc` highlights Memories and only `/dashboard` itself highlights Overview.
function findActiveHref(pathname: string) {
  return navItems
    .map(item => item.href)
    .filter(href => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return <NavList activeHref={findActiveHref(pathname)} onNavigate={onNavigate} />;
}
