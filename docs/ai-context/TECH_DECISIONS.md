# TECH_DECISIONS

> Which technologies do we use, and how do we choose new ones?

Status: **v1.0**, 2026-11-05

Legend: ✅ **Decided** · 🟡 **Recommended** (adopt when needed) · ⏳ **Later**

---

## 1. Principles

1. **Boring and proven.** One tool per job.
2. **Supabase first** for data, files and (later) auth.
3. **Server owns the keys.** Google and Supabase secrets never reach the browser.
4. **Cheap to run.** Free tiers where possible. Model calls are the real cost, so every call is logged.
5. **Replaceable edges.** All model calls go through `src/lib/ai/`. Swapping a model is a one-file change.
6. **Exact versions.** No `^` or `latest`. Lockfile committed.

## 2. Stack <!-- LIVING: versions as pinned in package.json -->

| Area | Choice | Version |
|---|---|---|
| Runtime / package manager | Node.js / npm | 24.15 / 11.12 |
| Framework | Next.js (App Router, `src/`, Turbopack, Cache Components) | 16.4.3 |
| UI | React / React DOM | 19.3.0 |
| Language / styling | TypeScript (strict) / Tailwind CSS 4 | 5.9.3 / 4.3.3 |
| Design system | Cinematic Dark (better-design.com registry, shadcn-compatible, Radix primitives) | installed as source |
| Beam effect | `border-beam` (via Beam Lib's wrapper) | 1.4.1 |
| Motion / icons | `motion` / `@iconify/react` (Solar set) + `lucide-react` | 12.43.0 / 6.0.4 / 0.577.0 |
| AI | `@google/genai` with `vertexai: true` | 2.32.0 |
| Database / storage | Supabase (`@supabase/supabase-js`) | 2.118.0 |
| Validation / data | `zod` / `@tanstack/react-query` | 4.6.7 / 5.105.0 |
| Toasts | `sonner` | 2.0.8 |
| Tests | Vitest / Playwright | 5.0.5 / 1.64.1 |
| Tooling | `supabase` CLI | 2.122.0 |
| Hosting | Local now; Vercel later | — |

## 3. Architecture

| Decision | Status | Why |
|---|---|---|
| One Next.js app, UI and API together | ✅ | One person, one deploy |
| Server-only data access with the Supabase secret key | ✅ | No sign-in, so no browser sessions. RLS on, no policies, so public keys see nothing |
| Private `media` bucket, signed URLs | ✅ | Files stay private even when deployed |
| Video as a background job: store the Vertex operation, poll it | ✅ | Veo takes minutes. The UI shows progress and survives a reload |
| Job polling from the client while a job is open, plus a sweep on each page load | ✅ | No extra worker service in v1 |
| Vercel Cron or Supabase Edge Function for polling | 🟡 | When deployed, so jobs finish with the tab closed |
| Supabase Auth + RLS per owner | ⏳ | When going multi-user |
| Stripe | ⏳ | When going paid |

## 4. Vertex AI auth

| Where | How |
|---|---|
| Local | Application Default Credentials (`gcloud auth application-default login`), or the key below |
| Vercel | `GOOGLE_SERVICE_ACCOUNT_KEY_B64`: base64 of a service account JSON key with the **Vertex AI User** role |

Project and region come from `GOOGLE_CLOUD_PROJECT` and `GOOGLE_CLOUD_LOCATION` (default `global`). Some models need a region such as `us-central1`; set it per model in `src/lib/ai/models.ts` if so.

## 5. Vercel notes (for later)

- Video jobs: route handlers must return fast. Start the operation, store its name, return. Polling is a separate short request.
- Large files: upload straight to Supabase Storage with a signed upload URL, not through a Vercel function (body size limits).
- Supabase free plan caps a single file at 50 MB. Long 4K video needs the Pro plan or a lower resolution.

## 6. Adding technology

Ask the owner first. Write the reason, the cost and the alternative in this doc in the same change.
