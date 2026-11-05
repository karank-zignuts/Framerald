# Plan: Phase 1, Image Studio and Library

Date: 2026-11-05. Done when: make, edit and find an image end to end, with cost shown.

## What was confirmed with real calls

- Vertex does not support the Interactions API for the image models (400). Use `generateContent` with `responseModalities: ["IMAGE"]` and `imageConfig: { aspectRatio, imageSize }`.
- `gemini-nano-banana-2.1` in `global` returned a 1K square image. A first call got a 429 and the retry worked, so retry transient 429s once or twice.
- The response carries `usageMetadata` (prompt, thoughts, image output tokens). Cost is computed from those tokens.
- Prices (Google's published Gemini API list prices; the Vertex pricing page would not load, so costs are labelled estimates): Nano Banana 2.1 input $1.50 / text+thinking out $7.50 / image out $30 per 1M tokens; 1K image = 1,120 tokens = $0.0336, matching the listed price.

## Assumptions (decided without asking)

1. `fast` model becomes `gemini-3.1-flash-lite-image` (the Gemini skill calls `gemini-3.1-flash-image` deprecated).
2. Count N means N parallel model calls (max 4), one `generations` row, N assets. Partial success is a success.
3. Generation runs inside the POST request (about 10 to 25 s). Fine locally; moving to jobs is Phase 3 work for video and will be reused if Vercel limits bite.
4. Library and Image Studio load data in the browser through TanStack Query and our route handlers, so every page is a static shell (works with Cache Components).
5. Thumbnails use `sharp` (new dependency, already shipped by Next as optional). 480 px wide WebP.
6. E2E uses the real Supabase project with a mocked AI, tags its rows with a `[e2e]` prompt prefix and deletes them in teardown.
7. Signed URLs last 1 hour. Library cards use thumbnails only.

## Slices (each tested and committed on its own)

| # | Slice | Verified by |
|---|---|---|
| A | Models and prices, cost maths, Zod schemas, cursor codec | Vitest |
| B | Server: storage and thumbnails, image generation (real and mock), generation service | Vitest (mock), one real call |
| C | Route handlers: generate, upload, library list, favourite, soft delete, generation detail | Vitest for parsing, e2e |
| D | App shell and Image Studio UI | Playwright, screenshot, design loop |
| E | Library UI: grid, infinite scroll, favourite, delete, edit-this, re-run | Playwright |
| F | Harden, build, review, docs, push | lint, typecheck, build, review agent |

## Data

No schema change. Uses `generations`, `generation_inputs`, `assets`, `usage_events` as they are. `generations.params` holds `{ aspectRatio, imageSize, count }`. `cost_usd` stays null when the price or the token counts are unknown. A `usage_events` row is written per image only when the cost is known.

## Risks

| Risk | Handling |
|---|---|
| 429 or safety block from Google | One retry for 429. Safety blocks and other errors are saved on the row and shown to the user |
| Model returns text only | Treated as a failure with the text as the reason |
| Crash after the model call | Row is created first as `running`; a failed update leaves a visible running row. Page load marks rows stuck for over 10 minutes as failed |
| Large reference uploads | Server checks type (png, jpeg, webp) and size (10 MB) before storing |
| Costs add up | Real calls only in the final smoke test (about three) |
