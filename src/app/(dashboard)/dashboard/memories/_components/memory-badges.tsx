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

// Each tier leans further into the withheld slate: the more harm a leak does, the less apps see it.
const sensitivityStyles: Record<Sensitivity, string> = {
  shareable: "text-muted-foreground",
  personal: "border-transparent bg-secondary text-secondary-foreground",
  private: "border-transparent bg-withheld/15 text-foreground dark:bg-withheld/70",
  protected: "border-transparent bg-withheld text-withheld-foreground",
};

export function SensitivityBadge({ sensitivity }: { sensitivity: Sensitivity }) {
  return (
    <Badge variant="outline" className={sensitivityStyles[sensitivity]}>
      {sensitivity === "protected" && <LockIcon data-icon="inline-start" />}
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
