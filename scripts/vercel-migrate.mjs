// Runs DB migrations during Vercel *production* builds (sensitive Neon vars are only readable there).
import { execSync } from "node:child_process";

if (process.env.VERCEL_ENV !== "production") {
  console.log(`[migrate] skipped (VERCEL_ENV=${process.env.VERCEL_ENV ?? "local"})`);
  process.exit(0);
}
const url =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.TORQUE_DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? process.env.TORQUE_DATABASE_URL;
if (!url) {
  console.error("[migrate] no database URL found");
  process.exit(1);
}
// Log only the non-secret region part of the host, e.g. "aws-eu-central-1".
const host = new URL(url).hostname;
console.log(`[migrate] database region: ${host.match(/\.([a-z0-9-]+)\.aws\.neon\.tech$/)?.[1] ?? host.split(".").slice(-4).join(".")}`);
execSync("npx drizzle-kit migrate", { stdio: "inherit" });
