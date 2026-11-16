"use client";

import { useOptimistic, useTransition } from "react";

import { setSourceAccessAction, type SourceChange } from "@/client/features/permissions/actions";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/client/components/ui/field";
import { Switch } from "@/client/components/ui/switch";
import { toast } from "@/client/components/ui/toast";

/** A source an app may read from: "user" (the owner's own entries) or an app id. */
export type SourceOption = { source: SourceChange["source"]; label: string; description: string };

/** The "Reads data from" list. Each switch saves as soon as it flips. */
export function SourceSwitches({
  appId,
  options,
  allowed,
}: {
  appId: string;
  options: SourceOption[];
  allowed: SourceChange["source"][];
}) {
  return (
    <ul className="divide-y rounded-xl border bg-card">
      {options.map(option => (
        <SourceSwitch
          key={option.source}
          appId={appId}
          option={option}
          allowed={allowed.includes(option.source)}
        />
      ))}
    </ul>
  );
}

function SourceSwitch({
  appId,
  option,
  allowed,
}: {
  appId: string;
  option: SourceOption;
  allowed: boolean;
}) {
  const [checked, setChecked] = useOptimistic(allowed);
  const [, startTransition] = useTransition();
  const id = `source-${option.source}`;

  function toggle(next: boolean) {
    startTransition(async () => {
      setChecked(next);
      const { ok } = await setSourceAccessAction({ appId, source: option.source, allowed: next });
      if (!ok) toast.add({ title: "Couldn’t save that change. Try again.", type: "error" });
    });
  }

  return (
    <li className="p-4">
      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor={id}>{option.label}</FieldLabel>
          <FieldDescription>{option.description}</FieldDescription>
        </FieldContent>
        <Switch id={id} checked={checked} onCheckedChange={toggle} />
      </Field>
    </li>
  );
}
