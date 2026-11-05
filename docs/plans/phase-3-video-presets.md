# Plan: Phase 3, Video Studio and Presets

Date: 2026-11-05. Done when: a prompt (typed, or sent from an agent shot) becomes a finished clip in the Library, the job survives a reload, and presets shape the prompt.

## What was confirmed

- **SDK shape** (`@google/genai` 2.32): `ai.models.generateVideos({ model, prompt, image?, config })` returns an operation; `ai.operations.getVideosOperation({ operation })` polls it. A finished operation has `response.generatedVideos[].video` with `videoBytes` (base64) or `uri`. Config has `aspectRatio`, `durationSeconds`, `resolution`, `generateAudio`, `numberOfVideos`, `lastFrame`, `negativePrompt`, `outputGcsUri`.
- **Vertex model docs** (docs.cloud.google.com): `veo-3.1-generate-001` and `veo-3.1-fast-generate-001` are GA; `veo-3.1-lite-generate-001` is **Preview**. All: 4, 6 or 8 s, 16:9 or 9:16, 24 fps, up to 4 videos per prompt, `us-central1` only, first-frame image to video and last-frame supported, images up to 20 MB. Outputs: Veo 3.1 720p/1080p/4K; Fast and Lite 720p/1080p. Google shut down the Gemini API's Veo 3.1 preview ids on 2026-10-22, so Vertex's `-001` ids are the right ones.
- **Prices** (Google's Vertex pricing page, read with curl on 2026-11-05; listed as "$ / 1 count", taken as per second of video, the conservative reading): Veo 3.1 with audio $0.40 (720p, 1080p) and $0.60 (4K); without audio $0.20 and $0.40. Fast with audio $0.10 (720p), $0.12 (1080p), $0.30 (4K); without $0.08, $0.10, $0.25. Lite with audio $0.05 (720p), $0.08 (1080p); without $0.03, $0.05.
- Whether Vertex returns bytes inline when no `outputGcsUri` is set is confirmed by the single real smoke clip (below).

## Assumptions (decided without asking)

1. **Gemini Omni is out of scope.** It uses the Interactions API, which Vertex refused for the image models earlier, and the user said "only if it fits".
2. **1080p and 4K only with 8 seconds.** This is Veo's rule on the Gemini API; the Vertex docs don't say. It's the safe side and is one line to relax.
3. **Presets are applied at submit time**, not pasted into the box. The final prompt is what gets saved, so the Library and re-run show exactly what was sent.
4. **Built-in presets live in code**; your own presets use the existing `presets` table (`owner_id` set, soft delete). No migration needed. The pending migration `20261105000002` is unrelated.
5. **Video thumbnails**: no extraction. Tiles use `<video preload="metadata">` at `#t=0.1`; image-to-video clips reuse the first frame's thumbnail. ffmpeg is never needed at runtime (it's only used once to make the test fixture).
6. **Exactly-once finalize**: the status route claims a job with a conditional update on `completed_at is null and status = 'running'`. A claim older than 3 minutes can be taken over, so a crash mid-finalize doesn't strand a paid clip.
7. **No worker**: the browser polls short requests every 5 seconds while a clip is running, and on page load it asks for any running video jobs. On Vercel a cron can call the same status route later.
8. **Stuck rows**: images fail after 10 minutes as before; video jobs after 30.
9. "Send to Video" maps any shot ratio to 16:9 or 9:16 (portrait to 9:16, everything else to 16:9).

## Slices

| # | Slice | Verified by |
|---|---|---|
| A | Pure logic, tests first: video prices and cost, request schema, job state machine, preset templating, built-in presets, library view parsing, shot-ratio mapping | Vitest |
| B | Veo wrapper (real and mock), video service: start, status, finalize once, sweep | Vitest, API e2e |
| C | Routes: start, status, active jobs, presets CRUD, library `kind` filter | API e2e |
| D | Video Studio UI with live cost estimate, job cards, polling, presets | Playwright, screenshots |
| E | Library: video tiles, player in the dialog, filters; Image Studio style presets | Playwright |
| F | Agent: Send to Video, copy, nav tag | Playwright |
| G | Harden, build, review, real smoke clip, docs, push | whole suite |

## Risks

| Risk | Handling |
|---|---|
| Preview Lite model changes or 429s | Clear plain-language failure saved on the row; Fast and Standard still selectable |
| Operation finishes but we can't read the video (uri only) | Saved as a failed job with that exact reason; never silently lost |
| Two polls finalize the same clip | Conditional claim; asset id derived once per claim |
| Long clips and storage limits | Bucket allows 500 MB; 8 s clips are small |
| Runaway spend | Cost shown before Generate; max 1 video per request in the UI; one real clip in this phase |

## Outcome (2026-11-05)

All slices built. Verified: 116 unit tests, 51 browser tests (AI mocked), production build, and **one real clip**: Veo 3.1 Lite, 4 s, 720p, no sound, text to video, started through the app. Vertex accepted the call in 6.5 s, finished it at about 48 s, and returned the bytes inline (no Cloud Storage bucket needed). The saved file is a real 1280x720, 24 fps, 4.0 s H.264 clip of the prompt (a paper boat at sunrise), 1.07 MB. Database: one generation at $0.12, one `video_second` usage row (4 s, $0.12), one asset. Real spend: about $0.12, one clip.

Independent review: no criticals. Fixed: the stuck-job sweep no longer fails a video without asking Google first (a clip that finished while the laptop was closed is now fetched and saved); `finalize` is idempotent (it never saves a second asset or a second cost row, and the stale-claim window is 10 minutes); the final status update's error is checked; Try again can't be double-clicked into two paid clips; re-running or retrying a clip whose frame was deleted says so instead of silently becoming text to video; `$` in a prompt is no longer mangled by preset templating; presets that push a prompt over the limit explain why; saving the operation name is tried twice.

Found by the browser tests while building: a nested form in the preset picker would have let Enter in its name field start a paid clip (fixed, now tested); a late list response could erase a new clip or chat entry (fixed by re-fetching after the change; chats are now created under their real name).

Known and accepted: Veo prices read from Google's "$ / 1 count" as per second (the clip's $0.12 matches that reading, but Google's bill is the real check). Lite is a preview model. 1080p and 4K only at 8 s is an assumption. Text-to-video tiles use `<video preload="metadata">` (one small request per tile). Only the cheapest model was tried with a real call. Image to video, last frame, sound and the Fast and standard models are covered by the mock only. The stale-claim takeover can't be tested without fault injection. Migration `20261105000002` is still unapplied (a separate owner step).
