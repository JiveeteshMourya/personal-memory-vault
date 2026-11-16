import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { MEMORY_CATEGORIES, SENSITIVITY_TIERS } from "../../shared/constants/memory-taxonomy";
import { CONSENT_STATUSES, GRANT_OPERATIONS } from "../../shared/constants/permissions";
import { connectedApps } from "./app.model";
import { users } from "./auth.model";
import { sqlList } from "./sql-list";

// Access an app asked the owner for. The owner approves, maybe narrowed, or denies it on the
// dashboard; approving writes grants, never this table's own columns. The reason is the app's
// own free text, so it's encrypted like the access log's purpose.

export const consentRequests = pgTable(
  "consent_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // The asking app. Its requests go with it.
    appId: uuid("app_id")
      .notNull()
      .references(() => connectedApps.id, { onDelete: "cascade" }),
    operation: text("operation", { enum: GRANT_OPERATIONS }).notNull(),
    categories: text("categories", { enum: MEMORY_CATEGORIES }).array().notNull(),
    // The highest tier asked for. Approving can lower it, never raise it.
    maxSensitivity: text("max_sensitivity", { enum: SENSITIVITY_TIERS }).notNull(),
    reasonEncrypted: text("reason_encrypted").notNull(),
    status: text("status", { enum: CONSENT_STATUSES }).notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  t => [
    // Leads with user_id, so it also serves the FK; matches the pending list's filter and order.
    index("consent_requests_user_id_status_created_at_idx").on(
      t.userId,
      t.status,
      t.createdAt.desc()
    ),
    index("consent_requests_app_id_idx").on(t.appId),
    check(
      "consent_requests_operation_check",
      sql`${t.operation} in (${sqlList(GRANT_OPERATIONS)})`
    ),
    check(
      "consent_requests_categories_check",
      sql`cardinality(${t.categories}) > 0 and ${t.categories} <@ array[${sqlList(MEMORY_CATEGORIES)}]::text[]`
    ),
    check(
      "consent_requests_max_sensitivity_check",
      sql`${t.maxSensitivity} in (${sqlList(SENSITIVITY_TIERS)})`
    ),
    check("consent_requests_status_check", sql`${t.status} in (${sqlList(CONSENT_STATUSES)})`),
    // Decided exactly when it's no longer pending.
    check(
      "consent_requests_decided_at_check",
      sql`(${t.status} = 'pending') = (${t.decidedAt} is null)`
    ),
  ]
);
