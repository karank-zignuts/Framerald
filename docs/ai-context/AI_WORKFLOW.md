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
| Major | new module, schema change, new dependency, model change, anything deployed | Run `/feature`. Plan first and wait for approval |

## 3. The pipeline (`/feature`)

```text
intake → research → [RCA if bug] → plan → GATE 1 → options
  → design (UI) → implement → design critique (UI) → test → GATE 2
  → review → ship
```

| Stage | Role | Skills |
|---|---|---|
| Ideas | Product partner | `brainstorming`, `grill-me` |
| Intake / research | Analyst | `intake`, `research` |
| Plan | Tech lead | `plan`, `writing-plans`, `planning-and-task-breakdown` |
| Database | DB architect | `supabase-postgres-best-practices`, `supabase` |
| AI integration | ML engineer | `gemini-api-dev`, `gemini-omni-flash-api` |
| Design | Designer | `hallmark`, `impeccable`, `frontend-design` |
| Copy | Writer | `humanizer` |
| Build | Engineer | `implement`, `vercel-react-best-practices` |
| Performance | Perf engineer | `performance-optimization`, `core-web-vitals` |
| Test | QA | `test`, `tdd`, `playwright-best-practices` |
| Debug | Engineer | `systematic-debugging` |
| Review | Reviewer (fresh agent) | `review`, `code-review` |
| Security | Security | `security-and-hardening` |
| Ship | Release | `ship` |
| Money (later) | Growth | `stripe-best-practices`, `pricing` |

All are installed in `.claude/skills/` (lock file: `skills-lock.json`). Update with `npx skills update -p`.

## 4. Stop and ask the owner when

- It is a product choice (scope, UX behavior).
- A new dependency, paid service or model is involved.
- A migration drops or rewrites data.
- Something touches keys, storage access or the deployed password.

## 5. Design gate

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
