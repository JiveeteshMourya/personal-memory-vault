import { cn } from "@/lib/utils";

// The vault mark: a verdigris door with a brass keyhole. `src/app/icon.svg` is the same drawing.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-7 shrink-0", className)}>
      <rect x="1" y="1" width="30" height="30" rx="8" className="fill-primary" />
      <rect
        x="5"
        y="5"
        width="22"
        height="22"
        rx="5"
        fill="none"
        strokeWidth="1.5"
        className="stroke-primary-foreground/35"
      />
      <circle cx="16" cy="13.5" r="3.75" className="fill-key" />
      <path d="M14.4 16h3.2l1.15 7.5h-5.5z" className="fill-key" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span translate="no" className="font-heading text-[1.05rem] font-bold tracking-tight">
        Memory Vault
      </span>
    </span>
  );
}
