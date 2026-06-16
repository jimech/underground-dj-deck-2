alter table public.dj_profiles
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create unique index if not exists dj_profiles_user_id_key
  on public.dj_profiles (user_id)
  where user_id is not null;

create index if not exists dj_profiles_user_id_idx
  on public.dj_profiles (user_id);

comment on column public.dj_profiles.user_id is 'Authenticated Supabase user owner for signed-in profiles. Null keeps anonymous browser profiles supported.';
