/** Registers the Telegram webhook + command menu for the deployed app: npm run telegram:setup */
import { config } from "dotenv";
config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_APP_URL;
const secret = process.env.CRON_SECRET;
if (!url || !secret) throw new Error("Set NEXT_PUBLIC_APP_URL and CRON_SECRET (to your production values)");

fetch(`${url}/api/telegram/setup`, { headers: { authorization: `Bearer ${secret}` } })
  .then(async (r) => console.log(r.status, JSON.stringify(await r.json().catch(() => r.statusText), null, 2)))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
