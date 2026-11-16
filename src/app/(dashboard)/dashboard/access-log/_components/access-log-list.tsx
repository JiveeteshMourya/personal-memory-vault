import { ChevronLeftIcon, ChevronRightIcon, ScrollTextIcon } from "lucide-react";
import Link from "next/link";
import { z } from "zod";

import { EmptyState } from "@/components/layout/empty-state";
import { LocalDateTime } from "@/components/local-date-time";
import { CategoryBadge, SensitivityBadge, SourceLabel } from "@/components/memory-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listAccessEvents, type AccessEventDTO } from "@/data/access-events";
import { listApps } from "@/data/apps";
import { listMemoriesByIds, type MemoryDTO } from "@/data/memories";
import type { AccessAction, AccessOutcome } from "@/db/schema";

// Unknown values fall back to the first page: the URL is user-editable.
const searchSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).optional().catch(undefined),
});

const ACTION_LABELS: Record<AccessAction, string> = {
  write: "Save",
  retract: "Retract",
  context: "Context request",
  consent: "Consent request",
};

/** What an event's memories are to the owner. */
const MEMORY_HEADINGS: Record<AccessAction, string> = {
  write: "Saved",
  retract: "Removed",
  context: "Disclosed to the app",
  consent: "Memories",
};

const OUTCOME_LABELS: Record<AccessOutcome, string> = {
  allowed: "Allowed",
  partial: "Partly withheld",
  denied: "Denied",
};

// The more an access was held back, the further it leans into the withheld slate.
const outcomeStyles: Record<AccessOutcome, string> = {
  allowed: "border-transparent bg-primary/10 text-primary dark:bg-primary/20",
  partial: "border-transparent bg-withheld/15 text-foreground dark:bg-withheld/70",
  denied: "border-transparent bg-withheld text-withheld-foreground",
};

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** One line that says what happened, for the collapsed row. */
function summaryOf(event: AccessEventDTO) {
  if (event.purpose) return event.purpose;
  if (event.query) return event.query;
  const memories = plural(event.memoryIds.length, "memory", "memories");
  switch (event.action) {
    case "write":
      if (event.outcome === "denied" && event.withheldCount === 0) {
        return "Tried to save without a save permission";
      }
      return event.withheldCount > 0
        ? `Saved ${memories}, withheld ${event.withheldCount}`
        : `Saved ${memories}`;
    case "retract":
      return `Removed ${memories}`;
    case "context":
      return "Asked for context";
    case "consent":
      return "Asked for access";
  }
}

function withheldNote(event: AccessEventDTO) {
  if (event.action === "context") {
    return `${plural(event.withheldCount, "topic", "topics")} it asked for but may not read`;
  }
  return `${plural(event.withheldCount, "memory", "memories")} not saved: no permission`;
}

function pageHref(page: number) {
  return page > 1 ? `/dashboard/access-log?page=${page}` : "/dashboard/access-log";
}

function EventDetails({
  event,
  memoriesById,
  appNames,
}: {
  event: AccessEventDTO;
  memoriesById: Map<string, MemoryDTO>;
  appNames: Map<string, string>;
}) {
  const found = event.memoryIds.flatMap(id => memoriesById.get(id) ?? []);
  const missing = event.memoryIds.length - found.length;

  return (
    <div className="flex flex-col gap-4 border-t px-4 py-4 sm:pl-11">
      <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[7rem_minmax(0,1fr)]">
        {event.query && (
          <>
            <dt className="text-muted-foreground">Asked</dt>
            <dd className="whitespace-pre-wrap">{event.query}</dd>
          </>
        )}
        {event.purpose && (
          <>
            <dt className="text-muted-foreground">Purpose</dt>
            <dd>{event.purpose}</dd>
          </>
        )}
        {event.withheldCount > 0 && (
          <>
            <dt className="text-muted-foreground">Withheld</dt>
            <dd>{withheldNote(event)}</dd>
          </>
        )}
        <dt className="text-muted-foreground">Through</dt>
        <dd>{event.channel === "playground" ? "Your Playground test" : "The app’s API key"}</dd>
        {event.sessionId && (
          <>
            <dt className="text-muted-foreground">Session</dt>
            <dd className="font-mono text-xs leading-5 break-all">{event.sessionId}</dd>
          </>
        )}
      </dl>

      {event.memoryIds.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-muted-foreground">
            {MEMORY_HEADINGS[event.action]} ({event.memoryIds.length})
          </h3>
          {found.length > 0 && (
            <ul className="divide-y rounded-lg border bg-card">
              {found.map(memory => (
                <li key={memory.id} className="flex flex-col gap-1.5 p-3">
                  <p className="max-w-prose text-sm">{memory.content}</p>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
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
                    <span aria-hidden="true" className="text-muted-foreground">
                      ·
                    </span>
                    <span className="text-muted-foreground">
                      <LocalDateTime value={memory.occurredAt} />
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {missing > 0 && (
            <p className="text-xs text-muted-foreground">
              {plural(missing, "memory is", "memories are")} no longer in your vault.
            </p>
          )}
        </section>
      ) : (
        event.action === "context" &&
        event.outcome !== "denied" && (
          <p className="text-sm text-muted-foreground">
            Nothing it may read matched, so nothing was shared.
          </p>
        )
      )}
    </div>
  );
}

/** The owner's access log, one page at a time. Reads the session and the URL, so it renders behind <Suspense>. */
export async function AccessLogList({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { page: requestedPage } = searchSchema.parse(await searchParams);
  const { events, page, hasNextPage } = await listAccessEvents(requestedPage);

  if (events.length === 0) {
    return page > 1 ? (
      <EmptyState
        icon={ScrollTextIcon}
        title="This page is empty"
        description="There are fewer entries than this page needs."
        action={
          <Button variant="outline" render={<Link href={pageHref(1)} />} nativeButton={false}>
            Go to the first page
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={ScrollTextIcon}
        title="No requests yet"
        description="When an app asks for context, you’ll see what it asked, why, and exactly what it received."
      />
    );
  }

  const [memories, apps] = await Promise.all([
    listMemoriesByIds([...new Set(events.flatMap(event => event.memoryIds))]),
    listApps(),
  ]);
  const memoriesById = new Map(memories.map(memory => [memory.id, memory]));
  const appNames = new Map(apps.map(app => [app.id, app.name]));

  return (
    <div className="flex flex-col gap-4">
      <ul className="divide-y rounded-xl border bg-card">
        {events.map(event => (
          <li key={event.id}>
            <details className="group/event">
              <summary className="flex cursor-pointer list-none items-start gap-3 p-4 transition-colors outline-none hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
                <ChevronRightIcon
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-open/event:rotate-90"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium">
                      {event.appName}
                      {event.appId === null && (
                        <span className="font-normal text-muted-foreground"> (deleted)</span>
                      )}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {ACTION_LABELS[event.action]}
                    </span>
                    <Badge variant="outline" className={outcomeStyles[event.outcome]}>
                      {OUTCOME_LABELS[event.outcome]}
                    </Badge>
                    {event.channel === "playground" && <Badge variant="outline">Playground</Badge>}
                    <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                      <LocalDateTime value={event.createdAt} />
                    </span>
                  </div>
                  <p className="line-clamp-1 text-sm text-muted-foreground">{summaryOf(event)}</p>
                  {event.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {event.categories.map(category => (
                        <CategoryBadge key={category} category={category} />
                      ))}
                    </div>
                  )}
                </div>
              </summary>
              <EventDetails event={event} memoriesById={memoriesById} appNames={appNames} />
            </details>
          </li>
        ))}
      </ul>

      {(page > 1 || hasNextPage) && (
        <nav aria-label="Pages" className="flex items-center justify-between gap-2">
          {page > 1 ? (
            <Button
              variant="outline"
              render={<Link href={pageHref(page - 1)} scroll={false} />}
              nativeButton={false}
            >
              <ChevronLeftIcon data-icon="inline-start" />
              Newer
            </Button>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted-foreground tabular-nums">Page {page}</span>
          {hasNextPage ? (
            <Button
              variant="outline"
              render={<Link href={pageHref(page + 1)} scroll={false} />}
              nativeButton={false}
            >
              Older
              <ChevronRightIcon data-icon="inline-end" />
            </Button>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

export function AccessLogSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4" aria-hidden="true">
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="size-4" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-56 max-w-full" />
            <Skeleton className="h-3 w-80 max-w-full" />
          </div>
          <Skeleton className="hidden h-3 w-28 sm:block" />
        </div>
      ))}
    </div>
  );
}
