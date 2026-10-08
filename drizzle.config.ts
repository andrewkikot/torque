import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  // Migrations prefer the direct (unpooled) Neon connection when available.
  dbCredentials: {
    url: (process.env.DATABASE_URL_UNPOOLED ?? process.env.TORQUE_DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? process.env.TORQUE_DATABASE_URL)!,
  },
});
