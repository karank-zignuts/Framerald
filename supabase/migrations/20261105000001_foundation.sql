-- Framerald foundation schema.
--
-- v1 is single-user with no sign-in. Every row still carries owner_id so the
-- app can become multi-user (Supabase Auth + RLS policies + billing) without a
-- rewrite. Today all rows belong to the one seeded owner below.
--
-- Access model today: the browser never talks to Supabase. Only server code
-- uses the secret key. RLS is enabled with no policies, so the public keys
-- can read or write nothing.

create extension if not exists pgcrypto;

-- ─── Shared helpers ────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── Enums ─────────────────────────────────────────────────────────────────

create type public.media_kind as enum ('image', 'video');

create type public.generation_mode as enum (
  'text_to_image',
  'image_edit',
  'text_to_video',
  'image_to_video'
);

create type public.generation_status as enum (
  'queued',
  'running',
  'succeeded',
  'failed',
  'canceled'
);

create type public.asset_source as enum ('generated', 'upload');

create type public.agent_role as enum ('user', 'assistant', 'tool');

-- ─── Owners ────────────────────────────────────────────────────────────────
-- Stands in for auth.users until sign-in exists. When it does, add
-- auth_user_id (unique, references auth.users) and map each user to an owner.

create table public.owners (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  created_at timestamptz not null default now()
);

insert into public.owners (id, display_name)
values ('00000000-0000-0000-0000-000000000001', 'Me');

-- ─── Projects ──────────────────────────────────────────────────────────────

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index projects_owner_recent_idx
  on public.projects (owner_id, updated_at desc)
  where deleted_at is null;

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ─── Presets ───────────────────────────────────────────────────────────────
-- owner_id null = built-in preset shipped with the app.

create table public.presets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.owners (id) on delete cascade,
  kind public.media_kind not null,
  name text not null check (char_length(name) between 1 and 80),
  description text,
  prompt_template text not null,
  params jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index presets_owner_kind_idx
  on public.presets (owner_id, kind, sort_order)
  where deleted_at is null;

create trigger presets_set_updated_at
  before update on public.presets
  for each row execute function public.set_updated_at();

-- ─── Generations ───────────────────────────────────────────────────────────
-- One row per request to a model. Video runs as a Vertex long-running
-- operation, so operation_name is stored and polled until it finishes.

create table public.generations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  parent_id uuid references public.generations (id) on delete set null,
  preset_id uuid references public.presets (id) on delete set null,
  kind public.media_kind not null,
  mode public.generation_mode not null,
  status public.generation_status not null default 'queued',
  model text not null,
  prompt text not null,
  negative_prompt text,
  params jsonb not null default '{}'::jsonb,
  operation_name text,
  error text,
  cost_usd numeric(10, 4),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint generations_mode_matches_kind check (
    (kind = 'image' and mode in ('text_to_image', 'image_edit'))
    or (kind = 'video' and mode in ('text_to_video', 'image_to_video'))
  )
);

create index generations_owner_recent_idx
  on public.generations (owner_id, created_at desc)
  where deleted_at is null;

create index generations_project_recent_idx
  on public.generations (project_id, created_at desc)
  where deleted_at is null and project_id is not null;

-- Small, hot index for the job poller.
create index generations_active_idx
  on public.generations (created_at)
  where status in ('queued', 'running');

create trigger generations_set_updated_at
  before update on public.generations
  for each row execute function public.set_updated_at();

-- ─── Assets ────────────────────────────────────────────────────────────────
-- A file in the private "media" storage bucket. Generated or uploaded.

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  generation_id uuid references public.generations (id) on delete set null,
  kind public.media_kind not null,
  source public.asset_source not null,
  storage_path text not null unique,
  thumbnail_path text,
  mime_type text not null,
  bytes bigint check (bytes >= 0),
  width int check (width > 0),
  height int check (height > 0),
  duration_ms int check (duration_ms > 0),
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index assets_owner_recent_idx
  on public.assets (owner_id, created_at desc)
  where deleted_at is null;

create index assets_owner_favorites_idx
  on public.assets (owner_id, created_at desc)
  where deleted_at is null and is_favorite;

create index assets_generation_idx
  on public.assets (generation_id)
  where generation_id is not null;

create index assets_project_recent_idx
  on public.assets (project_id, created_at desc)
  where deleted_at is null and project_id is not null;

-- Generations can take input images (image-to-video, edits, references).
create table public.generation_inputs (
  generation_id uuid not null references public.generations (id) on delete cascade,
  asset_id uuid not null references public.assets (id) on delete cascade,
  role text not null default 'reference'
    check (role in ('reference', 'first_frame', 'last_frame', 'edit_source', 'mask')),
  position int not null default 0,
  primary key (generation_id, asset_id, role)
);

create index generation_inputs_asset_idx on public.generation_inputs (asset_id);

-- ─── Agent ─────────────────────────────────────────────────────────────────

create table public.agent_threads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index agent_threads_owner_recent_idx
  on public.agent_threads (owner_id, updated_at desc)
  where deleted_at is null;

create trigger agent_threads_set_updated_at
  before update on public.agent_threads
  for each row execute function public.set_updated_at();

create table public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.agent_threads (id) on delete cascade,
  owner_id uuid not null references public.owners (id) on delete cascade,
  role public.agent_role not null,
  content jsonb not null,
  model text,
  input_tokens int check (input_tokens >= 0),
  output_tokens int check (output_tokens >= 0),
  cost_usd numeric(10, 4),
  created_at timestamptz not null default now()
);

create index agent_messages_thread_idx
  on public.agent_messages (thread_id, created_at);

-- ─── Usage and credits (money-ready) ───────────────────────────────────────
-- usage_events: what each call cost us. Used now for a spend view, later for pricing.
-- credit_ledger: append-only balance changes. Unused until billing exists.

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners (id) on delete cascade,
  generation_id uuid references public.generations (id) on delete set null,
  agent_message_id uuid references public.agent_messages (id) on delete set null,
  model text not null,
  unit_type text not null check (unit_type in ('image', 'video_second', 'input_token', 'output_token')),
  units numeric(14, 4) not null check (units >= 0),
  cost_usd numeric(10, 4) not null check (cost_usd >= 0),
  created_at timestamptz not null default now()
);

create index usage_events_owner_recent_idx
  on public.usage_events (owner_id, created_at desc);

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners (id) on delete cascade,
  delta int not null check (delta <> 0),
  reason text not null check (reason in ('purchase', 'grant', 'generation', 'refund', 'adjustment')),
  reference_id uuid,
  created_at timestamptz not null default now()
);

create index credit_ledger_owner_recent_idx
  on public.credit_ledger (owner_id, created_at desc);

-- ─── Row Level Security ────────────────────────────────────────────────────
-- Enabled everywhere, no policies yet: only the server (secret key) has access.

alter table public.owners enable row level security;
alter table public.projects enable row level security;
alter table public.presets enable row level security;
alter table public.generations enable row level security;
alter table public.assets enable row level security;
alter table public.generation_inputs enable row level security;
alter table public.agent_threads enable row level security;
alter table public.agent_messages enable row level security;
alter table public.usage_events enable row level security;
alter table public.credit_ledger enable row level security;

-- ─── Storage ───────────────────────────────────────────────────────────────
-- Private bucket. The app serves files through short-lived signed URLs.
-- Path layout: <owner_id>/<yyyy>/<mm>/<asset_id>.<ext>

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  false,
  524288000, -- 500 MB, enough for long 4K video
  array['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm']
)
on conflict (id) do nothing;
