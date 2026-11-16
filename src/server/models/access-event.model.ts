import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { MEMORY_CATEGORIES } from "../../shared/constants/memory-taxonomy";
import {
  ACCESS_ACTIONS,
  ACCESS_CHANNELS,
  ACCESS_OUTCOMES,
} from "../../shared/constants/permissions";
import { connectedApps } from "./app.model";
import { users } from "./auth.model";
import { sqlList } from "./sql-list";

// Every app access to the vault (Phase 06): writes, retracts, context requests and consent
// requests. The purpose and query are encrypted like memory content; nothing else holds content.

export const accessEvents = pgTable(
  "access_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Null once the app is deleted; `app_name` keeps the log readable after that.
    appId: uuid("app_id").references(() => connectedApps.id, { onDelete: "set null" }),
    appName: text("app_name").notNull(),
    action: text("action", { enum: ACCESS_ACTIONS }).notNull(),
    channel: text("channel", { enum: ACCESS_CHANNELS }).notNull(),
    outcome: text("outcome", { enum: ACCESS_OUTCOMES }).notNull(),
    purposeEncrypted: text("purpose_encrypted"),
    queryEncrypted: text("query_encrypted"),
    // No check constraint: a later taxonomy change must not invalidate old log rows.
    categories: text("categories", { enum: MEMORY_CATEGORIES })
      .array()
      .notNull()
      .default(sql`'{}'`),
    // The memories written, retracted or disclosed. They may since have been deleted.
    memoryIds: uuid("memory_ids")
      .array()
      .notNull()
      .default(sql`'{}'`),
    withheldCount: integer("withheld_count").notNull().default(0),
    sessionId: text("session_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  t => [
    // Leads with user_id, so it also serves the FK; matches the log's order.
    index("access_events_user_id_created_at_idx").on(t.userId, t.createdAt.desc(), t.id.desc()),
    index("access_events_app_id_idx").on(t.appId),
    check("access_events_action_check", sql`${t.action} in (${sqlList(ACCESS_ACTIONS)})`),
    check("access_events_channel_check", sql`${t.channel} in (${sqlList(ACCESS_CHANNELS)})`),
    check("access_events_outcome_check", sql`${t.outcome} in (${sqlList(ACCESS_OUTCOMES)})`),
  ]
);
