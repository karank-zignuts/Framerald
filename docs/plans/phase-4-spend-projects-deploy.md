# Plan: Phase 4, Library, spend and deploy readiness

Date: 2026-11-05. Done when: you can see what you've spent, organise work into projects and find it by search, and the app can be put behind a password and deployed to Vercel by you without code changes. No migration, no real model calls, no deploy by me.

## What was checked

- Next 16 `proxy.ts` (docs read): runs on the **Node** runtime by default, so `node:crypto` works; without a `matcher` it runs on every request including `_next/static`, so the matcher excludes static assets.
- Tables needed already exist: `projects`, `generations.project_id`, `assets.project_id`, `agent_threads.project_id`, `usage_events`.

## Assumptions (decided without asking)

1. **No migration.** Search uses `ilike` on the joined generation prompt through supabase-js's `.ilike()` (parameterised), with `%`, `_` and `\` escaped. Slow at huge scale, fine for one person.
2. **Spend is read from `usage_events`** (the paid-call ledger), grouped by UTC day. Generations and agent messages with an unknown price are counted separately, so the total is honest about what it can't see. Image, video and agent come from `unit_type`.
3. **Projects**: soft delete only hides the project from lists and pickers; its items stay in All. The current project is remembered in the browser (`localStorage`) and applies to new images, clips and chats.
4. **Password gate** (`APP_PASSWORD` set): HMAC-SHA256 signed cookie `framerald_session` (httpOnly, sameSite lax, secure on https, 30 days). The signing key is derived from `APP_PASSWORD` plus an optional `SESSION_SECRET`, so changing either signs everyone out. Login is rate limited per IP with exponential backoff (in memory, so per serverless instance; documented). Empty password means open, as now.
5. **Cron route** `/api/cron/videos` only works when `CRON_SECRET` is set and the bearer token matches (constant time). It refreshes running clips and sweeps stuck ones. It is allowed through the gate by the token alone. No schedule goes in `vercel.json`; DEPLOY.md says how to add one.
6. **Uploads go straight to Supabase Storage** with a signed upload URL, because Vercel functions reject bodies over 4.5 MB. The old multipart route is removed. `complete` downloads the object, checks the real bytes with sharp, makes the thumbnail, inserts the asset, and deletes everything on failure. A client that never calls `complete` leaves one orphan file (accepted, documented).
7. Real clips and images: none. Everything runs on the mock.

## Slices

| # | Slice | Verified by |
|---|---|---|
| A | Pure logic, tests first: spend aggregation, search escaping, session sign/verify, login rate limit, service-account parsing, file extension from mime type, upload sign schema, project schemas | Vitest |
| B | Server: auth routes and `proxy.ts`, cron route, spend route, projects CRUD, library search and project filter and move, signed uploads | API e2e on the open server; gate e2e on a second server with `APP_PASSWORD` |
| C | UI: Spend page, project picker (Image, Video, Agent), Library search and project filter and move, login page, sign out, new upload client | Playwright, screenshots |
| D | Polish: axe accessibility spec and fixes, lazy video tiles, copy pass through Humanizer, real download extension | axe spec, build sizes |
| E | DEPLOY.md, review, docs, push | whole suite, build, review agent |

## Risks

| Risk | Handling |
|---|---|
| Gate locks you out locally | Empty `APP_PASSWORD` leaves everything open; the main suite runs open |
| Cookie forged or replayed | HMAC with a derived secret, expiry inside the signed payload, constant-time compare |
| Brute force on login | Per-IP backoff; documented as per-instance on serverless |
| Search injection | Only `.ilike()` with an escaped pattern; the cursor `.or()` string is untouched and already validated |
| Signed upload abused | `sign` caps size and type; `complete` re-checks the real bytes and size and deletes on failure |
| Cron route exposed | Disabled unless `CRON_SECRET` is set; bearer compared in constant time |
