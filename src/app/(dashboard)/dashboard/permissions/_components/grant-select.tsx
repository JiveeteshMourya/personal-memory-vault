"use client";

import { useOptimistic, useTransition } from "react";

import { setGrantAction, type GrantChange } from "@/app/(dashboard)/dashboard/permissions/actions";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import {
  CATEGORY_LABELS,
  SENSITIVITY_DESCRIPTIONS,
  SENSITIVITY_TIERS,
  type Sensitivity,
} from "@/lib/memory-taxonomy";

// A cap allows its own tier and every tier below it.
const CAP_LABELS: Record<Sensitivity, string> = {
  shareable: "Shareable only",
  personal: "Up to personal",
  private: "Up to private",
  protected: "Up to protected",
};

const items = [
  { value: null, label: "No access" },
  ...SENSITIVITY_TIERS.map(tier => ({ value: tier, label: CAP_LABELS[tier] })),
];

/** One cell of the permissions matrix: no access, or a tier cap. Saves as soon as it changes. */
export function GrantSelect({
  appId,
  operation,
  category,
  label,
  value,
}: Omit<GrantChange, "maxSensitivity"> & { label: string; value: Sensitivity | null }) {
  const [current, setCurrent] = useOptimistic(value);
  const [, startTransition] = useTransition();

  function change(next: Sensitivity | null) {
    startTransition(async () => {
      setCurrent(next);
      const { ok } = await setGrantAction({ appId, operation, category, maxSensitivity: next });
      if (!ok) toast.add({ title: "Couldn’t save that change. Try again.", type: "error" });
    });
  }

  return (
    <div className="flex flex-col gap-1">
      {/* The column headings are hidden on small screens, so each select names its column. */}
      <span aria-hidden="true" className="text-xs text-muted-foreground sm:hidden">
        {label}
      </span>
      <Select items={items} value={current} onValueChange={next => change(next)}>
        <SelectTrigger aria-label={`${label}: ${CATEGORY_LABELS[category]}`} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map(item => (
              <SelectItem key={item.value ?? "none"} value={item.value}>
                <span className="flex flex-col gap-0.5 py-0.5 whitespace-normal">
                  <span>{item.label}</span>
                  <span className="max-w-64 text-xs text-muted-foreground">
                    {item.value
                      ? SENSITIVITY_DESCRIPTIONS[item.value]
                      : "Nothing in this topic, at any tier."}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
