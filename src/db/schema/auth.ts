import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Better Auth's core tables (Phase 03). The JS keys are Better Auth's field names, which its
// Drizzle adapter maps by; the columns are snake_case. Tables are plural (`usePlural` in
// src/lib/auth.ts), which also keeps clear of Postgres's reserved word `user`.
// After adding a Better Auth plugin that brings its own fields or tables, add them here by hand
// (the Better Auth CLI can't load src/lib/auth.ts because of its `server-only` import).

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** The vault owner. `users.id` is the owner id every feature table references as `user_id`. */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  // Better Auth lowercases emails before storing and looking them up.
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  ...timestamps,
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  t => [index("sessions_user_id_idx").on(t.userId)]
);

/** Sign-in methods per user. For email + password, `password` holds the hash. */
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  t => [index("accounts_user_id_idx").on(t.userId)]
);

/** Short-lived tokens (email verification, password reset) once those flows exist. */
export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  t => [index("verifications_identifier_idx").on(t.identifier)]
);
