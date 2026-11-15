import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";

// Connected apps and their API keys (Phase 05). Registering an app grants it nothing: what it may
// read or write lives in its grants (Phase 06).

export const connectedApps = pgTable(
  "connected_apps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  t => [
    // One name per owner, ignoring case. Leads with user_id, so it also serves the FK.
    uniqueIndex("connected_apps_user_id_name_key").on(t.userId, sql`lower(${t.name})`),
  ]
);

// Only the SHA-256 of a key is stored. The plaintext is shown to the owner once, at creation.
export const appApiKeys = pgTable(
  "app_api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appId: uuid("app_id")
      .notNull()
      .references(() => connectedApps.id, { onDelete: "cascade" }),
    // The key's first characters, so the owner can tell keys apart.
    keyPrefix: text("key_prefix").notNull(),
    keyHash: text("key_hash").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  t => [
    index("app_api_keys_app_id_idx").on(t.appId),
    // An app has at most one active key: issuing a new one revokes the old one.
    uniqueIndex("app_api_keys_one_active_key")
      .on(t.appId)
      .where(sql`${t.revokedAt} is null`),
  ]
);
