import { SignOutItem } from "@/client/components/layout/sign-out-item";
import { Button } from "@/client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { Skeleton } from "@/client/components/ui/skeleton";
import { requireUser } from "@/server/middlewares/require-user.middleware";

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map(word => word[0]!.toUpperCase())
    .join("");
}

// The signed-in owner. It reads the session, so the shell renders it behind <Suspense>. Without a
// valid session it redirects to /sign-in, which also catches a stale cookie the proxy let through.
export async function UserMenu() {
  const user = await requireUser();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="lg" className="gap-2 px-1 sm:pr-2.5" />}
      >
        <span
          aria-hidden="true"
          className="flex size-7 items-center justify-center rounded-full bg-primary/12 text-xs font-bold text-primary"
        >
          {initials(user.name)}
        </span>
        <span className="sr-only sm:not-sr-only sm:max-w-40 sm:truncate">{user.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 py-1.5">
            <span className="truncate text-sm font-medium text-foreground">{user.name}</span>
            <span className="truncate font-normal">{user.email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <SignOutItem />
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function UserMenuSkeleton() {
  return <Skeleton className="h-9 w-9 rounded-lg sm:w-32" />;
}
