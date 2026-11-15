"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Picks whose permissions to show. The choice lives in the URL (`?app=`), read on the server. */
export function AppPicker({
  apps,
  selectedId,
}: {
  apps: { id: string; name: string }[];
  selectedId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Show the new choice right away, while its permissions load.
  const [current, setCurrent] = useOptimistic(selectedId);
  const items = apps.map(app => ({ value: app.id, label: app.name }));

  function pick(id: string | null) {
    if (!id) return;
    startTransition(() => {
      setCurrent(id);
      router.replace(`/dashboard/permissions?app=${id}`, { scroll: false });
    });
  }

  return (
    <div data-pending={pending || undefined} className="w-full sm:w-64">
      <Select items={items} value={current} onValueChange={pick}>
        <SelectTrigger aria-label="App" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map(item => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
