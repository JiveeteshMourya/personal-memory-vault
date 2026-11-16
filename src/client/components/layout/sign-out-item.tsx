"use client";

import { LogOutIcon } from "lucide-react";
import { startTransition } from "react";

import { signOut } from "@/client/features/auth/actions";
import { DropdownMenuItem } from "@/client/components/ui/dropdown-menu";

// The menu closes (and unmounts this item) on click; the action and its redirect carry on.
export function SignOutItem() {
  return (
    <DropdownMenuItem onClick={() => startTransition(() => signOut())}>
      <LogOutIcon />
      Sign out
    </DropdownMenuItem>
  );
}
