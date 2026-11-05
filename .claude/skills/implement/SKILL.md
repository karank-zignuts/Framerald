---
name: implement
description: Execute an approved plan as code changes on a feature branch. One commit per logical step, verify each step before advancing. Optionally spawn isolated worker agents for medium/large tasks. Use after plan approval, or as step 4 of /feature.
---

# implement

Turn the approved plan into reviewed-quality code on a feature branch.

## Inputs

- The approved plan from the `plan` skill (with quality analysis + failure-mode table).
- Research findings (file:line references + project conventions).
- Optional: user feedback (set on rerun after GATE 2 → "Request changes" or manual-test → "Fail — apply fixes"). Treat as override-priority guidance.

## Procedure

1. **Preflight.**
   - `git fetch origin`.
   - Determine the PR target branch. Default to `development` unless the user or ticket specifies otherwise.
   - Derive the candidate branch name using the [Branch naming](#branch-naming) convention below.
   - **Branch Gate — always ask, never auto-create.** Before creating or checking out anything, ask the user how they want to proceed:
     1. **Create a new branch** — use the derived name (or a name the user provides), branched from the target branch.
     2. **Work on the existing/current branch** — stay on whatever branch is currently checked out (or a branch the user names) and resume work there.

     Do not proceed past this gate without an explicit choice.
   - **If the user chose "create a new branch":** check whether that name already exists (local or remote): `git rev-parse --verify <branch>` or `git ls-remote --exit-code --heads origin <branch>`.
     - **If it does not exist:** create and check it out from the target branch.
     - **If it already exists:** STOP and tell the user — show the existing branch (last commit, ahead/behind vs. the target branch) and ask them to either continue on it or pick a disambiguated name (e.g. append `-2` or a more specific slug).
   - **If the user chose "work on the existing branch":** `git checkout <branch>` (if not already checked out) and resume (see resume handling in Failure modes). Do not create a new branch.

2. **Worker isolation (medium/large only).** For `medium` or `large` plans, you may spawn an `Agent` with `isolation: "worktree"` to run the implementation off the orchestrator's working tree. Before spawning:
   - `git worktree list` — check for stale entries.
   - `git worktree prune` if any are stale.
   - If worktree creation fails, retry once after prune. If it still fails, fall back to in-place implementation and note the fallback.

   For `trivial` and `small`, work inline — workers add more overhead than they save.

3. **For each plan step:**
   1. Re-read the step.
   2. Make the change. Edit existing files in preference to creating new ones.
   3. Run the verification declared in the plan (typecheck, unit test, command).
   4. If verification fails: fix the issue, don't bypass. If you can't fix in ≤3 attempts, stop and report a blocker — do not paper over.

   Do **not** commit during implement. All edits stay in the working tree; `ship` commits the change once the full diff has been self-reviewed and QA'd. This matches normal dev flow: code → verify → commit once when done.

4. **If `feedback` is set:**
   - Surface the feedback at the top of your working context.
   - Address each point explicitly with new edits in the working tree (still no commits — `ship` will commit).

5. **No drive-by changes.** If you spot an unrelated bug or want to clean up adjacent code, note it as a follow-up and keep going.

## Branch naming

Format: `<type>/<ticket-or-slug>`.

`<type>` must be a conventional branch type — map the intake `task_type` to one of:

| type       | use for                                  |
|------------|------------------------------------------|
| `feat`     | new feature / capability                 |
| `fix`      | bug fix                                   |
| `chore`    | maintenance, deps, config                 |
| `docs`     | documentation only                        |
| `refactor` | behavior-preserving restructuring         |
| `test`     | adding or fixing tests                     |
| `perf`     | performance improvement                   |
| `ci`       | CI / pipeline changes                     |
| `build`    | build system / tooling                    |

Rules:

1. **Ticket number provided** → `<type>/<ticket-number>`, e.g. `feat/WEB-123`, `fix/WEB-456`, `chore/OPS-12`.
2. **No ticket number** → `<type>/<slug>`, e.g. `feat/user-authentication`, `fix/login-validation`, `refactor/api-client`.
3. Slugs are lowercase with hyphens (`-`) instead of spaces.
4. Always ask at the **Branch Gate** (see Preflight) whether to create a new branch or work on the existing/current branch — never auto-create or auto-checkout without asking. If creating a new branch and the derived name already exists, stop and ask the user whether to continue on it or use a disambiguated name.

## Hard rules

| Rule                              | Detail                                                                  |
|-----------------------------------|-------------------------------------------------------------------------|
| No type-safety bypasses           | No `@ts-ignore`, `as any`, `// eslint-disable-next-line`, or equivalent without an inline justification AND a follow-up issue noted. |
| Tests co-located with code        | Write tests alongside the code change in the same step. Never defer "for later"; they ship in the same PR. |
| Fix code, not tests               | Tests are the alarm, code is the fire. Only edit tests when the AC itself changed. |
| No commits in implement           | All edits stay uncommitted. `ship` is the only stage that runs `git commit`. |

## Output

Report to the caller:

```
Branch:        <branch>
Worker:        <inline | worktree:/path/to/wt>
Plan steps:
  - <step 1 subject> [verified ✓]
  - <step 2 subject> [verified ✓]
Files changed: <N> (uncommitted in working tree — ship will commit)
Blockers:      <none | description>
```

## Verification

- Branch exists and is checked out.
- `git diff` shows the planned changes in the working tree.
- Every plan step is either complete or has a reported blocker.
- No `WIP`, `fixup`, or unresolved merge markers in the diff.
- `git diff` shows no introduced `@ts-ignore`, `as any`, or `eslint-disable` without justification.

## Failure modes

- **Verification fails repeatedly:** stop and report a blocker.
- **Plan step is wrong:** stop, note the deviation, ask the orchestrator for guidance rather than silently re-planning.
- **Branch Gate:** always ask the user to choose between creating a new branch or working on the existing/current one before touching git state. Never auto-create or auto-checkout. If the chosen new-branch name already exists, stop and ask whether to continue on it or use a disambiguated one.
- **Resume sees existing branch + uncommitted diff:** (after the user chose "continue" at the Branch Gate) re-derive remaining work from the plan vs. the current working-tree diff. Don't re-apply edits already present. (Trade-off of no per-step commits: mid-run resume is less precise. If pausing for a long time, commit manually before stepping away.)
- **Worktree spawn fails:** prune + retry once; on second failure, fall back to in-place and log it.