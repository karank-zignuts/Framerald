# ENGINEERING_STANDARDS

> How we write code in this repo.

Status: **v1.0**, 2026-11-05

---

## 1. Principles

1. Small, focused changes. One concern per change.
2. Features talk through their own `api.ts` / service, not each other's internals.
3. Readable over clever. Fail loudly, never swallow errors.
4. Server owns secrets and data access.

## 2. Structure

```text
framerald/
├── docs/ai-context/          # these docs
├── e2e/                      # Playwright specs (Organizr method)
├── supabase/migrations/      # SQL migrations, one per change
└── src/
    ├── app/
    │   ├── (studio)/         # image, video, agent, library screens
    │   └── api/              # route handlers (thin)
    ├── components/
    │   ├── ui/               # design system source, no business logic
    │   └── <feature>/        # feature components
    ├── features/<feature>/   # api.ts, queries.ts, schemas.ts, types.ts, server.ts
    └── lib/
        ├── ai/               # vertex.ts (client), models.ts (IDs + prices), per-job helpers
        ├── supabase/         # server.ts (secret-key client)
        ├── env.ts            # Zod-validated server env
        └── utils.ts
```

Rules:
- Route files stay thin: parse → validate (Zod) → call a function → return.
- Server Components by default. Smallest possible `"use client"` parts.
- Client data flow: `features/*/api.ts` → `features/*/queries.ts` (TanStack Query) → components.
- Anything that touches Vertex AI or Supabase imports `server-only`.

## 3. Naming

| Thing | Convention | Example |
|---|---|---|
| Files | kebab-case | `prompt-box.tsx` |
| Components | PascalCase | `PromptBox` |
| Functions / variables | camelCase | `startVideoJob` |
| DB tables / columns | snake_case, plural tables | `generations.created_at` |
| Migrations | `YYYYMMDDNNNNNN_what.sql` | `20261105000001_foundation.sql` |

## 4. Database

- Use the `supabase-postgres-best-practices` skill for every migration.
- Every table: `id uuid`, `owner_id`, `created_at`; `updated_at` with the shared trigger when rows change; `deleted_at` for soft delete.
- Index for the real query: `(owner_id, created_at desc) where deleted_at is null` for lists.
- Enums for closed sets. `jsonb` only for model params that change per model.
- RLS enabled on every new table.
- Never edit an applied migration. Add a new one.
- Dry-run before pushing: `npx supabase db push --linked --dry-run`.

## 5. AI calls

- Every call goes through `src/lib/ai/`. Model IDs and prices live in `models.ts`, nowhere else.
- Write the `generations` row **before** calling the model, update it after. A crash must leave a visible failed row, not nothing.
- Record cost in `usage_events` for every paid call.
- Timeouts and clear error text. Show Google's safety-block reason when a prompt is refused.
- Long jobs (video): store `operation_name`, return at once, poll.

## 6. Media

- Store under `<owner_id>/<yyyy>/<mm>/<asset_id>.<ext>` in the `media` bucket.
- Serve with short-lived signed URLs. Make a small thumbnail for every asset; the Library grid loads thumbnails only.
- Use `next/image` or the design system's blur-up image for stills. Lazy-load video, `preload="metadata"`.

## 7. Performance

- Check `performance-optimization` and `core-web-vitals` before each phase gate.
- Lists are paginated (cursor on `created_at`). No unbounded selects.
- Don't ship the Vertex SDK or Supabase client to the browser.

## 8. Security

- Validate every input with Zod on the server.
- Uploads: check MIME type and size on the server before storing.
- When deployed, `APP_PASSWORD` guards every page and route.
- Run `security-and-hardening` before the first Vercel deploy.

## 9. Testing

| Layer | Tool | What |
|---|---|---|
| Unit | Vitest (`src/**/*.test.ts`) | Pure logic: prompt building, param mapping, cost maths |
| E2E | Playwright (`e2e/`) | One spec per flow, headless, mocked AI (`E2E_MOCK_AI=1`) |
| Visual | `E2E_SHOTS=1` | One screenshot per screen, viewed once, then critiqued |

A change is done when lint, typecheck, unit tests, the changed flow's e2e spec and the build all pass.
