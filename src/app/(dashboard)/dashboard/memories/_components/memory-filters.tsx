"use client";

import { XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MemoryFilters as Filters } from "@/data/memories";
import {
  CATEGORY_LABELS,
  MEMORY_CATEGORIES,
  SENSITIVITY_LABELS,
  SENSITIVITY_LEVELS,
} from "@/lib/memory-taxonomy";

type ListFilters = Omit<Filters, "page">;

const categoryItems = [
  { value: null, label: "All categories" },
  ...MEMORY_CATEGORIES.map(value => ({ value, label: CATEGORY_LABELS[value] })),
];
const sensitivityItems = [
  { value: null, label: "Any sensitivity" },
  ...SENSITIVITY_LEVELS.map(value => ({ value, label: SENSITIVITY_LABELS[value] })),
];
const sourceItems = [
  { value: null, label: "Any source" },
  { value: "user", label: "Added by you" },
  { value: "app", label: "From apps" },
] as const;

/** Writes the filters to the URL; the server list reads them back. Changing one resets the page. */
export function MemoryFilters({ filters }: { filters: ListFilters }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Show the new choice right away, while the filtered list loads.
  const [current, setCurrent] = useOptimistic(filters);

  function apply(next: ListFilters) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
    }
    const query = params.toString();
    startTransition(() => {
      setCurrent(next);
      router.replace(query ? `/dashboard/memories?${query}` : "/dashboard/memories", {
        scroll: false,
      });
    });
  }

  const hasFilters = Boolean(current.category || current.sensitivity || current.source);

  return (
    <div
      data-pending={pending || undefined}
      className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
    >
      <Select
        items={categoryItems}
        value={current.category ?? null}
        onValueChange={category => apply({ ...current, category: category ?? undefined })}
      >
        <SelectTrigger aria-label="Category" className="w-full sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {categoryItems.map(item => (
              <SelectItem key={item.value ?? "all"} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Select
        items={sensitivityItems}
        value={current.sensitivity ?? null}
        onValueChange={sensitivity => apply({ ...current, sensitivity: sensitivity ?? undefined })}
      >
        <SelectTrigger aria-label="Sensitivity" className="w-full sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {sensitivityItems.map(item => (
              <SelectItem key={item.value ?? "all"} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Select
        items={sourceItems}
        value={current.source ?? null}
        onValueChange={source => apply({ ...current, source: source ?? undefined })}
      >
        <SelectTrigger aria-label="Source" className="w-full sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {sourceItems.map(item => (
              <SelectItem key={item.value ?? "all"} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" onClick={() => apply({})}>
          <XIcon data-icon="inline-start" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
