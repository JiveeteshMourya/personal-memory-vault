import { ArchiveIcon, ChevronLeftIcon, ChevronRightIcon, SearchXIcon } from "lucide-react";
import Link from "next/link";
import { z } from "zod";

import { MemoryFilters } from "@/app/(dashboard)/dashboard/memories/_components/memory-filters";
import { MemoryRowActions } from "@/app/(dashboard)/dashboard/memories/_components/memory-row-actions";
import { NewMemoryButton } from "@/app/(dashboard)/dashboard/memories/_components/new-memory-button";
import { EmptyState } from "@/components/layout/empty-state";
import { LocalDateTime } from "@/components/local-date-time";
import {
  CategoryBadge,
  MemoryMeta,
  SensitivityBadge,
  SourceLabel,
} from "@/components/memory-badges";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listMemories, type MemoryFilters as Filters } from "@/data/memories";
import { MEMORY_CATEGORIES, SENSITIVITY_TIERS } from "@/lib/memory-taxonomy";

// Unknown or repeated values are dropped rather than erroring: the URL is user-editable.
const searchSchema = z.object({
  category: z.enum(MEMORY_CATEGORIES).optional().catch(undefined),
  sensitivity: z.enum(SENSITIVITY_TIERS).optional().catch(undefined),
  source: z.enum(["user", "app"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).optional().catch(undefined),
});

function listHref(filters: Filters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value && !(key === "page" && value === 1)) params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `/dashboard/memories?${query}` : "/dashboard/memories";
}

/** The owner's memories for the filters in the URL. Reads the session, so it renders behind <Suspense>. */
export async function MemoryList({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { page: requestedPage, ...filters } = searchSchema.parse(await searchParams);
  const { memories, page, hasNextPage } = await listMemories({ ...filters, page: requestedPage });
  const hasFilters = Boolean(filters.category || filters.sensitivity || filters.source);

  return (
    <div className="group/list flex flex-col gap-4">
      <MemoryFilters filters={filters} />

      <div className="transition-opacity group-has-data-pending/list:opacity-60">
        {memories.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={SearchXIcon}
              title="No memories match these filters"
              description="Try another category, sensitivity or source."
              action={
                <Button
                  variant="outline"
                  render={<Link href="/dashboard/memories" />}
                  nativeButton={false}
                >
                  Clear filters
                </Button>
              }
            />
          ) : page > 1 ? (
            <EmptyState
              icon={ArchiveIcon}
              title="This page is empty"
              description="There are fewer memories than this page needs."
              action={
                <Button
                  variant="outline"
                  render={<Link href="/dashboard/memories" />}
                  nativeButton={false}
                >
                  Go to the first page
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={ArchiveIcon}
              title="No memories yet"
              description="Add one yourself, or connect an app to save them for you. Each one is encrypted before it’s stored."
              action={<NewMemoryButton />}
            />
          )
        ) : (
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-full pl-4">Memory</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead className="hidden md:table-cell">Sensitivity</TableHead>
                  <TableHead className="hidden lg:table-cell">Source</TableHead>
                  <TableHead className="hidden sm:table-cell">When</TableHead>
                  <TableHead className="pr-3">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memories.map(memory => (
                  <TableRow key={memory.id}>
                    <TableCell className="min-w-56 py-3 pl-4 whitespace-normal">
                      <p className="line-clamp-2 max-w-prose">{memory.content}</p>
                      <MemoryMeta memory={memory} />
                      {/* Below md the badge and date columns fold under the text. */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 md:hidden">
                        <CategoryBadge category={memory.category} />
                        <SensitivityBadge sensitivity={memory.sensitivity} />
                        <span className="text-xs text-muted-foreground sm:hidden">
                          <LocalDateTime value={memory.occurredAt} />
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <CategoryBadge category={memory.category} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <SensitivityBadge sensitivity={memory.sensitivity} />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <SourceLabel source={memory.source} />
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground tabular-nums sm:table-cell">
                      <LocalDateTime value={memory.occurredAt} />
                    </TableCell>
                    <TableCell className="pr-3">
                      <MemoryRowActions memory={memory} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {(page > 1 || hasNextPage) && (
        <nav aria-label="Pages" className="flex items-center justify-between gap-2">
          {page > 1 ? (
            <Button
              variant="outline"
              render={<Link href={listHref({ ...filters, page: page - 1 })} scroll={false} />}
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
              render={<Link href={listHref({ ...filters, page: page + 1 })} scroll={false} />}
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

export function MemoryListSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <div className="flex flex-col gap-2 sm:flex-row">
        {[0, 1, 2].map(i => (
          <Skeleton key={i} className="h-8 w-full sm:w-44" />
        ))}
      </div>
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="hidden h-5 w-20 rounded-full md:block" />
            <Skeleton className="hidden h-5 w-20 rounded-full md:block" />
            <Skeleton className="hidden h-4 w-28 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
