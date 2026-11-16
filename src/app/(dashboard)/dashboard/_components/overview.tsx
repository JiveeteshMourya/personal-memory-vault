import { ArrowRightIcon, KeyRoundIcon, LayoutDashboardIcon } from "lucide-react";
import Link from "next/link";

import { ACTION_LABELS, OutcomeBadge, plural, summaryOf } from "@/components/access-event-summary";
import { AppMonogram } from "@/components/app-monogram";
import { EmptyState } from "@/components/layout/empty-state";
import { LocalDateTime } from "@/components/local-date-time";
import { Skeleton } from "@/components/ui/skeleton";
import { listAccessEvents } from "@/data/access-events";
import { listApps } from "@/data/apps";
import { listPendingConsentRequests } from "@/data/consent";
import { getGrantCounts } from "@/data/grants";
import { getMemoryCounts, type MemoryCounts } from "@/data/memories";
import {
  CATEGORY_LABELS,
  formatCategoryList,
  MEMORY_CATEGORIES,
  SENSITIVITY_LABELS,
  SENSITIVITY_TIERS,
  type Sensitivity,
} from "@/lib/memory-taxonomy";

const RECENT_EVENTS = 5;
const SHOWN_REQUESTS = 5;

// The validated tier ramp (globals.css): fills and the ink printed on them.
const tierStyles: Record<Sensitivity, string> = {
  shareable: "bg-tier-shareable text-tier-shareable-foreground",
  personal: "bg-tier-personal text-tier-personal-foreground",
  private: "bg-tier-private text-tier-private-foreground",
  protected: "bg-tier-protected text-tier-protected-foreground",
};
const tierSwatches: Record<Sensitivity, string> = {
  shareable: "bg-tier-shareable",
  personal: "bg-tier-personal",
  private: "bg-tier-private",
  protected: "bg-tier-protected",
};

// A block narrower than this share can't fit its label; the legend still gives its count.
const MIN_LABELLED_SHARE = 0.1;

function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const id = `overview-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id={id} className="font-medium">
            {title}
          </h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      <div className="rounded-xl border bg-card">{children}</div>
    </section>
  );
}

function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
    >
      {children}
      <ArrowRightIcon aria-hidden="true" className="size-3.5" />
    </Link>
  );
}

function StatTile({
  label,
  value,
  detail,
  href,
  highlight = false,
}: {
  label: string;
  value: number;
  detail: string;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col gap-1 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none ${
        highlight ? "border-key/45 bg-key/6 dark:bg-key/8" : ""
      }`}
    >
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {highlight && <KeyRoundIcon aria-hidden="true" className="size-3.5 text-key" />}
        {label}
      </span>
      <span className="text-3xl font-semibold">{value.toLocaleString("en-US")}</span>
      <span className="text-sm text-muted-foreground">{detail}</span>
    </Link>
  );
}

/** One bar per topic, largest first, with its count at the tip. One series, so no legend. */
function TopicBars({ counts }: { counts: MemoryCounts["byCategory"] }) {
  const ranked = [...MEMORY_CATEGORIES].sort((a, b) => counts[b] - counts[a]);
  const max = Math.max(1, ...ranked.map(category => counts[category]));

  return (
    <ol className="flex flex-col p-2">
      {ranked.map(category => {
        const count = counts[category];
        return (
          <li key={category}>
            <Link
              href={`/dashboard/memories?category=${category}`}
              aria-label={`${CATEGORY_LABELS[category]}: ${plural(count, "memory", "memories")}`}
              className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className={`truncate text-sm ${count === 0 ? "text-muted-foreground" : ""}`}>
                {CATEGORY_LABELS[category]}
              </span>
              <span className="flex items-center gap-2">
                {count > 0 && (
                  <span
                    aria-hidden="true"
                    className="h-3 rounded-r-md bg-primary"
                    // Leaves room at the tip for the count.
                    style={{ width: `calc((100% - 2.5rem) * ${count / max})` }}
                  />
                )}
                <span
                  aria-hidden="true"
                  className={`text-sm tabular-nums ${count === 0 ? "text-muted-foreground" : ""}`}
                >
                  {count}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

/** One whole split by tier: a tall segmented bar in tier order, shares printed where they fit. */
function TierBar({ counts, total }: { counts: MemoryCounts["bySensitivity"]; total: number }) {
  const parts = SENSITIVITY_TIERS.filter(tier => counts[tier] > 0);
  const share = (tier: Sensitivity) => counts[tier] / total;
  const percent = (tier: Sensitivity) => `${Math.round(share(tier) * 100)}%`;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex h-7 gap-0.5">
        {parts.map(tier => {
          const name = `${SENSITIVITY_LABELS[tier]}: ${plural(counts[tier], "memory", "memories")} (${percent(tier)})`;
          return (
            <Link
              key={tier}
              href={`/dashboard/memories?sensitivity=${tier}`}
              aria-label={name}
              title={name}
              className={`flex min-w-1 items-center rounded-md px-2 text-xs font-semibold transition-opacity hover:opacity-85 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none ${tierStyles[tier]}`}
              style={{ flex: `${counts[tier]} 1 0%` }}
            >
              {share(tier) >= MIN_LABELLED_SHARE && percent(tier)}
            </Link>
          );
        })}
      </div>
      {/* Names in block order, with the counts the blocks don't print. */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
        {SENSITIVITY_TIERS.map(tier => (
          <li key={tier} className="flex items-center gap-1.5 text-sm">
            <span
              aria-hidden="true"
              className={`size-3 shrink-0 rounded-sm ${tierSwatches[tier]}`}
            />
            {SENSITIVITY_LABELS[tier]}
            <span className="text-muted-foreground">{counts[tier]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The vault at a glance. Reads the session, so it renders behind <Suspense>. */
export async function Overview() {
  const [counts, apps, grantCounts, requests, { events }] = await Promise.all([
    getMemoryCounts(),
    listApps(),
    getGrantCounts(),
    listPendingConsentRequests(),
    listAccessEvents(1, RECENT_EVENTS),
  ]);

  if (counts.total === 0 && apps.length === 0) {
    return (
      <EmptyState
        icon={LayoutDashboardIcon}
        title="Your vault is empty"
        description="Once an app is connected and saves memories, a summary of what’s stored and shared shows up here."
      />
    );
  }

  const readers = apps.filter(app => (grantCounts.get(app.id)?.read ?? 0) > 0).length;
  const writers = apps.filter(app => (grantCounts.get(app.id)?.write ?? 0) > 0).length;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Memories"
          value={counts.total}
          detail={`${counts.bySource.user.toLocaleString("en-US")} from you · ${counts.bySource.app.toLocaleString("en-US")} from apps`}
          href="/dashboard/memories"
        />
        <StatTile
          label="Connected apps"
          value={apps.length}
          detail={`${readers} may read · ${writers} may save`}
          href="/dashboard/apps"
        />
        <StatTile
          label="Waiting for you"
          value={requests.length}
          detail={requests.length === 0 ? "No access requests" : "Access requests to review"}
          href="/dashboard/permissions#requests"
          highlight={requests.length > 0}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Memories by topic" description="Select a topic to see its memories.">
          <TopicBars counts={counts.byCategory} />
        </Panel>

        <div className="flex min-w-0 flex-col gap-8">
          <Panel title="By sensitivity" description="Tiers by the harm a leak could do.">
            {counts.total > 0 ? (
              <TierBar counts={counts.bySensitivity} total={counts.total} />
            ) : (
              <p className="p-4 text-sm text-muted-foreground">No memories yet.</p>
            )}
          </Panel>

          <Panel
            title="Connected apps"
            action={<PanelLink href="/dashboard/apps">Manage</PanelLink>}
          >
            {apps.length > 0 ? (
              <ul className="divide-y">
                {apps.map(app => {
                  const granted = grantCounts.get(app.id);
                  const access = granted
                    ? `Reads ${plural(granted.read, "topic", "topics")} · saves ${plural(granted.write, "topic", "topics")}`
                    : "No access yet";
                  return (
                    <li key={app.id}>
                      <Link
                        href={`/dashboard/permissions?app=${app.id}`}
                        className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        <AppMonogram name={app.name} className="size-8 text-xs" />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">{app.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {app.activeKey ? access : `No active key · ${access.toLowerCase()}`}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">
                No apps yet. Register one on Apps to give it a key.
              </p>
            )}
          </Panel>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel
          title="Recent activity"
          action={<PanelLink href="/dashboard/access-log">Access log</PanelLink>}
        >
          {events.length > 0 ? (
            <ul className="divide-y">
              {events.map(event => (
                <li key={event.id}>
                  <Link
                    href={`/dashboard/access-log#event-${event.id}`}
                    className="flex flex-col gap-1 p-3 transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium">{event.appName}</span>
                      <span className="text-sm text-muted-foreground">
                        {ACTION_LABELS[event.action]}
                      </span>
                      <OutcomeBadge event={event} />
                      <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                        <LocalDateTime value={event.createdAt} />
                      </span>
                    </span>
                    <span className="line-clamp-1 text-sm text-muted-foreground">
                      {summaryOf(event)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">
              No app has saved to or asked your vault yet.
            </p>
          )}
        </Panel>

        <Panel
          title="Access requests"
          action={
            requests.length > 0 && (
              <PanelLink href="/dashboard/permissions#requests">Review</PanelLink>
            )
          }
        >
          {requests.length > 0 ? (
            <ul className="divide-y">
              {requests.slice(0, SHOWN_REQUESTS).map(request => (
                <li key={request.id}>
                  <Link
                    href={`/dashboard/permissions?app=${request.appId}#requests`}
                    className="flex items-start gap-3 p-3 transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <AppMonogram name={request.appName} className="size-8 text-xs" />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm">
                        <span className="font-medium">{request.appName}</span>{" "}
                        <span className="text-muted-foreground">
                          wants to {request.operation === "read" ? "read" : "save"}{" "}
                          {formatCategoryList(request.categories)}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        <LocalDateTime value={request.createdAt} />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
              {requests.length > SHOWN_REQUESTS && (
                <li className="p-3 text-sm text-muted-foreground">
                  And {plural(requests.length - SHOWN_REQUESTS, "more", "more")} on Permissions.
                </li>
              )}
            </ul>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">
              Nothing waiting. When an app asks for more access, it shows up here.
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}

export function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-hidden="true">
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map(i => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Skeleton className="h-96 rounded-xl" />
        <div className="flex flex-col gap-8">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
