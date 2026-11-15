CREATE TABLE "memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"content_encrypted" text NOT NULL,
	"category" text NOT NULL,
	"sensitivity" text NOT NULL,
	"source_type" text NOT NULL,
	"source_app_id" uuid,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memories_category_check" CHECK ("memories"."category" in ('activity', 'sleep', 'diet', 'mood', 'health', 'work', 'social', 'finance', 'relationships', 'personal')),
	CONSTRAINT "memories_sensitivity_check" CHECK ("memories"."sensitivity" in ('low', 'moderate', 'high', 'restricted')),
	CONSTRAINT "memories_source_check" CHECK (("memories"."source_type" = 'user' and "memories"."source_app_id" is null) or ("memories"."source_type" = 'app' and "memories"."source_app_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memories_user_id_occurred_at_idx" ON "memories" USING btree ("user_id","occurred_at" DESC NULLS LAST,"id" DESC NULLS LAST);