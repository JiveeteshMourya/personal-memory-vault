import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { MEMORY_CATEGORIES, SENSITIVITY_TIERS } from "../../shared/constants/memory-taxonomy";
import { GRANT_OPERATIONS } from "../../shared/constants/permissions";
import { connectedApps } from "./app.model";
import { users } from "./auth.model";
import { sqlList } from "./sql-list";

// What each connected app may do (Phase 06). Everything is denied by default: a row allows, and
// revoking deletes the row. The policy engine (`access-policy.service.ts`) decides from both tables.

/** One category an app may read or write, capped at a sensitivity tier. */
export const appGrants = pgTable(
  "app_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    appId: uuid("app_id")
      .notNull()
      .references(() => connectedApps.id, { onDelete: "cascade" }),
    operation: text("operation", { enum: GRANT_OPERATIONS }).notNull(),
    category: text("category", { enum: MEMORY_CATEGORIES }).notNull(),
    maxSensitivity: text("max_sensitivity", { enum: SENSITIVITY_TIERS }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  t => [
    // Leads with app_id, so it also serves the app FK and the gateway's per-app lookup.
    unique("app_grants_app_id_operation_category_key").on(t.appId, t.operation, t.category),
    index("app_grants_user_id_idx").on(t.userId),
    check("app_grants_operation_check", sql`${t.operation} in (${sqlList(GRANT_OPERATIONS)})`),
    check("app_grants_category_check", sql`${t.category} in (${sqlList(MEMORY_CATEGORIES)})`),
    check(
      "app_grants_max_sensitivity_check",
      sql`${t.maxSensitivity} in (${sqlList(SENSITIVITY_TIERS)})`
    ),
  ]
);

/**
 * Whose memories an app may read: the owner's own entries (`source_app_id` null) or one connected
 * app's writes, including the reader's own.
 */
export const appSourceAccess = pgTable(
  "app_source_access",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // The reading app.
    appId: uuid("app_id")
      .notNull()
      .references(() => connectedApps.id, { onDelete: "cascade" }),
    // The writer it may read. Null means the owner's own entries ("Your entries").
    sourceAppId: uuid("source_app_id").references(() => connectedApps.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  t => [
    // Nulls not distinct: "Your entries" can be allowed only once per app. Also serves the app FK.
    unique("app_source_access_app_id_source_app_id_key")
      .on(t.appId, t.sourceAppId)
      .nullsNotDistinct(),
    index("app_source_access_user_id_idx").on(t.userId),
    index("app_source_access_source_app_id_idx").on(t.sourceAppId),
  ]
);
