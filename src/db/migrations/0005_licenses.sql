CREATE TYPE "public"."license_status" AS ENUM('new', 'active', 'revoked');--> statement-breakpoint
CREATE TABLE "licenses" (
	"id" text PRIMARY KEY NOT NULL,
	"key_hash" text NOT NULL,
	"key_hint" text NOT NULL,
	"plan" text DEFAULT 'pro' NOT NULL,
	"seats" integer DEFAULT 5 NOT NULL,
	"duration_days" integer NOT NULL,
	"note" text,
	"status" "license_status" DEFAULT 'new' NOT NULL,
	"workshop_id" text,
	"activated_by" text,
	"activated_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "licenses_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_activated_by_user_id_fk" FOREIGN KEY ("activated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "licenses_workshop_idx" ON "licenses" USING btree ("workshop_id","status");