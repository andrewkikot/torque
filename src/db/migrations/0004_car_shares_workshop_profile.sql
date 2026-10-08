CREATE TABLE "car_shares" (
	"car_id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"options" jsonb NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "car_shares_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "workshops" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "workshops" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "workshops" ADD COLUMN "hours" text;--> statement-breakpoint
ALTER TABLE "workshops" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "workshops" ADD COLUMN "telegram" text;--> statement-breakpoint
ALTER TABLE "car_shares" ADD CONSTRAINT "car_shares_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE cascade ON UPDATE no action;