create extension if not exists pgcrypto;

create table if not exists public.dj_sessions (
  id uuid primary key default gen_random_uuid(),
  session jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.dj_sessions enable row level security;

comment on table public.dj_sessions is 'Cloud-saved Underground DJ Monolith session payloads.';
comment on column public.dj_sessions.session is 'VersionedSession JSON payload validated by the application server before insert.';

create index if not exists dj_sessions_created_at_idx on public.dj_sessions (created_at desc);
