"use client";

import { startTransition, useActionState, useState } from "react";

import {
  createMemoryAction,
  updateMemoryAction,
  type MemoryFormState,
} from "@/app/(dashboard)/dashboard/memories/actions";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { MemoryDTO } from "@/data/memories";
import {
  CATEGORY_LABELS,
  MEMORY_CATEGORIES,
  SENSITIVITY_DESCRIPTIONS,
  SENSITIVITY_LABELS,
  SENSITIVITY_TIERS,
  type Sensitivity,
} from "@/lib/memory-taxonomy";

// `datetime-local` wants the viewer's wall-clock time, without a timezone.
function toLocalInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

/**
 * Create (no `memory`) or edit form, rendered inside a dialog. It renders only on the client (the
 * dialog mounts it when opened), so the default date is the viewer's local "now".
 */
export function MemoryForm({ memory, onSaved }: { memory?: MemoryDTO; onSaved: () => void }) {
  const [state, dispatch, pending] = useActionState(
    async (previous: MemoryFormState, formData: FormData) => {
      const result = await (memory ? updateMemoryAction : createMemoryAction)(previous, formData);
      if (result?.ok) {
        toast.add({ title: memory ? "Memory updated" : "Memory saved", type: "success" });
        onSaved();
      }
      return result;
    },
    undefined
  );
  const [defaultWhen] = useState(() => toLocalInputValue(memory?.occurredAt ?? new Date()));
  const [sensitivity, setSensitivity] = useState<Sensitivity | null>(memory?.sensitivity ?? null);
  const errors = state?.ok === false ? state.errors : undefined;
  const message = state?.ok === false ? state.message : undefined;

  // Submitting through onSubmit (not `action`) keeps React from resetting the fields, so a
  // validation error never wipes what the owner typed.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    // The local date and time become an instant here, where the viewer's timezone is known.
    const when = new Date(String(formData.get("occurredAt")));
    formData.set("occurredAt", Number.isNaN(when.getTime()) ? "" : when.toISOString());
    startTransition(() => dispatch(formData));
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {memory && <input type="hidden" name="id" value={memory.id} />}
      <FieldGroup>
        {message && (
          <p role="alert" className="text-sm text-destructive">
            {message}
          </p>
        )}
        <Field data-invalid={!!errors?.content}>
          <FieldLabel htmlFor="memory-content">Memory</FieldLabel>
          <Textarea
            id="memory-content"
            name="content"
            rows={4}
            defaultValue={memory?.content}
            placeholder="Slept badly after an espresso at 6pm."
            aria-invalid={!!errors?.content}
            aria-describedby={errors?.content ? "memory-content-error" : undefined}
          />
          <FieldError
            id="memory-content-error"
            errors={errors?.content?.map(message => ({ message }))}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={!!errors?.category}>
            <FieldLabel htmlFor="memory-category">Category</FieldLabel>
            <Select name="category" items={CATEGORY_LABELS} defaultValue={memory?.category ?? null}>
              <SelectTrigger
                id="memory-category"
                className="w-full"
                aria-invalid={!!errors?.category}
                aria-describedby={errors?.category ? "memory-category-error" : undefined}
              >
                <SelectValue placeholder="Pick a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {MEMORY_CATEGORIES.map(category => (
                    <SelectItem key={category} value={category}>
                      {CATEGORY_LABELS[category]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldError
              id="memory-category-error"
              errors={errors?.category?.map(message => ({ message }))}
            />
          </Field>

          <Field data-invalid={!!errors?.sensitivity}>
            <FieldLabel htmlFor="memory-sensitivity">Sensitivity</FieldLabel>
            <Select
              name="sensitivity"
              items={SENSITIVITY_LABELS}
              value={sensitivity}
              onValueChange={value => setSensitivity(value as Sensitivity | null)}
            >
              <SelectTrigger
                id="memory-sensitivity"
                className="w-full"
                aria-invalid={!!errors?.sensitivity}
                aria-describedby={
                  errors?.sensitivity ? "memory-sensitivity-error" : "memory-sensitivity-hint"
                }
              >
                <SelectValue placeholder="Pick a sensitivity" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {SENSITIVITY_TIERS.map(tier => (
                    <SelectItem key={tier} value={tier}>
                      {SENSITIVITY_LABELS[tier]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {errors?.sensitivity ? (
              <FieldError
                id="memory-sensitivity-error"
                errors={errors.sensitivity.map(message => ({ message }))}
              />
            ) : (
              <FieldDescription id="memory-sensitivity-hint">
                {sensitivity
                  ? SENSITIVITY_DESCRIPTIONS[sensitivity]
                  : "How much harm it would do if it leaked."}
              </FieldDescription>
            )}
          </Field>
        </div>

        <Field data-invalid={!!errors?.occurredAt}>
          <FieldLabel htmlFor="memory-occurred-at">When it happened</FieldLabel>
          <Input
            id="memory-occurred-at"
            name="occurredAt"
            type="datetime-local"
            defaultValue={defaultWhen}
            aria-invalid={!!errors?.occurredAt}
            aria-describedby={errors?.occurredAt ? "memory-occurred-at-error" : undefined}
          />
          <FieldError
            id="memory-occurred-at-error"
            errors={errors?.occurredAt?.map(message => ({ message }))}
          />
        </Field>
      </FieldGroup>

      <DialogFooter className="mt-6">
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save memory"}
        </Button>
      </DialogFooter>
    </form>
  );
}
