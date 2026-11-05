---
name: feature
description: Framerald's autonomous build flow for a feature or a roadmap phase. Understands the task, writes a plan, builds in tested slices, critiques the design, reviews with a fresh agent, commits, pushes and reports. No approval gates; stops only for hard blockers. Use when the user says /feature or asks to build a feature or phase.
---

# /feature

Run the whole task yourself and give the owner a final report. Load each named skill with the Skill tool and follow it. Read `CLAUDE.md` and the docs it lists first.

Argument: `$task_description`. If empty, ask once what to build.

## Hard stops (only these)

Stop and ask the owner only when you cannot continue safely alone:
- a key, credential or account step that only the owner can do;
- a migration that deletes or rewrites existing data;
- spending real money beyond small test calls (for example bulk video generation);
- adding a new paid service.

Everything else, decide yourself, write the assumption in the plan, and mention it in the report. A new npm dependency is not a stop; pin it, explain why in `TECH_DECISIONS.md`.

## Flow

1. **Understand.** Read the code the task touches. For a bug, use `systematic-debugging` and find the cause before anything else. For a vague idea, use `brainstorming` and settle it yourself. For any Vertex AI call, use `gemini-api-dev` and confirm model IDs with one real call.
2. **Plan.** `writing-plans` and `planning-and-task-breakdown`. Save to `docs/plans/<task>.md`: slices that each work on their own, files, data changes, risks, how each slice is verified, assumptions. For migrations also use `supabase-postgres-best-practices`. Don't wait for approval.
3. **Build in slices.** For each slice, in order:
   - test first (`tdd`; Playwright specs follow CLAUDE.md and `playwright-best-practices`)
   - implement (`vercel-react-best-practices`, `ENGINEERING_STANDARDS.md`)
   - run `npm run lint && npm run typecheck && npm test` and that flow's e2e spec
   - fix failures, then commit the slice with a clear message
4. **Design loop (UI slices).** Before building, `hallmark` picks the structure and `impeccable` shapes it against `DESIGN_SYSTEM.md`; copy goes through `humanizer`. After building, take one screenshot (`E2E_SHOTS=1`), run `impeccable` critique and `hallmark` audit, fix every finding. Repeat up to 3 rounds.
5. **Harden.** `performance-optimization` and `core-web-vitals` for lists, media and heavy screens. `security-and-hardening` for routes, uploads and keys. Run `npm run build`.
6. **Independent review.** Start a fresh subagent with `code-review` against the plan and `ENGINEERING_STANDARDS.md`. Fix critical findings and re-check. If the same critical comes back twice, treat it as a hard stop.
7. **Wrap up.** Update `ROADMAP.md` (status, changelog) and `TECH_DECISIONS.md` (versions). Commit, then `git push`.
8. **Final report.** Short and plain, in this order:
   - what was built
   - what was verified, with the real commands and results
   - what was not verified or is risky
   - assumptions made
   - cost of any real model calls
   - commits pushed
   - the next step

## Rules

- Never spend real credits in tests (`E2E_MOCK_AI=1`).
- Report failures as they are. Don't claim something passed that you didn't run.
- Money skills (`stripe-best-practices`, `pricing`) only when billing is in scope.
- Keep slices small, one concern each, so a failure points at one change.
