"use client";

import { FlaskConicalIcon } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useState } from "react";

import {
  runPlaygroundAction,
  type PlaygroundResult,
} from "@/app/(dashboard)/dashboard/playground/actions";
import { LocalDateTime } from "@/components/local-date-time";
import { CategoryBadge, SensitivityBadge, SourceLabel } from "@/components/memory-badges";
import { Button } from "@/components/ui/button";
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
import {
  CONTEXT_ORIGINS,
  CONTEXT_PERSPECTIVES,
  CONTEXT_TASKS,
  ORIGIN_LABELS,
  PERSPECTIVE_LABELS,
  TASK_LABELS,
} from "@/lib/context-options";
import {
  CATEGORY_LABELS,
  MEMORY_CATEGORIES,
  PROVENANCE_LABELS,
  type MemoryCategory,
} from "@/lib/memory-taxonomy";

type App = { id: string; name: string };

const TASK_ITEMS = [
  { value: null, label: "None" },
  ...CONTEXT_TASKS.map(task => ({ value: task, label: TASK_LABELS[task] })),
];

const ALL_TOPICS = "Every topic it may read";

const errorList = (messages?: string[]) => messages?.map(message => ({ message }));

/** Asks the vault something as one of the owner's apps, and shows the full answer and its sources. */
export function PlaygroundForm({ apps }: { apps: App[] }) {
  const [state, dispatch, pending] = useActionState(runPlaygroundAction, undefined);
  const [appId, setAppId] = useState(apps[0]!.id);
  const [categories, setCategories] = useState<MemoryCategory[]>([]);
  const errors = state?.ok === false ? state.errors : undefined;
  const message = state?.ok === false ? state.message : undefined;
  const appName = apps.find(app => app.id === appId)?.name ?? "this app";

  // Submitting through onSubmit (not `action`) keeps React from resetting the fields, so the same
  // request can be re-run after a permission change.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    for (const category of categories) formData.append("categories", category);
    startTransition(() => dispatch(formData));
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <form onSubmit={handleSubmit} noValidate className="rounded-xl border bg-card p-4">
        <FieldGroup>
          {message && (
            <p role="alert" className="text-sm text-destructive">
              {message}
            </p>
          )}

          <Field data-invalid={!!errors?.appId}>
            <FieldLabel htmlFor="playground-app">Ask as</FieldLabel>
            <Select
              name="appId"
              items={apps.map(app => ({ value: app.id, label: app.name }))}
              value={appId}
              onValueChange={value => value && setAppId(value)}
            >
              <SelectTrigger id="playground-app" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {apps.map(app => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription>
              Uses this app’s current{" "}
              <Link href="/dashboard/permissions" className="underline underline-offset-3">
                permissions
              </Link>
              .
            </FieldDescription>
            <FieldError errors={errorList(errors?.appId)} />
          </Field>

          <Field data-invalid={!!errors?.query}>
            <FieldLabel htmlFor="playground-query">Question</FieldLabel>
            <Textarea
              id="playground-query"
              name="query"
              rows={3}
              placeholder="What should I keep in mind when planning this user’s week?"
              aria-invalid={!!errors?.query}
            />
            <FieldError errors={errorList(errors?.query)} />
          </Field>

          <Field data-invalid={!!errors?.purpose}>
            <FieldLabel htmlFor="playground-purpose">Purpose</FieldLabel>
            <Input
              id="playground-purpose"
              name="purpose"
              placeholder="Weekly planning"
              aria-invalid={!!errors?.purpose}
            />
            <FieldError errors={errorList(errors?.purpose)} />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Field data-invalid={!!errors?.task}>
              <FieldLabel htmlFor="playground-task">Task</FieldLabel>
              <Select name="task" items={TASK_ITEMS} defaultValue={null}>
                <SelectTrigger id="playground-task" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {TASK_ITEMS.map(item => (
                      <SelectItem key={item.value ?? "none"} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldError errors={errorList(errors?.task)} />
            </Field>

            <Field data-invalid={!!errors?.origin}>
              <FieldLabel htmlFor="playground-origin">Draw on</FieldLabel>
              <Select name="origin" items={ORIGIN_LABELS} defaultValue="any">
                <SelectTrigger id="playground-origin" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {CONTEXT_ORIGINS.map(origin => (
                      <SelectItem key={origin} value={origin}>
                        {ORIGIN_LABELS[origin]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldError errors={errorList(errors?.origin)} />
            </Field>
          </div>

          <Field data-invalid={!!errors?.categories}>
            <FieldLabel htmlFor="playground-categories">Topics</FieldLabel>
            <Select
              multiple
              items={CATEGORY_LABELS}
              value={categories}
              onValueChange={value => setCategories(value as MemoryCategory[])}
            >
              <SelectTrigger id="playground-categories" className="w-full">
                <SelectValue>
                  {(value: MemoryCategory[]) =>
                    value.length === 0
                      ? ALL_TOPICS
                      : value.map(category => CATEGORY_LABELS[category]).join(", ")
                  }
                </SelectValue>
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
            <FieldDescription>
              A topic it may not read comes back as withheld, and is never searched.
            </FieldDescription>
            <FieldError errors={errorList(errors?.categories)} />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Field data-invalid={!!errors?.maxChars}>
              <FieldLabel htmlFor="playground-max-chars">Max characters</FieldLabel>
              <Input
                id="playground-max-chars"
                name="maxChars"
                type="number"
                inputMode="numeric"
                min={20}
                max={100}
                defaultValue={100}
                aria-invalid={!!errors?.maxChars}
              />
              <FieldError errors={errorList(errors?.maxChars)} />
            </Field>

            <Field data-invalid={!!errors?.perspective}>
              <FieldLabel htmlFor="playground-perspective">Perspective</FieldLabel>
              <Select name="perspective" items={PERSPECTIVE_LABELS} defaultValue="third_person">
                <SelectTrigger id="playground-perspective" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {CONTEXT_PERSPECTIVES.map(perspective => (
                      <SelectItem key={perspective} value={perspective}>
                        {PERSPECTIVE_LABELS[perspective]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldError errors={errorList(errors?.perspective)} />
            </Field>
          </div>

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Asking…" : `Ask as ${appName}`}
          </Button>
        </FieldGroup>
      </form>

      <div
        aria-live="polite"
        className="transition-opacity data-pending:opacity-60"
        data-pending={pending || undefined}
      >
        {state?.ok ? (
          <PlaygroundResultView result={state.result} apps={apps} />
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            <FlaskConicalIcon aria-hidden="true" className="size-5" />
            <p className="max-w-sm">
              The answer appears here, with every memory behind it. It’s a real request, so it’s
              also logged in your access log.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PlaygroundResultView({ result, apps }: { result: PlaygroundResult; apps: App[] }) {
  const appNames = new Map(apps.map(app => [app.id, app.name]));
  const { coverage, withheldCategories, memories } = result;

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-labelledby="answer-heading"
        className="flex flex-col gap-3 rounded-xl border bg-card p-4"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="answer-heading" className="font-medium">
            What the app gets
          </h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {result.charCount} / {result.maxChars} characters
          </span>
        </div>

        {result.context ? (
          <p className="rounded-lg bg-muted/60 p-3 text-sm whitespace-pre-wrap">{result.context}</p>
        ) : (
          <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            Nothing it may read matched, so nothing was shared.
          </p>
        )}

        <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]">
          <dt className="text-muted-foreground">Built from</dt>
          <dd>
            {coverage.memoriesUsed === 1 ? "1 memory" : `${coverage.memoriesUsed} memories`}
            {coverage.timeSpan && (
              <span className="text-muted-foreground">
                {" "}
                · <LocalDateTime value={coverage.timeSpan.from} />
                {coverage.timeSpan.to.getTime() !== coverage.timeSpan.from.getTime() && (
                  <>
                    {" "}
                    to <LocalDateTime value={coverage.timeSpan.to} />
                  </>
                )}
              </span>
            )}
          </dd>
          {coverage.categories.length > 0 && (
            <>
              <dt className="text-muted-foreground">Topics</dt>
              <dd className="flex flex-wrap gap-1">
                {coverage.categories.map(category => (
                  <CategoryBadge key={category} category={category} />
                ))}
              </dd>
            </>
          )}
          {withheldCategories.length > 0 && (
            <>
              <dt className="text-muted-foreground">Withheld</dt>
              <dd>
                {withheldCategories.map(category => CATEGORY_LABELS[category]).join(", ")}: asked
                for, but not granted
              </dd>
            </>
          )}
        </dl>

        <p className="text-xs text-muted-foreground">
          Logged in your{" "}
          <Link href="/dashboard/access-log" className="underline underline-offset-3">
            access log
          </Link>
          .
        </p>
      </section>

      {memories.length > 0 && (
        <section aria-labelledby="memories-heading" className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="memories-heading" className="font-medium">
              The memories behind it
            </h2>
            <p className="text-sm text-muted-foreground">
              The app only gets the text above, never these memories themselves.
            </p>
          </div>
          <ul className="divide-y rounded-xl border bg-card">
            {memories.map(memory => (
              <li key={memory.id} className="flex flex-col gap-1.5 p-4">
                <p className="max-w-prose text-sm">{memory.content}</p>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <CategoryBadge category={memory.category} />
                  <SensitivityBadge sensitivity={memory.sensitivity} />
                  <SourceLabel
                    source={memory.source}
                    appName={
                      memory.source.type === "app" && memory.source.appId
                        ? appNames.get(memory.source.appId)
                        : undefined
                    }
                  />
                  <span aria-hidden="true">·</span>
                  <LocalDateTime value={memory.occurredAt} />
                  {memory.source.type === "app" && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{PROVENANCE_LABELS[memory.provenance]}</span>
                    </>
                  )}
                  {memory.confidence < 0.7 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{Math.round(memory.confidence * 100)}% confident</span>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
