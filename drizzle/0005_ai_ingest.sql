ALTER TABLE "memories" ADD COLUMN "provenance" text DEFAULT 'user_stated' NOT NULL;--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "confidence" real DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "importance" smallint DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "visibility" text DEFAULT 'shared' NOT NULL;--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "session_id" text;--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "annotations_encrypted" text;--> statement-breakpoint
CREATE INDEX "memories_source_app_id_external_id_idx" ON "memories" USING btree ("source_app_id","external_id") WHERE "memories"."external_id" is not null;--> statement-breakpoint
CREATE INDEX "memories_source_app_id_session_id_idx" ON "memories" USING btree ("source_app_id","session_id") WHERE "memories"."session_id" is not null;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_provenance_check" CHECK ("memories"."provenance" in ('user_stated', 'user_confirmed', 'app_observed', 'app_inferred', 'imported'));--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_visibility_check" CHECK ("memories"."visibility" in ('shared', 'app_private'));--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_confidence_check" CHECK ("memories"."confidence" between 0 and 1);--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_importance_check" CHECK ("memories"."importance" between 1 and 5);