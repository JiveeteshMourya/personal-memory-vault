import { sql } from "drizzle-orm";
import { check, index, pgTable, real, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core";
import {
  MEMORY_CATEGORIES,
  MEMORY_PROVENANCES,
  MEMORY_VISIBILITIES,
  SENSITIVITY_TIERS,
} from "../../shared/constants/memory-taxonomy";
import { sqlList } from "./sql-list";
import { connectedApps } from "./app.model";
import { users } from "./auth.model";

// The owner's memories (Phase 04; app-written labels since Phase 07). Content and annotations are
// encrypted by the app (`encryptField`) before they get here: no column holds plaintext content.
// The plaintext columns are labels the vault filters on, never content.

export const MEMORY_SOURCE_TYPES = ["user", "app"] as const;

export const memories = pgTable(
  "memories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contentEncrypted: text("content_encrypted").notNull(),
    category: text("category", { enum: MEMORY_CATEGORIES }).notNull(),
    sensitivity: text("sensitivity", { enum: SENSITIVITY_TIERS }).notNull(),
    sourceType: text("source_type", { enum: MEMORY_SOURCE_TYPES }).notNull(),
    // The connected app that wrote it. Null for the owner's own memories, and for memories whose
    // app has since been deleted: the memory stays the owner's.
    sourceAppId: uuid("source_app_id").references(() => connectedApps.id, {
      onDelete: "set null",
    }),
    // The defaults describe an owner's own entry: stated by them, fully trusted, shared.
    provenance: text("provenance", { enum: MEMORY_PROVENANCES }).notNull().default("user_stated"),
    confidence: real("confidence").notNull().default(1),
    importance: smallint("importance").notNull().default(3),
    visibility: text("visibility", { enum: MEMORY_VISIBILITIES }).notNull().default("shared"),
    // After this, the memory is never shared with an app again.
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    // The writing app's own ids, for retract and duplicate detection. One request with an
    // `external_id` can yield several memories, so neither is unique.
    sessionId: text("session_id"),
    externalId: text("external_id"),
    // Encrypted JSON: `{ tags, entities, contentType, domain }`. Null for the owner's own entries.
    annotationsEncrypted: text("annotations_encrypted"),
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
    index("memories_source_app_id_idx").on(t.sourceAppId),
    // Retract and duplicate checks always name the app; most memories carry neither id.
    index("memories_source_app_id_external_id_idx")
      .on(t.sourceAppId, t.externalId)
      .where(sql`${t.externalId} is not null`),
    index("memories_source_app_id_session_id_idx")
      .on(t.sourceAppId, t.sessionId)
      .where(sql`${t.sessionId} is not null`),
    check("memories_category_check", sql`${t.category} in (${sqlList(MEMORY_CATEGORIES)})`),
    check("memories_sensitivity_check", sql`${t.sensitivity} in (${sqlList(SENSITIVITY_TIERS)})`),
    check("memories_provenance_check", sql`${t.provenance} in (${sqlList(MEMORY_PROVENANCES)})`),
    check("memories_visibility_check", sql`${t.visibility} in (${sqlList(MEMORY_VISIBILITIES)})`),
    check("memories_confidence_check", sql`${t.confidence} between 0 and 1`),
    check("memories_importance_check", sql`${t.importance} between 1 and 5`),
    // The owner's memories never name an app; an app's keep its id until the app is deleted.
    check(
      "memories_source_check",
      sql`(${t.sourceType} = 'user' and ${t.sourceAppId} is null) or ${t.sourceType} = 'app'`
    ),
  ]
);
