# AI_WORKFLOW

> How AI agents work in this repo. Every agent follows it on every task.

Status: **v1.0**, 2026-11-05

---

## 1. Start of every session

1. Read `PROJECT_CONTEXT.md`, then the docs the task needs. Never zero.
2. Check `git status`, the branch and recent commits.

## 2. Size the task

| Size | Examples | Process |
|---|---|---|
| Trivial | typo, copy, config value | Do it, verify, report in 1–3 lines |
| Standard | one component, one route, one fix | Short plan in the reply → build → test → report |
| Major | new module, schema change, new dependency, model change, anything deployed | Run `/feature`. It plans, builds and reports without waiting for approval |

## 3. The pipeline (`/feature`)

```text
understand → plan (docs/plans/) → build in slices [test → implement → verify → commit]
  → design loop (UI) → harden → independent review → wrap up + push → final report
```

| Stage | Role | Skills |
|---|---|---|
| Ideas | Product partner | `brainstorming`, `grill-me` |
| Plan | Tech lead | `writing-plans`, `planning-and-task-breakdown` |
| Database | DB architect | `supabase-postgres-best-practices`, `supabase` |
| AI integration | ML engineer | `gemini-api-dev`, `gemini-omni-flash-api` |
| Design | Designer | `hallmark`, `impeccable`, `frontend-design` (global) |
| Copy | Writer | `humanizer` |
| Build | Engineer | `tdd`, `vercel-react-best-practices` |
| Performance | Perf engineer | `performance-optimization`, `core-web-vitals` |
| Test | QA | `tdd`, `playwright-best-practices` |
| Debug | Engineer | `systematic-debugging` |
| Review | Reviewer (fresh agent) | `code-review` |
| Security | Security | `security-and-hardening` |
| Money (later) | Growth | `stripe-best-practices`, `pricing` |

All except `frontend-design` are installed in `.claude/skills/` (lock file: `skills-lock.json`). Update with `npx skills update -p`.

## 4. Hard stops (the only reasons to pause)

- A key, credential or account step only the owner can do.
- A migration that deletes or rewrites existing data.
- Real spending beyond small test calls (for example bulk video generation).
- A new paid service.

Everything else: decide, write the assumption in the plan, report it at the end.

## 5. Design check

Every new or changed screen: `hallmark` picks structure → build → one screenshot (`E2E_SHOTS=1`) → `impeccable` critique + `hallmark` audit → fix findings. A screen with open "slop" findings is not done.

## 6. E2E testing (Organizr method)

- One spec per flow in `e2e/`, import `test` from `./fixtures` (fails on page errors and 5xx).
- `npx playwright test e2e/<file>.spec.ts`, headless, `line` reporter. Only failures print.
- Visual check: `E2E_SHOTS=1 npx playwright test e2e/shots.spec.ts`, view once.
- AI is mocked in e2e. Never click through the browser step by step with screenshots.

## 7. Verify

```bash
npm run lint && npm run typecheck && npm test && npm run build
npx playwright test e2e/<changed-flow>.spec.ts
```

## 8. Report

What changed, how it was verified (commands and results), what is not done or not verified, and the next step.

## 9. Living docs

Update `ROADMAP.md` (status, changelog), `TECH_DECISIONS.md` (versions) and `PROJECT_CONTEXT.md` (decisions) in the same change that makes them true.
