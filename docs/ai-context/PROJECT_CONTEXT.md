# PROJECT_CONTEXT

> What is Framerald, and why does it exist?
> Read this first. The other docs build on it.

Status: **v1.0**, 2026-11-05

---

## 1. Identity

**Framerald** is a personal studio for making images and short videos with Google's models on Vertex AI. It takes ideas from Higgsfield-style creative tools, but it is our own product with our own design. We don't copy Higgsfield's name, branding, assets or text.

Positioning:

> **Plan the shot. Make the frame.**

Framerald is **not** (for now):
- a multi-user SaaS (one owner, no sign-in)
- a social or community site
- a video editor (it makes clips, it doesn't cut timelines)

## 2. Owner and users

One user: the owner. The app runs on the owner's machine, and later on Vercel behind one password (`APP_PASSWORD`).

The data model is ready for many users and paid plans later (see §6). Nothing in v1 depends on that.

## 3. Modules

| # | Module | What it does | Phase |
|---|---|---|---|
| 1 | **Image Studio** | Text to image, edit an image, reference images, aspect ratio, count, seed | 1 |
| 2 | **Agent** | Chat that rewrites prompts, plans shot lists and storyboards, then sends each shot to Image or Video Studio | 2 |
| 3 | **Video Studio** | Text to video, image to video (first/last frame), camera move presets, length, aspect ratio, audio | 3 |
| 4 | **Library** | Every generation and asset: grid, filters, favourites, projects, re-run with the same settings | 1 (basic), 4 (full) |
| 5 | **Presets** | Saved style and camera-move prompts, built-in and our own | 3 |
| 6 | **Spend** | What each generation cost, by day and by model | 4 |

## 4. Core flow

```text
Prompt (typed, or planned by the agent)
  → our API route validates it and writes a `generations` row (queued)
  → server calls Vertex AI
      images: wait for the result
      video:  store the long-running operation name, poll until done
  → file saved to the private `media` bucket, `assets` row written
  → usage_events row records the cost
  → UI shows the result and keeps it in the Library
```

## 5. Models (confirm at the start of each phase)

Google renames and replaces models often. Check the current Vertex AI model list with the `gemini-api-dev` skill before building a phase, and keep model IDs in one file (`src/lib/ai/models.ts`).

| Job | Family today |
|---|---|
| Image make / edit | `gemini-nano-banana-2.1` (default), `gemini-3-pro-image`, `gemini-3.1-flash-image` |
| Video | `veo-3.1-generate-001` / `-fast-` / `-lite-` (us-central1 only), `gemini-omni-1.1-flash-preview` |
| Agent | `gemini-3.5-flash` (default), `gemini-3.1-pro-preview` (deep) |

IDs confirmed against this project on 2026-11-05 and kept in `src/lib/ai/models.ts`. Only the agent model has answered a real call so far.

## 6. Ready for money later

Already in the schema, unused for now:
- `owner_id` on every row and an `owners` table that maps to `auth.users` later
- `usage_events`: real cost per call, the base for pricing
- `credit_ledger`: append-only credits, for when billing exists

Going paid later means: Supabase Auth, RLS policies per owner, Stripe (credit packs or subscriptions), a pricing page. Skills `stripe-best-practices` and `pricing` are installed for that.

## 7. Decisions log <!-- LIVING -->

| Date | Decision |
|---|---|
| 2026-11-05 | Name: Framerald. Vertex AI on Google Cloud. New Supabase project. Local first, Vercel-ready. |
| 2026-11-05 | Design: Cinematic Dark + BorderBeam from Beam Lib + emerald brand accent. |
| 2026-11-05 | No sign-in in v1. Browser never talks to Supabase; server uses the secret key. |
