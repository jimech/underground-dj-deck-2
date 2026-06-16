create table if not exists public.dj_profiles (
  id text primary key,
  dj_name text not null,
  dj_crew text not null,
  sound_style text not null,
  avatar_index integer not null default 0 check (avatar_index >= 0),
  time_mixed integer not null default 0 check (time_mixed >= 0),
  vinyl_spins integer not null default 0 check (vinyl_spins >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dj_profiles enable row level security;

comment on table public.dj_profiles is 'Anonymous DJ profile settings and stats for Underground DJ Monolith.';
comment on column public.dj_profiles.id is 'Browser-generated anonymous profile ID.';

create index if not exists dj_profiles_updated_at_idx on public.dj_profiles (updated_at desc);
