import { BlocksIcon, LockIcon, UserIcon } from "lucide-react";
import type { ReactNode } from "react";

import { LocalDateTime } from "@/client/components/local-date-time";
import { Badge } from "@/client/components/ui/badge";
import type { MemoryDTO, MemorySource } from "@/shared/types/memory.types";
import {
  CATEGORY_LABELS,
  PROVENANCE_LABELS,
  SENSITIVITY_LABELS,
  type MemoryCategory,
  type Sensitivity,
} from "@/shared/constants/memory-taxonomy";

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

const SHOWN_TAGS = 4;

/**
 * One muted line with what an app told the vault about a memory: how it was learned, low
 * confidence, app-only visibility, expiry and tags. Renders nothing for a plain owner entry.
 */
export function MemoryMeta({ memory }: { memory: MemoryDTO }) {
  const items: { key: string; node: ReactNode }[] = [];
  if (memory.source.type === "app") {
    items.push({ key: "provenance", node: PROVENANCE_LABELS[memory.provenance] });
  }
  if (memory.confidence < 0.7) {
    items.push({ key: "confidence", node: `${Math.round(memory.confidence * 100)}% confident` });
  }
  if (memory.visibility === "app_private") {
    items.push({ key: "visibility", node: "Only its app can read it" });
  }
  if (memory.expiresAt) {
    items.push({
      key: "expires",
      node: (
        <>
          Expires <LocalDateTime value={memory.expiresAt} />
        </>
      ),
    });
  }
  if (memory.tags.length > 0) {
    items.push({
      key: "tags",
      node: memory.tags
        .slice(0, SHOWN_TAGS)
        .map(tag => `#${tag}`)
        .join(" "),
    });
  }
  if (items.length === 0) return null;

  return (
    <p className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
      {items.map(({ key, node }, i) => (
        <span key={key}>
          {i > 0 && (
            <span aria-hidden="true" className="mr-2">
              ·
            </span>
          )}
          {node}
        </span>
      ))}
    </p>
  );
}

/** Who wrote a memory. Pass `appName` to name the writing app instead of saying "App". */
export function SourceLabel({ source, appName }: { source: MemorySource; appName?: string }) {
  const Icon = source.type === "app" ? BlocksIcon : UserIcon;
  const label =
    source.type === "user" ? "You" : source.appId === null ? "Deleted app" : (appName ?? "App");
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <Icon aria-hidden="true" className="size-3.5" />
      {label}
    </span>
  );
}
