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
ALTER TABLE "memories" DROP CONSTRAINT "memories_source_check";--> statement-breakpoint
ALTER TABLE "app_api_keys" ADD CONSTRAINT "app_api_keys_app_id_connected_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."connected_apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connected_apps" ADD CONSTRAINT "connected_apps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_api_keys_app_id_idx" ON "app_api_keys" USING btree ("app_id");--> statement-breakpoint
CREATE UNIQUE INDEX "app_api_keys_one_active_key" ON "app_api_keys" USING btree ("app_id") WHERE "app_api_keys"."revoked_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "connected_apps_user_id_name_key" ON "connected_apps" USING btree ("user_id",lower("name"));--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_source_app_id_connected_apps_id_fk" FOREIGN KEY ("source_app_id") REFERENCES "public"."connected_apps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memories_source_app_id_idx" ON "memories" USING btree ("source_app_id");--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_source_check" CHECK (("memories"."source_type" = 'user' and "memories"."source_app_id" is null) or "memories"."source_type" = 'app');