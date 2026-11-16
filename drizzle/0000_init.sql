CREATE TABLE "access_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"app_id" uuid,
	"app_name" text NOT NULL,
	"action" text NOT NULL,
	"channel" text NOT NULL,
	"outcome" text NOT NULL,
	"purpose_encrypted" text,
	"query_encrypted" text,
	"categories" text[] DEFAULT '{}' NOT NULL,
	"memory_ids" uuid[] DEFAULT '{}' NOT NULL,
	"withheld_count" integer DEFAULT 0 NOT NULL,
	"session_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "access_events_action_check" CHECK ("access_events"."action" in ('write', 'retract', 'context', 'consent')),
	CONSTRAINT "access_events_channel_check" CHECK ("access_events"."channel" in ('api', 'playground')),
	CONSTRAINT "access_events_outcome_check" CHECK ("access_events"."outcome" in ('allowed', 'partial', 'denied'))
);
--> statement-breakpoint
CREATE TABLE "app_api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid NOT NULL,
	"key_prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "app_api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "connected_apps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"app_id" uuid NOT NULL,
	"operation" text NOT NULL,
	"categories" text[] NOT NULL,
	"max_sensitivity" text NOT NULL,
	"reason_encrypted" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	CONSTRAINT "consent_requests_operation_check" CHECK ("consent_requests"."operation" in ('read', 'write')),
	CONSTRAINT "consent_requests_categories_check" CHECK (cardinality("consent_requests"."categories") > 0 and "consent_requests"."categories" <@ array['identity', 'preferences', 'goals', 'interests', 'activity', 'sleep', 'diet', 'health', 'mood', 'work', 'education', 'social', 'relationships', 'finance', 'travel', 'other']::text[]),
	CONSTRAINT "consent_requests_max_sensitivity_check" CHECK ("consent_requests"."max_sensitivity" in ('shareable', 'personal', 'private', 'protected')),
	CONSTRAINT "consent_requests_status_check" CHECK ("consent_requests"."status" in ('pending', 'approved', 'denied')),
	CONSTRAINT "consent_requests_decided_at_check" CHECK (("consent_requests"."status" = 'pending') = ("consent_requests"."decided_at" is null))
);
--> statement-breakpoint
CREATE TABLE "app_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"app_id" uuid NOT NULL,
	"operation" text NOT NULL,
	"category" text NOT NULL,
	"max_sensitivity" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_grants_app_id_operation_category_key" UNIQUE("app_id","operation","category"),
	CONSTRAINT "app_grants_operation_check" CHECK ("app_grants"."operation" in ('read', 'write')),
	CONSTRAINT "app_grants_category_check" CHECK ("app_grants"."category" in ('identity', 'preferences', 'goals', 'interests', 'activity', 'sleep', 'diet', 'health', 'mood', 'work', 'education', 'social', 'relationships', 'finance', 'travel', 'other')),
	CONSTRAINT "app_grants_max_sensitivity_check" CHECK ("app_grants"."max_sensitivity" in ('shareable', 'personal', 'private', 'protected'))
);
--> statement-breakpoint
CREATE TABLE "app_source_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"app_id" uuid NOT NULL,
	"source_app_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_source_access_app_id_source_app_id_key" UNIQUE NULLS NOT DISTINCT("app_id","source_app_id")
);
--> statement-breakpoint
CREATE TABLE "memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"content_encrypted" text NOT NULL,
	"category" text NOT NULL,
	"sensitivity" text NOT NULL,
	"source_type" text NOT NULL,
	"source_app_id" uuid,
	"provenance" text DEFAULT 'user_stated' NOT NULL,
	"confidence" real DEFAULT 1 NOT NULL,
	"importance" smallint DEFAULT 3 NOT NULL,
	"visibility" text DEFAULT 'shared' NOT NULL,
	"expires_at" timestamp with time zone,
	"session_id" text,
	"external_id" text,
	"annotations_encrypted" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memories_category_check" CHECK ("memories"."category" in ('identity', 'preferences', 'goals', 'interests', 'activity', 'sleep', 'diet', 'health', 'mood', 'work', 'education', 'social', 'relationships', 'finance', 'travel', 'other')),
	CONSTRAINT "memories_sensitivity_check" CHECK ("memories"."sensitivity" in ('shareable', 'personal', 'private', 'protected')),
	CONSTRAINT "memories_provenance_check" CHECK ("memories"."provenance" in ('user_stated', 'user_confirmed', 'app_observed', 'app_inferred', 'imported')),
	CONSTRAINT "memories_visibility_check" CHECK ("memories"."visibility" in ('shared', 'app_private')),
	CONSTRAINT "memories_confidence_check" CHECK ("memories"."confidence" between 0 and 1),
	CONSTRAINT "memories_importance_check" CHECK ("memories"."importance" between 1 and 5),
	CONSTRAINT "memories_source_check" CHECK (("memories"."source_type" = 'user' and "memories"."source_app_id" is null) or "memories"."source_type" = 'app')
);
--> statement-breakpoint
ALTER TABLE "access_events" ADD CONSTRAINT "access_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_events" ADD CONSTRAINT "access_events_app_id_connected_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."connected_apps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_api_keys" ADD CONSTRAINT "app_api_keys_app_id_connected_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."connected_apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connected_apps" ADD CONSTRAINT "connected_apps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_requests" ADD CONSTRAINT "consent_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_requests" ADD CONSTRAINT "consent_requests_app_id_connected_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."connected_apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_grants" ADD CONSTRAINT "app_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_grants" ADD CONSTRAINT "app_grants_app_id_connected_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."connected_apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_source_access" ADD CONSTRAINT "app_source_access_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_source_access" ADD CONSTRAINT "app_source_access_app_id_connected_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."connected_apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_source_access" ADD CONSTRAINT "app_source_access_source_app_id_connected_apps_id_fk" FOREIGN KEY ("source_app_id") REFERENCES "public"."connected_apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_source_app_id_connected_apps_id_fk" FOREIGN KEY ("source_app_id") REFERENCES "public"."connected_apps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "access_events_user_id_created_at_idx" ON "access_events" USING btree ("user_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "access_events_app_id_idx" ON "access_events" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "app_api_keys_app_id_idx" ON "app_api_keys" USING btree ("app_id");--> statement-breakpoint
CREATE UNIQUE INDEX "app_api_keys_one_active_key" ON "app_api_keys" USING btree ("app_id") WHERE "app_api_keys"."revoked_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "connected_apps_user_id_name_key" ON "connected_apps" USING btree ("user_id",lower("name"));--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "consent_requests_user_id_status_created_at_idx" ON "consent_requests" USING btree ("user_id","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "consent_requests_app_id_idx" ON "consent_requests" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "app_grants_user_id_idx" ON "app_grants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "app_source_access_user_id_idx" ON "app_source_access" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "app_source_access_source_app_id_idx" ON "app_source_access" USING btree ("source_app_id");--> statement-breakpoint
CREATE INDEX "memories_user_id_occurred_at_idx" ON "memories" USING btree ("user_id","occurred_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "memories_source_app_id_idx" ON "memories" USING btree ("source_app_id");--> statement-breakpoint
CREATE INDEX "memories_source_app_id_external_id_idx" ON "memories" USING btree ("source_app_id","external_id") WHERE "memories"."external_id" is not null;--> statement-breakpoint
CREATE INDEX "memories_source_app_id_session_id_idx" ON "memories" USING btree ("source_app_id","session_id") WHERE "memories"."session_id" is not null;