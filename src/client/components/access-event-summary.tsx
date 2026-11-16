import { Badge } from "@/client/components/ui/badge";
import type { AccessEventDTO } from "@/shared/types/access-event.types";
import type { AccessAction, AccessOutcome } from "@/shared/constants/permissions";

// How an access-log entry reads to the owner, on the access log and on the Overview.

export const ACTION_LABELS: Record<AccessAction, string> = {
  write: "Save",
  retract: "Retract",
  context: "Context request",
  consent: "Consent request",
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

/**
 * How much of an access went through. Nothing for a consent request: filing one grants nothing,
 * so "Allowed" would mislead; the owner decides on Permissions.
 */
export function OutcomeBadge({ event }: { event: Pick<AccessEventDTO, "action" | "outcome"> }) {
  if (event.action === "consent") return null;
  return (
    <Badge variant="outline" className={outcomeStyles[event.outcome]}>
      {OUTCOME_LABELS[event.outcome]}
    </Badge>
  );
}

export const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

/** One line that says what happened, for a collapsed or compact row. */
export function summaryOf(event: AccessEventDTO) {
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
