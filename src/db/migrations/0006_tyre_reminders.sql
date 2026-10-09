CREATE TYPE "public"."tyre_level" AS ENUM('soon', 'now', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."tyre_target" AS ENUM('winter', 'summer');--> statement-breakpoint
CREATE TYPE "public"."tyre_season" AS ENUM('summer', 'winter', 'all_season');--> statement-breakpoint
CREATE TABLE "tyre_advice" (
	"car_id" text PRIMARY KEY NOT NULL,
	"target" "tyre_target" NOT NULL,
	"level" "tyre_level" NOT NULL,
	"reason" jsonb NOT NULL,
	"place" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"snoozed_until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "weather_cache" (
	"cell" text PRIMARY KEY NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_modified" text,
	"days" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cars" ADD COLUMN "tyre_season" "tyre_season";--> statement-breakpoint
ALTER TABLE "cars" ADD COLUMN "tyre_season_set_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "weather_lat" real;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "weather_lon" real;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "weather_place" text;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "notify_tyres" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "tyre_advice" ADD CONSTRAINT "tyre_advice_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE cascade ON UPDATE no action;