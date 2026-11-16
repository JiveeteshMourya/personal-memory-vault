"use client";

import { useState, useTransition } from "react";

import {
  approveConsentAction,
  denyConsentAction,
  type ConsentApproval,
} from "@/app/(dashboard)/dashboard/permissions/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import type { ConsentRequestDTO } from "@/data/consent";
import {
  CATEGORY_DESCRIPTIONS,
  CATEGORY_LABELS,
  formatCategoryList,
  SENSITIVITY_CAP_LABELS,
  SENSITIVITY_DESCRIPTIONS,
  SENSITIVITY_TIERS,
  sensitivityRank,
  type MemoryCategory,
  type Sensitivity,
} from "@/lib/memory-taxonomy";

/** What the approve dialog needs to know about a request. */
export type PendingRequest = Pick<
  ConsentRequestDTO,
  "id" | "appName" | "operation" | "categories" | "maxSensitivity"
>;

/** A source the app could read from, and whether it already may. */
export type ConsentSourceOption = {
  source: ConsentApproval["sources"][number];
  label: string;
  allowed: boolean;
};

const GONE = {
  title: "This request was already decided, or its app was removed",
  type: "error",
} as const;

/** Deny, or review and approve, one pending request. */
export function ConsentRequestActions({
  request,
  currentCaps,
  sources,
}: {
  request: PendingRequest;
  /** The app's existing caps for the requested operation. */
  currentCaps: Partial<Record<MemoryCategory, Sensitivity>>;
  /** Reads only; empty for a write request. */
  sources: ConsentSourceOption[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function deny() {
    startTransition(async () => {
      const { ok } = await denyConsentAction(request.id);
      toast.add(
        ok
          ? {
              title: `Denied ${request.appName}’s request`,
              description: "Its access is unchanged.",
              type: "success",
            }
          : GONE
      );
    });
  }

  return (
    <div className="flex shrink-0 gap-2">
      <Button variant="outline" onClick={deny} disabled={pending}>
        {pending ? "Denying…" : "Deny"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button disabled={pending} />}>Review</DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <ApproveForm
            request={request}
            currentCaps={currentCaps}
            sources={sources}
            onDone={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * The request, pre-filled, for the owner to approve as asked or narrowed: fewer topics, a lower
 * tier, and (for reads) the sources to allow. It mounts each time the dialog opens, so it always
 * starts from the request.
 */
function ApproveForm({
  request,
  currentCaps,
  sources,
  onDone,
}: {
  request: PendingRequest;
  currentCaps: Partial<Record<MemoryCategory, Sensitivity>>;
  sources: ConsentSourceOption[];
  onDone: () => void;
}) {
  const [categories, setCategories] = useState<MemoryCategory[]>(request.categories);
  const [cap, setCap] = useState<Sensitivity>(request.maxSensitivity);
  const [chosenSources, setChosenSources] = useState<ConsentSourceOption["source"][]>([]);
  const [pending, startTransition] = useTransition();

  const isRead = request.operation === "read";
  const verb = isRead ? "read" : "save";
  // Narrow only: never more than the app asked for.
  const capItems = SENSITIVITY_TIERS.filter(
    tier => sensitivityRank(tier) <= sensitivityRank(request.maxSensitivity)
  ).map(tier => ({ value: tier, label: SENSITIVITY_CAP_LABELS[tier] }));
  const noSourceAfter =
    isRead && chosenSources.length === 0 && sources.every(option => !option.allowed);

  function toggle<T>(list: T[], value: T, on: boolean) {
    return on ? [...list, value] : list.filter(item => item !== value);
  }

  function approve() {
    // In the request's order, which is the taxonomy's.
    const allowed = request.categories.filter(category => categories.includes(category));
    startTransition(async () => {
      const { ok } = await approveConsentAction({
        requestId: request.id,
        categories: allowed,
        maxSensitivity: cap,
        sources: chosenSources,
      });
      onDone();
      toast.add(
        ok
          ? {
              title: `${request.appName} may now ${verb} ${formatCategoryList(allowed)}`,
              description: `${SENSITIVITY_CAP_LABELS[cap]}.`,
              type: "success",
            }
          : GONE
      );
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          Let {request.appName} {verb} {formatCategoryList(request.categories)}?
        </DialogTitle>
        <DialogDescription>
          You can allow less than it asked for. Approving never lowers access it already has.
        </DialogDescription>
      </DialogHeader>

      <div className="flex max-h-[60vh] flex-col gap-6 overflow-y-auto pr-1">
        <FieldSet>
          <FieldLegend variant="label">Topics</FieldLegend>
          <ul className="divide-y rounded-lg border">
            {request.categories.map(category => {
              const id = `consent-${request.id}-${category}`;
              const existing = currentCaps[category];
              return (
                <li key={category} className="p-3">
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldLabel htmlFor={id}>{CATEGORY_LABELS[category]}</FieldLabel>
                      <FieldDescription>
                        {existing
                          ? `Already allowed: ${SENSITIVITY_CAP_LABELS[existing].toLowerCase()}.`
                          : CATEGORY_DESCRIPTIONS[category]}
                      </FieldDescription>
                    </FieldContent>
                    <Switch
                      id={id}
                      checked={categories.includes(category)}
                      onCheckedChange={on => setCategories(list => toggle(list, category, on))}
                    />
                  </Field>
                </li>
              );
            })}
          </ul>
        </FieldSet>

        <Field>
          <FieldLabel>Most sensitive tier allowed</FieldLabel>
          <Select items={capItems} value={cap} onValueChange={next => next && setCap(next)}>
            <SelectTrigger aria-label="Most sensitive tier allowed" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {capItems.map(item => (
                  <SelectItem key={item.value} value={item.value}>
                    <span className="flex flex-col gap-0.5 py-0.5 whitespace-normal">
                      <span>{item.label}</span>
                      <span className="max-w-72 text-xs text-muted-foreground">
                        {SENSITIVITY_DESCRIPTIONS[item.value]}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {cap !== request.maxSensitivity && (
            <FieldDescription>
              It asked for {SENSITIVITY_CAP_LABELS[request.maxSensitivity].toLowerCase()}.
            </FieldDescription>
          )}
        </Field>

        {isRead && (
          <FieldSet>
            <FieldLegend variant="label">Reads data from</FieldLegend>
            <FieldDescription>
              Whose memories it may read in these topics. Each stays off until you switch it on.
            </FieldDescription>
            <ul className="divide-y rounded-lg border">
              {sources.map(option => {
                const id = `consent-${request.id}-source-${option.source}`;
                return (
                  <li key={option.source} className="p-3">
                    <Field orientation="horizontal">
                      <FieldContent>
                        <FieldLabel htmlFor={id}>{option.label}</FieldLabel>
                        {option.allowed && <FieldDescription>Already allowed.</FieldDescription>}
                      </FieldContent>
                      <Switch
                        id={id}
                        checked={option.allowed || chosenSources.includes(option.source)}
                        disabled={option.allowed}
                        onCheckedChange={on =>
                          setChosenSources(list => toggle(list, option.source, on))
                        }
                      />
                    </Field>
                  </li>
                );
              })}
            </ul>
            {noSourceAfter && (
              <p className="text-sm font-medium">
                With no source on, {request.appName} still can’t read anything.
              </p>
            )}
          </FieldSet>
        )}
      </div>

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <Button onClick={approve} disabled={pending || categories.length === 0}>
          {pending ? "Approving…" : "Approve"}
        </Button>
      </DialogFooter>
    </>
  );
}
