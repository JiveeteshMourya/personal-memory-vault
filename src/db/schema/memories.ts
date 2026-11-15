import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { MEMORY_CATEGORIES, SENSITIVITY_LEVELS } from "../../lib/memory-taxonomy";
import { users } from "./auth";

// The owner's memories (Phase 04). Content is encrypted by the app (`encryptField`) before it gets
// here: no plaintext content or summary is stored in any column.

export const MEMORY_SOURCE_TYPES = ["user", "app"] as const;

// The lists are our own constants, so inlining them into the check constraints is safe.
const sqlList = (values: readonly string[]) => sql.raw(values.map(v => `'${v}'`).join(", "));

export const memories = pgTable(
  "memories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contentEncrypted: text("content_encrypted").notNull(),
    category: text("category", { enum: MEMORY_CATEGORIES }).notNull(),
    sensitivity: text("sensitivity", { enum: SENSITIVITY_LEVELS }).notNull(),
    sourceType: text("source_type", { enum: MEMORY_SOURCE_TYPES }).notNull(),
    // The connected app that wrote it. Phase 05 owns `connected_apps` and adds the FK.
    sourceAppId: uuid("source_app_id"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  t => [
    // Leads with user_id, so it also serves the FK; matches the list's order.
    index("memories_user_id_occurred_at_idx").on(t.userId, t.occurredAt.desc(), t.id.desc()),
    check("memories_category_check", sql`${t.category} in (${sqlList(MEMORY_CATEGORIES)})`),
    check("memories_sensitivity_check", sql`${t.sensitivity} in (${sqlList(SENSITIVITY_LEVELS)})`),
    check(
      "memories_source_check",
      sql`(${t.sourceType} = 'user' and ${t.sourceAppId} is null) or (${t.sourceType} = 'app' and ${t.sourceAppId} is not null)`
    ),
  ]
);
