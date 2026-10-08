CREATE TYPE "public"."telegram_login_status" AS ENUM('pending', 'approved', 'consumed', 'declined');--> statement-breakpoint
CREATE TABLE "telegram_logins" (
	"id" text PRIMARY KEY NOT NULL,
	"status" "telegram_login_status" DEFAULT 'pending' NOT NULL,
	"user_id" text,
	"device" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "telegram_logins" ADD CONSTRAINT "telegram_logins_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;