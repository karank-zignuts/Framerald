# ROADMAP

> What's next and why?

Status: **v1.0**, 2026-11-05

Legend: ⬜ not started · 🟦 in progress · ✅ done

---

## 1. Where we are <!-- LIVING -->

Phases 0, 1 and 2 are done. Image Studio, Library and the Agent work end to end against real Vertex AI and Supabase. One owner step is pending: apply migration `20261105000002` (`npx supabase db push --linked`). Next: Phase 3, Video Studio and Presets.

## 2. Phases

### Phase 0: Foundation ✅
- ✅ Next.js 16 scaffold, pinned versions, lint, typecheck
- ✅ Cinematic Dark tokens and core components, BorderBeam, emerald brand tokens
- ✅ Vertex AI client (ADC locally, service account key on Vercel), Zod env
- ✅ Supabase schema (owners, projects, presets, generations, assets, agent, usage, credits) + private media bucket
- ✅ Skill team and `/feature` pipeline
- ✅ Context docs
- ✅ Vitest and Playwright (Organizr method), smoke and shots specs
- ✅ Supabase project linked, migration pushed
- ✅ Vertex AI enabled, credentials working

**Done when:** app runs locally, all checks pass, migration applied, one test call to Vertex AI succeeds.

### Phase 1: Image Studio + basic Library ✅
- App shell (sidebar: Image, Video, Agent, Library)
- Prompt box, aspect ratio, count, reference images, image edit
- Generation rows, storage, thumbnails, cost logging
- Library grid with favourites and re-run

Built: left-rail shell, composer (prompt with beam, model, aspect ratio, size, 1 to 4 images, up to 14 references), edit through references, results with per-batch cost, Library with infinite scroll, detail dialog, favourites, soft delete with inline confirm, re-run settings and edit-this. Plan and decisions: `docs/plans/phase-1-image-studio.md`.

**Done when:** make, edit and find an image end to end, with cost shown.

### Phase 2: Agent ✅
- Chat threads with Gemini
- Prompt refine, shot list and storyboard planning
- "Send to Image / Video Studio" from the plan

Built: `/agent` with a chat list (new, rename, soft delete), streamed replies with Stop, shot lists as cards (Send to Image, Refine this shot), Refine with agent with Undo in the Image Studio, token cost logging. Shots send to Image only until the Video Studio exists. Plan and decisions: `docs/plans/phase-2-agent.md`.

**Done when:** idea → planned shots → generated frames in one flow.

### Phase 3: Video Studio + Presets ⬜
- Text to video, image to video (first/last frame)
- Background jobs with progress, survives reload
- Camera-move and style presets

**Done when:** a planned shot becomes a finished clip in the Library.

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
| 2026-11-05 | Supabase migration pushed. Vertex AI verified. Model IDs recorded in `models.ts`. |
| 2026-11-05 | Phase 1 built: Image Studio, Library, generation service, uploads, thumbnails, cost logging. Verified with a real generate and a real edit (about $0.04 each). |
| 2026-11-05 | Phase 2 built: Agent page, streaming shot lists, prefill into the Image Studio, Refine with agent. Verified with real calls (plan about $0.003, refine about $0.002). |
