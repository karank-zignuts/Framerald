# Framerald handover

Date: 2026-11-05. State: Phases 0 to 4 done and pushed (latest commit `723d63f`). Phase 5 (layout rebuild) is built and pushed.

## 1. Project state

- Phases 0 to 3: Image Studio, Agent, Video Studio, presets, Library. Verified with a few real Vertex calls (images about $0.04, one 4 s Veo clip about $0.12).
- Phase 4: Spend page, projects, Library search, password gate (`src/proxy.ts`), `/api/cron/videos`, signed direct uploads, axe accessibility spec, copy pass, `docs/DEPLOY.md`. No real model calls.
- Checks at the last run: lint, typecheck, 160 unit tests, 83 browser tests passed (1 skipped: the screenshot spec, which needs `E2E_SHOTS=1`), production build clean.
- Brand accent is green `#7ad950` (the owner's change; do not revert).
- Plans and outcomes: `docs/plans/phase-*.md`. Roadmap: `docs/ai-context/ROADMAP.md`.

## 2. Owner steps still open

- Apply migration `20261105000002`: `npx supabase db push --linked` (the code works without it; costs round to 4 decimals).
- Deploy to Vercel using `docs/DEPLOY.md`. Set `APP_PASSWORD` and `SESSION_SECRET`.
- Nothing has been deployed by Claude.

## 3. Known and accepted

- Spend reads at most 20,000 usage rows in the 30-day window.
- Login rate limit is per serverless instance and trusts `x-forwarded-for`.
- Sign out can't revoke a copied cookie (valid up to 30 days).
- Orphan upload files remain if a browser never completes an upload.
- Search is `ilike` on the joined prompt; add a trigram index if the Library gets large.
- Hallmark's per-file lint reports missing focus and state styles; they live in shared UI primitives and `globals.css` (waived in its stamp).

## 3b. Phase 5: layout rebuild (done 2026-11-05)

The owner confirmed the plan (sidebar kept and made collapsible, docked Image composer, no "How it works") and the work is built and tested. Details, decisions and accepted limits are in `docs/plans/phase-5-layout.md`. Sections 4 and 5 below are the original study and proposal, kept for reference.

## 4. The Higgsfield layout study (reference)

The owner asked: study https://higgsfield.ai/ai/ (Image and Video sections) hands-on, assume nothing, and rebuild the same layout. **No layout changes until the owner confirms.**

Method: a read-only browser pass at 1440x900 and 390x844, no account, no login, no credits spent. Screenshots are in `test-results/higgsfield-study/` (git-ignored; they may be deleted). Some details came from one pass and weren't double-checked, including the exact heading font size.

Real routes: `/ai/` is a 404. Use `/ai/image?model=gpt_image_2` and `/ai/video` (redirects to `?model=seedance_2_5`). Both are usable without a login.

### 4.1 Shared shell

- Top bar, transparent, about 36 px tall, no sidebar. Left to right: logo, nav, search icon, language icon, Enterprise, "Pricing -30%", Login (dark, lime border), Sign up (solid lime).
- Nav order: Explore, Image, Video, Audio, MCP, API, Genjutsu, Content Factory, Playable, Mangaka, AI Influencer, Academy, Katana, ChatGPT Plugin, Ads Studio, Effects, Cinema Studio, Contests, Marketing Studio, Supercomputer, Edit, Community, Plugins, Canvas, Originals. About 12 fit; the rest are clipped.
- Nav text 14 px, weight 500, white at 30% opacity. Active item is lime. Image, Video, Audio, MCP and Plugins open a mega-menu on hover.
- Image mega-menu: two columns, "Features" (Create Image, Cinematic Cameras, Canvas, Soul Moodboard, Soul ID Character, AI Influencer, Photodump, Relight, Inpaint, Image Upscale, Face Swap, Character Swap) and "Models" (about 14, with TOP/NEW badges). Each item has an icon tile, title and subtitle.
- No credits or plan indicator when logged out.
- Login modal: centred, about 1120x775, radius about 24. Left is a looping promo video with 4 progress tabs. Right has the logo, "Welcome to Higgsfield", Google / Apple / Microsoft buttons, an OR divider, an email field and a disabled Continue. Closes with Escape or X.
- Cookie banner: bottom-right card with Reject Advertising Cookies, Accept All Cookies (lime), Cookie Preferences. Promo strip: full-width lime bar with a close X.
- Image and Video pages have no footer.
- Tokens: page `#0F1113`, composer `#1C1E21`, left panel `#131517`, accent lime `#D1FE17`, on-accent text `#131517`. Radius 8 (chips), 12 (Generate), 16 (popovers), 20 (panels). Font Inter.

### 4.2 Image section (`/ai/image`)

- One full-width canvas; no side panel. A "View" button sits top-right.
- Empty state: four tilted, rounded sample photos (one a circle); heading "START CREATING WITH / HIGGSFIELD SOUL CINEMA" (condensed uppercase, white, second line lime); subtitle "Describe a scene, character, mood, or style and watch it come to life".
- An "Academy" pill toast sits under the nav with a white "Learn now" button and an X.
- Composer: bottom-docked at x=280 to 1160 (880 px wide), 124 px tall. Surface `#1C1E21`, radius 20, no border, shadow `0 32px 24px rgba(0,0,0,.15)`.
  - Prompt placeholder: "Describe the scene you imagine", 14 px.
  - Control row, left to right: "+" References, divider, Elements (circle icon), model chip with logo, aspect ("Auto"), quality ("High"), resolution ("2K"), count stepper "1/4" (minus disabled at 1, max 4).
  - Chips are 32 px tall, radius 8, background `rgba(255,255,255,.05)`, 16 px text.
  - Generate: 120x80, lime `#D1FE17`, text `#131517`, radius 12, label "GENERATE" with a spark icon, struck-through old cost and new cost (8.5 to 6.5). It has a 3D bottom edge (inset 3 px darker lime `#829B19`) and a layered drop shadow.
- Model picker: popover about 402x642, radius 16, `#1C1E21` at 95% opacity, opens above the composer. Search field, "Featured models" then "All models" (about 40). Each row has a logo tile, name, NEW or PREMIUM badge, one-line description. Closes with Escape.
  - Featured, in order: Higgsfield Soul 2.0, Higgsfield Soul Cinema, GPT Image 2.6 Sunburst (NEW), GPT Image 2.6 Flare (NEW), Nano Banana 2.1 (PREMIUM), Seedream 5.0 Pro, Seedream 5.0 Flash, Seedream 5.0 lite, Seedream 4.5, Nano Banana Pro.
- Aspect ratio menu (opens upward, shape icon per row, check on the selected one): Auto (default), 1:1, 3:2, 2:3, 16:9, 9:16, 4:3, 3:4, 21:9.
- Quality menu (title plus subtitle per row): Low "Fastest and cheapest", Medium "Balanced visuals", High "Best visual fidelity" (default).
- Resolution: 1K (1024 px), 2K (2048 px, default), 4K (4096 px).
- References and Elements both open the login modal when logged out.
- View popover: Layout (Square or Masonry, Masonry default), "Split by date" toggle, "Card size" slider. These control the history grid, which is gated.
- "Need help?" popover (bottom-right "?"): three canned questions, Help Center, Learn in Academy, "Ask the community on Discord".

### 4.3 Video section (`/ai/video`)

- Two columns. Left panel x=16 to 336 (320 px): background `#131517`, radius 20, border `1px rgba(217,217,217,.04)`. Right stage x=344 to 1424 (1080 px, y=44 to 872): transparent with a rounded border.
- Left panel, top to bottom:
  1. Mode tabs "Create Video | Edit Video | Motion Control" (white underline on active).
  2. Preset card: looping video thumbnail, uppercase lime title ("GENERAL"), model name, "Change" pill.
  3. Segmented toggle "References | Extend Video".
  4. Dashed upload tile "Add references. Image, Video or Audio" with three round icons.
  5. Prompt card (placeholder about "Describe the visual change you want, e.g. 'Make it snow'. Add reference images or elements using @"), with "Elements" and audio "On" chips.
  6. Model row (label "Model", value "Seedance 2.5", chevron).
  7. 2x2 settings grid: Duration, Aspect Ratio, Quality, Bitrate (label plus value, chevron).
  8. Generate: 56 px tall, pinned to the bottom, "Generate" plus spark plus credit cost (80 on Seedance 2.5; 10 on Higgsfield Standard), same 3D edge as Image.
- Duration: slider popover "Total duration" with ticks 4, 10, 15, 20, 30; on presets with fixed options it is a menu ("3s / 5s"). Aspect: 21:9, 16:9, 4:3, 1:1, 3:4, 9:16. Quality: 480p, 720p, 1080p. Bitrate: "High: less compression, larger size" and "Standard: more compression, smaller size".
- Preset picker opens in the right stage and replaces it (the left panel stays). The Change pill or the thumbnail opens it.
  - Top row: horizontally scrolling model tabs with icon and name, plus a Search field and an X. About 35 models, including Seedance 2.5 (NEW), Higgsfield Genjutsu, Higgsfield Katana, FLUX.3 Video, Kling 4.0 / Flash / 3.0 / Turbo / Omni / 2.5 / 2.6 / O1, Seedance 2.0 / Fast / Mini, Higgsfield DoP, HappyHorse, Grok, Google Veo 3.1 / Lite, Gemini Omni Flash 1.1, MiniMax H3 family, Minimax Hailuo, Wan 2.2 to 3.0 Prime, Seedance Pro / 1.5 Pro.
  - Seedance 2.5 has one preset, "GENERAL". Higgsfield DoP has category pills (All, New, Trending, Effects, Basic Camera Control, Epic Camera Control, Catch the Pulse, Mix) over a masonry grid of tall animated tiles with a bottom uppercase title and badges ("Top Choice", "Mixed"). Examples: GENERAL, FACE PUNCH, EARTH ZOOM OUT, EYES IN, CLONE EXPLOSION, TURNING METAL X MELTING, ROLL TRANSITION. "Load more" at the bottom.
- After picking a "Mixed" preset (Turning Metal x Eyes In): two thumbnails each with a strength slider (0.89 and 0.88); the upload tile becomes "Start frame. Sets the first frame and aspect ratio"; the prompt shows an "Enhance on" chip; the model becomes "Higgsfield Standard"; aspect and quality tiles disappear; a collapsible "Advanced settings" appears (Steps 20 to 70, "Use a fixed seed" switch); cost drops to 10. The choice persists across reload as `?model=standard`.
- Model picker: popover about 402 px with search, "Featured models", and per-row chips for resolution and duration range (for example Seedance 2.5 TOP 1080p 4s-30s, Kling 4.0 1080p 3s-30s, Wan 3.0 Prime 1080p 2s-30s with an audio icon, Seedance 2.5 Edit 480-720p). An "All models" list groups families with descriptions.
- Extend Video: preset becomes "GENERAL Seedance 2.5 Extend"; two upload tiles ("Add video to extend. Up to 30s" and "Add elements or references. Up to 50 image or audio"); a "Direction: Sequel" row; prompt "Describe what happens next".
- Edit Video tab: a list of tools, each with icon, title, subtitle, chevron: Edit Video, Extend Video, Reframe, Upscale, Remove Background (NEW), SDR to HDR (NEW), FPS Boost (NEW), Depth Map (NEW). The right stage shows a "FROM CONCEPT TO FINAL CUT IN SECONDS" explainer whose step 3 shows four result action icons: download, re-run, bookmark, delete. This is the only evidence of result actions.
- Motion Control tab: header card with a "How it works" pill; tiles "Add motion to copy (3 to 30 seconds)" and "Add your character (image with visible face and body)"; rows Model "Kling 3.0 Motion Control", Quality 720p, a "Scene control mode" toggle (on, lime); Generate cost 7.
- Right stage tabs "History | How it works" at top-left; "Filter" and "View" at top-right on History. Logged out, History shows the same content as How it works. How it works is a 3-step explainer ("Make videos in one click", add image, choose preset, get video) with animated demo cards.
- "Add references" modal (works without login): about 600 px, tabs Uploads, AI Influencer, Elements, Image Generations, Video Generations; Uploads has a "Filter" button, a dashed "Upload file" tile and "No uploads found".

### 4.4 Mobile (390x844)

- Top nav becomes a header: logo plus wordmark, Instagram icon, "Pricing" with a "21% OFF" tag, Sign up. A bottom tab bar has Home, Community, a large lime centre spark button, Library, Profile.
- Image: the composer is not shown; the centre button opens a full-screen "Mobile access coming soon. Available on desktop only" with "Got it".
- Video: the right stage becomes the full page (History, How it works, Filter, View pills; the 3-step explainer in 3 narrow columns). There is no composer.
- Profile opens a full-page "Log in to Higgsfield".
- Conclusion: the composer is not available on mobile at all.

### 4.5 Not reached (need login or a real generation)

- Generated results, gallery tiles, hover actions, detail view, History and Library contents.
- What Generate does when logged out (not clicked on Image; the mobile tap only showed "coming soon").
- Upload states beyond the empty tile; the Image Elements dialog beyond its login gate.
- Explore, Community, Cinema Studio, Audio, Video mega-menu (out of scope).
- Disabled-Generate state, tooltips, toasts, focus rings.

## 5. Proposed plan (not started, needs the owner's confirmation)

1. Image Studio: one full-width canvas; results above, composer docked bottom-centre; chips open small upward menus; a searchable model popover; View and help at top-right.
2. Video Studio: 320 px left control panel plus a right stage (History | How it works); presets open in the right stage.
3. Shell: a slim top bar instead of the sidebar. Biggest decision.
4. Keep our own: green `#7ad950`, our copy, BorderBeam on the prompt box only, and the Library, Spend, Agent and Projects pages. Copy layout patterns only, not assets, branding or text.
5. Mobile: keep our working phone layout (Higgsfield has none).

Open questions for the owner: replace the sidebar with a top bar? Dock the Image composer at the bottom? Anything to change before starting?

## 6. How to resume

- Read `docs/ai-context/*` and `CLAUDE.md` first. Run the checks: `npm run lint && npm run typecheck && npm test`, then `npx playwright test`.
- Layout work goes through `/feature` and the design loop (`hallmark`, `impeccable`). Update the screenshot spec and the e2e specs that assert on the current layout (`e2e/*.spec.ts`).
- Never spend real credits in tests (`E2E_MOCK_AI=1`). Pin exact dependency versions; ask before adding one.
