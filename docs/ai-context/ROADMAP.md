# ROADMAP

> What's next and why?

Status: **v1.0**, 2026-11-05

Legend: ⬜ not started · 🟦 in progress · ✅ done

---

## 1. Where we are <!-- LIVING -->

Phases 0 to 4 are done. Image Studio, Agent, Video Studio, presets, Library, projects, search and Spend work end to end, and the app can sit behind a password. Owner steps pending: apply migration `20261105000002` (`npx supabase db push --linked`) and deploy using `docs/DEPLOY.md`. Next: a layout study of the Higgsfield Image and Video sections, for you to confirm before any change.

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

### Phase 3: Video Studio + Presets ✅
- Text to video, image to video (first/last frame)
- Background jobs with progress, survives reload
- Camera-move and style presets

Built: `/video` with live cost estimate, text to video and image to video (first and last frame from upload or the Library), Veo 3.1 Lite, Fast and standard, 4 to 8 second clips, optional sound; jobs that survive a reload and finish exactly once; built-in camera and look presets plus your own; Library with video tiles, inline player and an All/Images/Videos/Favourites filter; Send to Video on agent cards; Animate this image from the Library. Plan and decisions: `docs/plans/phase-3-video-presets.md`.

**Done when:** a planned shot becomes a finished clip in the Library.

### Phase 4: Library, spend and polish ✅
- Projects, filters, search
- Spend view from `usage_events`
- Performance and accessibility pass, `APP_PASSWORD`, Vercel readiness (you deploy)

Built: `/spend` (month to date, last 30 days, by day, by kind, by model, most expensive, unknown-cost count); projects (create, rename, delete, picker in both studios and the Agent, Library filter and move); Library search; password gate (`proxy.ts`, signed cookie, login limiter, `/login`, sign out); `/api/cron/videos` behind `CRON_SECRET`; signed direct uploads; correct download extensions; axe scan of every screen; lazy video tiles; copy pass. Deploy steps: `docs/DEPLOY.md`. Plan: `docs/plans/phase-4-spend-projects-deploy.md`.

**Done when:** you can see what you've spent, find and group your work, and put the app behind a password and deploy it yourself.

### Later: Paid platform ⏳
- Supabase Auth, RLS per owner, Stripe credits, pricing page

## 3. Changelog <!-- LIVING: append-only -->

| Date | Change |
|---|---|
| 2026-11-05 | Plan approved. Phase 0 built: scaffold, design system, Vertex client, schema, skills, docs, test setup. |
| 2026-11-05 | Supabase migration pushed. Vertex AI verified. Model IDs recorded in `models.ts`. |
| 2026-11-05 | Phase 1 built: Image Studio, Library, generation service, uploads, thumbnails, cost logging. Verified with a real generate and a real edit (about $0.04 each). |
| 2026-11-05 | Phase 2 built: Agent page, streaming shot lists, prefill into the Image Studio, Refine with agent. Verified with real calls (plan about $0.003, refine about $0.002). |
| 2026-11-05 | Phase 3 built: Video Studio, background jobs, presets, video in the Library. Verified with one real Veo 3.1 Lite clip (4 s, 720p, no sound, about $0.12). |
| 2026-11-05 | Layout rebuild after studying Higgsfield (layout only, nothing copied): collapsible sidebar, docked Image composer with chip menus, media and model pickers, masonry results with a View menu, tile hover actions and names, Agent-mode dock, estimated price on Generate, costs in rupees, balance chip, shimmer loading, zinc dark palette, accent #7ad950. Plan: `docs/plans/phase-5-layout.md`. |
| 2026-11-05 | Phase 4 built: Spend page, projects, Library search, password gate and cron route, signed direct uploads, accessibility scan, `docs/DEPLOY.md`. No real model calls. |
