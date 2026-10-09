# 🔧 Torque — online car service book

A friendly, mobile-first service book for your cars:

- **Workshops run the visits, owners follow along**:
  - Workshops get a team account (owner plus invited mechanics) with a job board.
  - At drop-off the owner taps **Show to mechanic**. The mechanic scans the one-time QR with the phone camera, or types the `TQ-` code, and the job is attached to the car.
  - Customers without Torque get a tracking link they can follow on the web or in Telegram, and can later save the job to a garage.
  - Owners see status, photos and costs on the car page and in Telegram, approve extra work with one tap, and message the workshop. Finished work goes into the service book automatically.
- **Service book**: every repair, part and receipt on one timeline, with spend stats and a print/PDF export.
- **Smart maintenance**: reminders by distance and by date, predicted from how much you actually drive.
- **Cars**: add, edit, archive, delete, and personalize each car with a nickname, accent color and photo.
- **AI mechanic assistant (bring your own key)**: works with Gemini, Groq, OpenRouter, Anthropic, OpenAI or any OpenAI-compatible endpoint. It can read your garage and, after you confirm, log mileage, work, visits and reminders.
- **Telegram bot**: `/km 84500`, `/due`, `/visit`, approval buttons, daily reminders. If you've added an AI key, you can also write in plain language or send a photo of a receipt.
- English 🇬🇧 and Ukrainian 🇺🇦, light and dark mode, installable as a PWA.

## Free-tier architecture

| Piece | Service (free plan) | How it stays free |
|---|---|---|
| App + API | **Vercel Hobby** (Next.js 16) | Serverless functions only. Image optimization is turned off (`images.unoptimized`). No KV, Edge Config or other paid add-ons. |
| Database | **Neon Free** (0.5 GB, 100 CU-h) | `@neondatabase/serverless` HTTP driver and a lean schema. Files are kept out of the database. |
| Photos | **Vercel Blob** (Hobby: 1 GB) | Images are resized to ≤1600px WebP in the browser and uploaded directly from the client. Uploads are rate-limited. |
| Email | **Resend Free** (100/day) | Used only for magic links. |
| Reminders | **Vercel Cron** (Hobby: once a day) | A single daily job, `vercel.json` → `/api/cron/daily`. |
| Realtime | none | Visit pages re-fetch every 20–30 s while the tab is visible. |
| Rate limiting | Postgres | The `usage_counters` and `rate_limit` tables, so no Redis is needed. |
| AI | **The user's own key** | The project pays nothing. Keys are encrypted with AES-256-GCM. |

> Vercel Hobby is for non-commercial use.

## Local development

```bash
npm install
cp .env.example .env.local     # fill in values (see below)
npm run db:migrate             # apply migrations
npm run seed -- you@example.com   # optional demo garage
npm run dev
```

- Without `RESEND_API_KEY`, magic links are printed in the dev server console.
- `DATABASE_URL` can point to a local Postgres or to a Neon dev branch. The driver is picked automatically: Neon HTTP for `*.neon.tech`, `pg` otherwise.
- Generate the secrets:
  ```bash
  openssl rand -hex 32      # BETTER_AUTH_SECRET, CRON_SECRET, TELEGRAM_WEBHOOK_SECRET
  openssl rand -base64 32   # ENCRYPTION_KEY (must be exactly 32 bytes)
  ```

### Scripts

| Script | |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` / `lint` / `test` | Quality checks. The tests include DB integration tests, which run only against a non-Neon `DATABASE_URL`. |
| `npm run db:generate` / `db:migrate` / `db:studio` | Drizzle |
| `npm run seed -- email` | Demo data |
| `npm run telegram:setup` | Registers the bot webhook and command menu with the deployed URL |

## Deploying (all free)

1. **Neon**: create a project and copy the connection string into `DATABASE_URL`. Run `DATABASE_URL=... npm run db:migrate` once from your machine.
2. **Telegram**: talk to [@BotFather](https://t.me/BotFather), run `/newbot`, then copy the token into `TELEGRAM_BOT_TOKEN` and the bot's username (without `@`) into `TELEGRAM_BOT_USERNAME`.
3. **Resend (optional)**: create an API key and put it in `RESEND_API_KEY`. Without a verified domain you can only send to your own address. Verify a domain to send to anyone, and set `EMAIL_FROM`.
   - Without Resend, people use **Sign in with Telegram**. The bot asks them to confirm, the browser that started the sign-in is logged in, and a new account is created on first use. Email sign-in still works for accounts that have Telegram linked: the link is delivered in Telegram.
4. **Vercel**: push to GitHub and import the repo (or run `npx vercel`).
   - Under **Storage**, create a **Blob** store and connect it to the project. This adds `BLOB_READ_WRITE_TOKEN`.
   - Add the rest of `.env.example` under **Settings → Environment Variables**. Set `NEXT_PUBLIC_APP_URL` to your production URL.
   - Deploy. The cron in `vercel.json` is registered automatically.
5. **Register the Telegram webhook** (once, and again whenever the URL changes):
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" https://YOUR-APP.vercel.app/api/telegram/setup
   ```
6. Open the app, sign in, and connect AI and Telegram from **Settings**.

## Tyre reminders
Torque checks the local forecast every morning (in the existing daily cron) and tells owners when to swap tyres. Owners set their region in **Settings → Weather & tyres**, or send the bot a 📍 location. Each car records which tyres are on it.

The rule is the classic **+7 °C rule**:
- **Summer → winter (September–May):**
  - "time to switch" when 5 or more of the next 7 days average below +7 °C;
  - "switch now" if snow, or frost of −2 °C or colder, is forecast within 3 days.
- **Winter → summer (March–June):** when the whole next week stays above +7 °C with no frost.

Owners get one Telegram message per car per season, with **Swapped** (which logs it in the service book) and **In 3 days** buttons. The car page shows the advice with a 7-day outlook.

Forecasts come from **MET Norway Locationforecast** (`api.met.no`, the data behind yr.no). It's free, has no API key, and its licence allows commercial use with attribution. Requests send an identifying User-Agent and follow MET's caching headers. One forecast is cached per ~11 km cell and shared by everyone nearby.

## For workshops
1. Sign in and open **Settings → For workshops → Create a workshop** (or `/w/create`).
2. Invite mechanics from **Team**. The invite link is valid for 7 days.
3. **New job**:
   - Scan the customer's QR with the phone camera (it opens `/w/checkin/<code>`).
   - Or type their `TQ-` code.
   - Or add a walk-in customer and send them the tracking link.
4. Move statuses, add work and photos, and ask for approval. The owner or customer is notified in Telegram. Mechanics who connected Telegram get a message when the customer approves, declines or writes.

## Selling Pro to workshops
Car owners are always free. Workshops are on **Free** (owner + 1 mechanic, 30 new jobs per month, 3 photos per job, Torque branding) or **Pro** (unlimited jobs, more seats, 20 photos per job, their own branding, team Telegram alerts).

1. Add your email to `ADMIN_EMAILS` and open `/admin`.
2. **Issue keys**: choose months, seats and quantity, and add a note (invoice, buyer). Keys look like `TQ-PRO-XXXX-XXXX-XXXX`. They are shown **once**, and only their hash is stored.
3. Sell the key however you like. The workshop owner enters it in **Workshop → Plan**.
   - A second key extends Pro from the current end date.
   - Owners get Telegram reminders 7 days and 1 day before Pro ends.
4. When Pro ends, the workshop drops back to Free automatically. No data is deleted.

> ⚠️ **Commercial use:** Vercel's Hobby plan is non-commercial only. Keep `BILLING_ENABLED=false` there; with it off, nothing is limited and no prices are shown. Before charging money, move to Vercel Pro (or a host that allows commercial use), then set `BILLING_ENABLED=true`, `SALES_CONTACT` and `PRO_PRICE_LABEL`.

## How it fits together

```
src/
  app/(marketing)/          landing
  app/sign-in/              magic link
  app/(app)/                garage, cars/[id]/{history,maintenance,visits,edit}, visits, assistant, settings
  app/(workshop)/w/         workshop: job board, new job, QR check-in, job page, team, join/create
  app/v/[token]/            public customer tracking page (read-only + approvals; token-authorized)
  app/print/[id]/           printable service history
  app/actions/              server actions (thin wrappers around services)
  app/api/                  auth, chat (AI streaming), telegram webhook, cron, upload
  db/schema.ts              Drizzle schema + migrations
  lib/domain/               pure logic: visit status machine, maintenance prediction
  lib/services/             the domain layer, used by web, AI tools AND the bot; every call is user-scoped
  lib/ai/                   BYOK provider factory, key encryption, tools, prompt
  lib/bot/                  grammY bot (commands, approvals, AI chat)
messages/{en,uk}.json       translations shared by the web app and the bot
```

**Security notes**
- AI keys are encrypted at rest and never sent to the browser; the UI only shows a hint like `sk-…abcd`.
- AI write actions use AI SDK tool approvals, and the approvals are HMAC-signed. A tampered approval is rejected.
- Custom AI base URLs must use https, and private network addresses are blocked in production.
- Only members of the workshop can change a job. Owners and customers can only approve, decline and write notes.
- Check-in codes are single-use (the code changes after each check-in) and attempts are rate-limited. The owner is notified and can reply "Not my car".
- Customer tracking links are unguessable 21-character tokens. The workshop can rotate a link. The page shows no VIN and no owner details.
- Telegram webhook requests are checked with Telegram's secret header. Cron and setup endpoints require `CRON_SECRET`.
- Uploaded photos are public Blob URLs with random suffixes, so anyone who has the URL can open them.
