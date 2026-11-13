"use client";

import { MenuIcon } from "lucide-react";
import { useState } from "react";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Below `md` the sidebar becomes this drawer. It closes when a section is picked.
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon-lg" className="md:hidden" aria-label="Open menu" />
        }
      >
        <MenuIcon />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 overscroll-contain">
        <SheetHeader>
          <SheetTitle>
            <Logo />
          </SheetTitle>
          <SheetDescription className="sr-only">Dashboard sections</SheetDescription>
        </SheetHeader>
        <nav aria-label="Dashboard" className="px-3">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
