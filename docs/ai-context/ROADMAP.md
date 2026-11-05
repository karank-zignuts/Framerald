# ROADMAP

> What's next and why?

Status: **v1.0**, 2026-11-05

Legend: ⬜ not started · 🟦 in progress · ✅ done

---

## 1. Where we are <!-- LIVING -->

Phase 0 is done in code. Before Phase 1 can run against real services, two things need the owner: a Supabase project (create and link it, then push the migration) and Vertex AI credentials in `.env.local`.

## 2. Phases

### Phase 0: Foundation 🟦
- ✅ Next.js 16 scaffold, pinned versions, lint, typecheck
- ✅ Cinematic Dark tokens and core components, BorderBeam, emerald brand tokens
- ✅ Vertex AI client (ADC locally, service account key on Vercel), Zod env
- ✅ Supabase schema (owners, projects, presets, generations, assets, agent, usage, credits) + private media bucket
- ✅ Skill team and `/feature` pipeline
- ✅ Context docs
- ✅ Vitest and Playwright (Organizr method), smoke and shots specs
- ⬜ Owner: create the Supabase project, link it, push the migration
- ⬜ Owner: Google Cloud project with Vertex AI enabled, credentials in `.env.local`

**Gate:** app runs locally, all checks pass, migration applied, one test call to Vertex AI succeeds.

### Phase 1: Image Studio + basic Library ⬜
- App shell (sidebar: Image, Video, Agent, Library)
- Prompt box, aspect ratio, count, reference images, image edit
- Generation rows, storage, thumbnails, cost logging
- Library grid with favourites and re-run

**Gate:** make, edit and find an image end to end, with cost shown.

### Phase 2: Agent ⬜
- Chat threads with Gemini
- Prompt refine, shot list and storyboard planning
- "Send to Image / Video Studio" from the plan

**Gate:** idea → planned shots → generated frames in one flow.

### Phase 3: Video Studio + Presets ⬜
- Text to video, image to video (first/last frame)
- Background jobs with progress, survives reload
- Camera-move and style presets

**Gate:** a planned shot becomes a finished clip in the Library.

### Phase 4: Library, spend and polish ⬜
- Projects, filters, search
- Spend view from `usage_events`
- Performance and accessibility pass, `APP_PASSWORD`, Vercel deploy

### Later: Paid platform ⏳
- Supabase Auth, RLS per owner, Stripe credits, pricing page

## 3. Changelog <!-- LIVING: append-only -->

| Date | Change |
|---|---|
| 2026-11-05 | Plan approved. Phase 0 built: scaffold, design system, Vertex client, schema, skills, docs, test setup. |
