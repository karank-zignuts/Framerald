# Deploying Framerald to Vercel

You deploy it yourself. Nothing in this repo touches Vercel. Plan on about 20 minutes the first time.

## 1. Environment variables

Set these in Vercel (Project Settings, Environment Variables). Never commit them.

| Variable | Required | What it is |
|---|---|---|
| `SUPABASE_URL` | yes | Project URL from Supabase, Project Settings, API |
| `SUPABASE_SECRET_KEY` | yes | The secret key (server only). Never expose it to the browser |
| `GOOGLE_CLOUD_PROJECT` | yes | Your Google Cloud project id |
| `GOOGLE_CLOUD_LOCATION` | yes | `global` works for Gemini. Veo only runs in `us-central1`, the app handles that itself |
| `GOOGLE_SERVICE_ACCOUNT_KEY_B64` | yes on Vercel | Base64 of a service account JSON key (see below) |
| `APP_PASSWORD` | yes for a public URL | The one password for the whole app. Empty means open, which is only right on your own machine |
| `SESSION_SECRET` | strongly recommended | A long random string mixed into the cookie signing key (`openssl rand -base64 32`). Without it the key comes from the password alone, so a copied cookie could be used to guess a weak password offline. Changing it, or `APP_PASSWORD`, signs everyone out |
| `NEXT_PUBLIC_USD_INR` | optional | Rupees per US dollar for the amounts shown in the app (default 88). Prices are stored in USD; this only changes the display. Set it before the build |
| `CRON_SECRET` | optional | Enables `/api/cron/videos`. Unset means that route answers 404 |

### Making `GOOGLE_SERVICE_ACCOUNT_KEY_B64`

1. In Google Cloud, IAM, Service Accounts, create one and give it the **Vertex AI User** role.
2. Keys, Add key, JSON. Download `key.json`.
3. Encode it on one line and paste the result into Vercel:

```bash
base64 -i key.json | tr -d '\n'
```

4. Delete `key.json` from your machine when you're done.

If the value is wrong the app says so without printing the key.

## 2. Database

The schema lives in `supabase/migrations`. Apply it to the linked project:

```bash
npx supabase db push --linked --dry-run
```

```bash
npx supabase db push --linked
```

`20261105000002_widen_agent_cost.sql` widens `cost_usd` to 6 decimals so cheap agent calls aren't rounded to zero. The app works without it (costs round to 4 decimals), but apply it before you rely on the Spend page for small calls.

## 3. Function durations and region

| Route | `maxDuration` | Why |
|---|---|---|
| `/api/generations` | 300 s | Image generation waits on Google |
| `/api/agent/threads/[id]/messages` | 300 s | The agent can think for a while |
| `/api/agent/refine-prompt` | 120 s | One short model call |
| `/api/videos` | 120 s | Only starts the clip |
| `/api/videos/[id]` | 120 s | Checks the clip and saves it once it's done |
| `/api/cron/videos` | 60 s | Refreshes running clips |

Vercel's limits depend on your plan, and 300 s needs Fluid compute or a paid plan. Check your plan's current limit and lower these numbers if it's smaller. Put the functions in a region near your Supabase project.

Uploads go straight from the browser to Supabase Storage with a signed URL, because Vercel functions reject request bodies over 4.5 MB. The app then checks the real bytes before keeping the file.

## 4. Finishing clips with the tab closed

While a tab is open, the browser polls each running clip. To finish clips when nothing is open, call the cron route on a schedule. It needs `CRON_SECRET` set and the header `Authorization: Bearer <CRON_SECRET>`. It skips the password gate by that token alone.

There is no schedule in `vercel.json`, because the Hobby plan rejects frequent crons. Pick one:

- Vercel Cron on a plan that allows it: add `crons` to `vercel.json` yourself, for example every 5 minutes on `/api/cron/videos`. Vercel sends the bearer header when `CRON_SECRET` is set.
- Any outside scheduler (GitHub Actions, cron-job.org) calling:

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/cron/videos
```

## 5. Known limits

- The login rate limit lives in memory, so each serverless instance counts on its own. It slows guessing down but isn't a hard cap. Use a long `APP_PASSWORD`.
- The limiter keys on the `x-forwarded-for` header. Vercel sets it itself; behind another proxy a client could vary it.
- Signing out clears the cookie but can't revoke a copy of it. A copied cookie works for up to 30 days unless you change `APP_PASSWORD` or `SESSION_SECRET`.
- If a browser gets a signed upload URL and never completes the upload, one unused file stays in storage. It is small and harmless.
- Spend numbers are estimates from Google's list prices. Google's bill is the real figure.

## 6. Before you deploy

- [ ] `npm run lint && npm run typecheck && npm test` pass
- [ ] `npm run build` passes
- [ ] The Supabase migrations are applied
- [ ] All required variables are set in Vercel
- [ ] `APP_PASSWORD` and `SESSION_SECRET` are set (otherwise anyone with the URL can spend your credits)
- [ ] The service account has only the Vertex AI User role
- [ ] After deploy: open the URL, confirm it sends you to `/login`, sign in, make one image
