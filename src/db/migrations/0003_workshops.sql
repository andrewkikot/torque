CREATE TYPE "public"."workshop_role" AS ENUM('owner', 'mechanic');--> statement-breakpoint
ALTER TYPE "public"."author" ADD VALUE IF NOT EXISTS 'customer';--> statement-breakpoint
CREATE TABLE "visit_subscribers" (
	"visit_id" text NOT NULL,
	"telegram_chat_id" text NOT NULL,
	"locale" "locale" DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workshop_invites" (
	"token" text PRIMARY KEY NOT NULL,
	"workshop_id" text NOT NULL,
	"role" "workshop_role" DEFAULT 'mechanic' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_by" text,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workshop_members" (
	"workshop_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "workshop_role" DEFAULT 'mechanic' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workshops" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"city" text,
	"address" text,
	"phone" text,
	"accent_color" text DEFAULT '#0ea5e9' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "service_visits" DROP CONSTRAINT "service_visits_car_id_cars_id_fk";
--> statement-breakpoint
ALTER TABLE "service_visits" ALTER COLUMN "car_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "work_items" ALTER COLUMN "car_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cars" ADD COLUMN "checkin_code" text;--> statement-breakpoint
ALTER TABLE "service_visits" ADD COLUMN "workshop_id" text;--> statement-breakpoint
ALTER TABLE "service_visits" ADD COLUMN "vehicle_make" text;--> statement-breakpoint
ALTER TABLE "service_visits" ADD COLUMN "vehicle_model" text;--> statement-breakpoint
ALTER TABLE "service_visits" ADD COLUMN "vehicle_year" integer;--> statement-breakpoint
ALTER TABLE "service_visits" ADD COLUMN "vehicle_plate" text;--> statement-breakpoint
ALTER TABLE "service_visits" ADD COLUMN "vehicle_vin" text;--> statement-breakpoint
ALTER TABLE "service_visits" ADD COLUMN "customer_name" text;--> statement-breakpoint
ALTER TABLE "service_visits" ADD COLUMN "customer_phone" text;--> statement-breakpoint
ALTER TABLE "visit_events" ADD COLUMN "author_name" text;--> statement-breakpoint
ALTER TABLE "visit_subscribers" ADD CONSTRAINT "visit_subscribers_visit_id_service_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."service_visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_invites" ADD CONSTRAINT "workshop_invites_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_invites" ADD CONSTRAINT "workshop_invites_used_by_user_id_fk" FOREIGN KEY ("used_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_members" ADD CONSTRAINT "workshop_members_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_members" ADD CONSTRAINT "workshop_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshops" ADD CONSTRAINT "workshops_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "visit_subscriber_idx" ON "visit_subscribers" USING btree ("visit_id","telegram_chat_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workshop_member_idx" ON "workshop_members" USING btree ("workshop_id","user_id");--> statement-breakpoint
CREATE INDEX "workshop_member_user_idx" ON "workshop_members" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "service_visits" ADD CONSTRAINT "service_visits_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_visits" ADD CONSTRAINT "service_visits_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "visits_workshop_idx" ON "service_visits" USING btree ("workshop_id","status");--> statement-breakpoint
ALTER TABLE "cars" ADD CONSTRAINT "cars_checkin_code_unique" UNIQUE("checkin_code");