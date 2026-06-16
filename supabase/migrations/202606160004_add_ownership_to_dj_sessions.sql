alter table public.dj_sessions
  add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table public.dj_sessions
  add column if not exists visibility text not null default 'public'
  check (visibility in ('public', 'private'));

create index if not exists dj_sessions_user_id_idx
  on public.dj_sessions (user_id);

create index if not exists dj_sessions_visibility_idx
  on public.dj_sessions (visibility);

comment on column public.dj_sessions.user_id is 'Authenticated Supabase user owner for signed-in sessions. Null keeps anonymous public links supported.';
comment on column public.dj_sessions.visibility is 'public sessions can load from share links; private sessions require the owning authenticated user.';
