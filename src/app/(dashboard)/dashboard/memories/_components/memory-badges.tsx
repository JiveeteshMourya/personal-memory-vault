import { BlocksIcon, LockIcon, UserIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { MemorySource } from "@/data/memories";
import {
  CATEGORY_LABELS,
  SENSITIVITY_LABELS,
  type MemoryCategory,
  type Sensitivity,
} from "@/lib/memory-taxonomy";

export function CategoryBadge({ category }: { category: MemoryCategory }) {
  return <Badge variant="outline">{CATEGORY_LABELS[category]}</Badge>;
}

// Each level leans further into the withheld slate: the more sensitive, the less apps see it.
const sensitivityStyles: Record<Sensitivity, string> = {
  low: "text-muted-foreground",
  moderate: "border-transparent bg-secondary text-secondary-foreground",
  high: "border-transparent bg-withheld/15 text-foreground dark:bg-withheld/70",
  restricted: "border-transparent bg-withheld text-withheld-foreground",
};

export function SensitivityBadge({ sensitivity }: { sensitivity: Sensitivity }) {
  return (
    <Badge variant="outline" className={sensitivityStyles[sensitivity]}>
      {sensitivity === "restricted" && <LockIcon data-icon="inline-start" />}
      {SENSITIVITY_LABELS[sensitivity]}
    </Badge>
  );
}

export function SourceLabel({ source }: { source: MemorySource }) {
  const Icon = source.type === "app" ? BlocksIcon : UserIcon;
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <Icon aria-hidden="true" className="size-3.5" />
      {source.type === "app" ? "App" : "You"}
    </span>
  );
}
