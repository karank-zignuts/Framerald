# Framerald

A personal AI studio for making images and video. You write a prompt (or let the agent plan the shots), and Vertex AI makes the image or clip. Next.js + Supabase, one user, no sign-in.

**Before any work, read the context docs in `docs/ai-context/`**, in this order:

<!-- context-index -->
- `PROJECT_CONTEXT.md`: what we're building, scope, what it is not
- `TECH_DECISIONS.md`: the stack, pinned versions, how to pick new tech
- `ENGINEERING_STANDARDS.md`: structure, naming, data, AI calls, security, testing
- `DESIGN_SYSTEM.md`: Cinematic Dark tokens, the green accent
- `AI_WORKFLOW.md`: the development pipeline and which skill runs when
- `ROADMAP.md`: phases and what's next
<!-- /context-index -->

Commands: `npm run dev`, `npm test` (unit), `npm run e2e -- e2e/<file>.spec.ts` (one e2e spec), `npm run lint`, `npm run typecheck`, `npm run build`. Database: `npx supabase db push --linked --dry-run`, then without `--dry-run`.

Feature work runs through `/feature`: understand, plan, build in tested slices, design critique, independent review, commit, push, final report. It runs on its own and stops only for hard blockers. See `AI_WORKFLOW.md`.

## Testing the UI (keeps tokens low)

Do NOT drive the browser click by click with screenshots.
1. Write or extend a spec in `e2e/` (import `test` from `./fixtures`, so page errors and 5xx responses fail the test).
2. Run one spec headless: `npx playwright test e2e/<file>.spec.ts`. Only failures print. Read `test-results/` for the failure screenshot or trace.
3. Assert on roles and text, not pixels.
4. Visual check: `E2E_SHOTS=1 npx playwright test e2e/shots.spec.ts` writes one screenshot per screen to `test-results/shots/`. Look at it once.
5. Vertex AI is mocked in e2e (`E2E_MOCK_AI=1`). Never spend real credits in a test.
6. For ad-hoc exploration use the `agent-browser` skill in a subagent and report failures only.

## Hard rules

- Google and Supabase keys live in `.env.local` (and Vercel env). Never in the repo, the browser bundle or chat.
- All Vertex AI and Supabase calls run on the server (`import "server-only"`). The browser only talks to our own API routes and server actions.
- Every table row has `owner_id`. Deletes are soft (`deleted_at`). Every paid model call writes a `usage_events` row.
- UI uses only Cinematic Dark tokens plus `brand` (green #7ad950). Never invent colors. No BorderBeam (the owner removed it).
- Every user-facing string goes through the `humanizer` skill. No AI-sounding copy.
- Pin exact versions (`.npmrc` has `save-exact=true`). New dependency = ask first.
