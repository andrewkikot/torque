CREATE TYPE "public"."ai_provider" AS ENUM('anthropic', 'openai', 'google', 'openrouter', 'groq', 'openai_compatible');--> statement-breakpoint
CREATE TYPE "public"."author" AS ENUM('owner', 'shop', 'bot', 'ai');--> statement-breakpoint
CREATE TYPE "public"."event_kind" AS ENUM('status', 'note', 'photo', 'work', 'approval_request', 'approval_decision');--> statement-breakpoint
CREATE TYPE "public"."fuel" AS ENUM('petrol', 'diesel', 'hybrid', 'electric', 'lpg', 'other');--> statement-breakpoint
CREATE TYPE "public"."locale" AS ENUM('en', 'uk');--> statement-breakpoint
CREATE TYPE "public"."odometer_source" AS ENUM('web', 'telegram', 'service', 'ai');--> statement-breakpoint
CREATE TYPE "public"."transmission" AS ENUM('manual', 'automatic', 'cvt', 'dct', 'other');--> statement-breakpoint
CREATE TYPE "public"."units" AS ENUM('km', 'mi');--> statement-breakpoint
CREATE TYPE "public"."visit_status" AS ENUM('planned', 'dropped_off', 'diagnosing', 'awaiting_approval', 'waiting_parts', 'in_progress', 'quality_check', 'ready', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."work_category" AS ENUM('oil', 'filters', 'brakes', 'tires', 'suspension', 'engine', 'transmission', 'electrical', 'battery', 'cooling', 'ac', 'body', 'inspection', 'fluids', 'timing', 'other');--> statement-breakpoint
CREATE TYPE "public"."work_type" AS ENUM('labor', 'part', 'fluid');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
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
CREATE TABLE "ai_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"channel" text DEFAULT 'web' NOT NULL,
	"role" text NOT NULL,
	"parts" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"provider" "ai_provider" NOT NULL,
	"model" text NOT NULL,
	"base_url" text,
	"encrypted_key" text NOT NULL,
	"iv" text NOT NULL,
	"tag" text NOT NULL,
	"key_hint" text NOT NULL,
	"temperature" real DEFAULT 0.4 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_tested_at" timestamp with time zone,
	"last_test_ok" boolean,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cars" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"year" integer,
	"nickname" text,
	"vin" text,
	"plate" text,
	"engine" text,
	"fuel" "fuel" DEFAULT 'petrol' NOT NULL,
	"transmission" "transmission",
	"purchase_date" timestamp with time zone,
	"accent_color" text DEFAULT '#f97316' NOT NULL,
	"photo_url" text,
	"current_odometer" integer DEFAULT 0 NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"car_id" text NOT NULL,
	"name" text NOT NULL,
	"category" "work_category" DEFAULT 'other' NOT NULL,
	"interval_km" integer,
	"interval_months" integer,
	"last_done_at" timestamp with time zone,
	"last_done_odometer" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "odometer_readings" (
	"id" text PRIMARY KEY NOT NULL,
	"car_id" text NOT NULL,
	"value" integer NOT NULL,
	"source" "odometer_source" DEFAULT 'web' NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "reminders_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_visits" (
	"id" text PRIMARY KEY NOT NULL,
	"car_id" text NOT NULL,
	"title" text NOT NULL,
	"shop_name" text,
	"shop_contact" text,
	"status" "visit_status" DEFAULT 'planned' NOT NULL,
	"odometer" integer,
	"planned_at" timestamp with time zone,
	"eta" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"currency" text DEFAULT 'UAH' NOT NULL,
	"share_token" text NOT NULL,
	"share_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_visits_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "usage_counters" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"locale" "locale" DEFAULT 'en' NOT NULL,
	"units" "units" DEFAULT 'km' NOT NULL,
	"currency" text DEFAULT 'UAH' NOT NULL,
	"telegram_chat_id" text,
	"telegram_username" text,
	"telegram_link_code" text,
	"telegram_link_expires_at" timestamp with time zone,
	"notify_visit_updates" boolean DEFAULT true NOT NULL,
	"notify_maintenance" boolean DEFAULT true NOT NULL,
	"notify_mileage_nudge" boolean DEFAULT true NOT NULL,
	"default_car_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_telegram_chat_id_unique" UNIQUE("telegram_chat_id"),
	CONSTRAINT "user_settings_telegram_link_code_unique" UNIQUE("telegram_link_code")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"visit_id" text NOT NULL,
	"kind" "event_kind" NOT NULL,
	"author" "author" NOT NULL,
	"status" "visit_status",
	"message" text,
	"photo_url" text,
	"amount" numeric(12, 2),
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_items" (
	"id" text PRIMARY KEY NOT NULL,
	"car_id" text NOT NULL,
	"visit_id" text,
	"approved" boolean DEFAULT true NOT NULL,
	"category" "work_category" DEFAULT 'other' NOT NULL,
	"type" "work_type" DEFAULT 'labor' NOT NULL,
	"name" text NOT NULL,
	"part_number" text,
	"quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
	"cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'UAH' NOT NULL,
	"odometer" integer,
	"performed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"receipt_url" text,
	"diy" boolean DEFAULT false NOT NULL,
	"maintenance_plan_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cars" ADD CONSTRAINT "cars_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "odometer_readings" ADD CONSTRAINT "odometer_readings_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders_log" ADD CONSTRAINT "reminders_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_visits" ADD CONSTRAINT "service_visits_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_events" ADD CONSTRAINT "visit_events_visit_id_service_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."service_visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_visit_id_service_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."service_visits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_msg_user_idx" ON "ai_messages" USING btree ("user_id","channel","created_at");--> statement-breakpoint
CREATE INDEX "cars_user_idx" ON "cars" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "plans_car_idx" ON "maintenance_plans" USING btree ("car_id");--> statement-breakpoint
CREATE INDEX "odo_car_idx" ON "odometer_readings" USING btree ("car_id","recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reminders_key_idx" ON "reminders_log" USING btree ("user_id","key");--> statement-breakpoint
CREATE INDEX "visits_car_idx" ON "service_visits" USING btree ("car_id");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "events_visit_idx" ON "visit_events" USING btree ("visit_id","created_at");--> statement-breakpoint
CREATE INDEX "work_car_idx" ON "work_items" USING btree ("car_id","performed_at");--> statement-breakpoint
CREATE INDEX "work_visit_idx" ON "work_items" USING btree ("visit_id");