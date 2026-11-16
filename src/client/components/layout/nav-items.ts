import {
  ArchiveIcon,
  BlocksIcon,
  FlaskConicalIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  ScrollTextIcon,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

// The dashboard's sections, in sidebar order. Feature phases add their entry here.
export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboardIcon },
  { href: "/dashboard/memories", label: "Memories", icon: ArchiveIcon },
  { href: "/dashboard/apps", label: "Apps", icon: BlocksIcon },
  { href: "/dashboard/permissions", label: "Permissions", icon: KeyRoundIcon },
  { href: "/dashboard/access-log", label: "Access log", icon: ScrollTextIcon },
  { href: "/dashboard/playground", label: "Playground", icon: FlaskConicalIcon },
];
