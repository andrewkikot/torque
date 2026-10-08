# 🔧 Torque — online car service book

A friendly, mobile-first service book for your cars:

- **Live service tracking**: share a link with your mechanic, follow status, photos and costs, and approve extra work with one tap (in the app or in Telegram).
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

## How it fits together

```
src/
  app/(marketing)/          landing
  app/sign-in/              magic link
  app/(app)/                garage, cars/[id]/{history,maintenance,visits,edit}, visits, assistant, settings
  app/v/[token]/            public mechanic page (no account; token-authorized)
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
- Mechanic links are unguessable 21-character tokens. Owners can disable or rotate a link. The page shows only basic car info: no VIN and no owner details.
- Telegram webhook requests are checked with Telegram's secret header. Cron and setup endpoints require `CRON_SECRET`.
- Uploaded photos are public Blob URLs with random suffixes, so anyone who has the URL can open them.
