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
ALTER TABLE "memories" DROP CONSTRAINT "memories_category_check";--> statement-breakpoint
ALTER TABLE "memories" DROP CONSTRAINT "memories_sensitivity_check";--> statement-breakpoint
-- Hand-written: maps existing rows to the Phase 06 taxonomy before the new checks are added.
UPDATE "memories" SET
	"category" = CASE "category" WHEN 'personal' THEN 'identity' ELSE "category" END,
	"sensitivity" = CASE "sensitivity"
		WHEN 'low' THEN 'shareable'
		WHEN 'moderate' THEN 'personal'
		WHEN 'high' THEN 'private'
		WHEN 'restricted' THEN 'protected'
		ELSE "sensitivity"
	END;--> statement-breakpoint
ALTER TABLE "access_events" ADD CONSTRAINT "access_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_events" ADD CONSTRAINT "access_events_app_id_connected_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."connected_apps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_grants" ADD CONSTRAINT "app_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_grants" ADD CONSTRAINT "app_grants_app_id_connected_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."connected_apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_source_access" ADD CONSTRAINT "app_source_access_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_source_access" ADD CONSTRAINT "app_source_access_app_id_connected_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."connected_apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_source_access" ADD CONSTRAINT "app_source_access_source_app_id_connected_apps_id_fk" FOREIGN KEY ("source_app_id") REFERENCES "public"."connected_apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "access_events_user_id_created_at_idx" ON "access_events" USING btree ("user_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "access_events_app_id_idx" ON "access_events" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "app_grants_user_id_idx" ON "app_grants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "app_source_access_user_id_idx" ON "app_source_access" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "app_source_access_source_app_id_idx" ON "app_source_access" USING btree ("source_app_id");--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_category_check" CHECK ("memories"."category" in ('identity', 'preferences', 'goals', 'interests', 'activity', 'sleep', 'diet', 'health', 'mood', 'work', 'education', 'social', 'relationships', 'finance', 'travel', 'other'));--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_sensitivity_check" CHECK ("memories"."sensitivity" in ('shareable', 'personal', 'private', 'protected'));