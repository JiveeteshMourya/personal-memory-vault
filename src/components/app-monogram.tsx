import { cn } from "cn";

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map(word => word[0]!.toUpperCase())
    .join("");
}

/** A connected app's avatar: its initials on a tinted square. Decorative, so its name must be shown too. */
export function AppMonogram({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-sm font-bold text-primary",
        className
      )}
    >
      {initials(name)}
    </span>
  );
}
