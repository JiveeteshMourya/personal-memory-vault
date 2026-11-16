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
ALTER TABLE "consent_requests" ADD CONSTRAINT "consent_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_requests" ADD CONSTRAINT "consent_requests_app_id_connected_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."connected_apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consent_requests_user_id_status_created_at_idx" ON "consent_requests" USING btree ("user_id","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "consent_requests_app_id_idx" ON "consent_requests" USING btree ("app_id");