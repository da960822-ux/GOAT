create extension if not exists pgcrypto;

create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create index users_email_idx on public.users (email);

create table public.user_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null,
  provider_subject text not null,
  provider_email text,
  provider_display_name text,
  provider_avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_identities_provider_check check (provider in ('google', 'kakao'))
);

create unique index user_identities_provider_subject_idx on public.user_identities (provider, provider_subject);
create index user_identities_user_idx on public.user_identities (user_id);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_seen_at timestamptz not null default now(),
  user_agent text,
  ip_address inet,
  created_at timestamptz not null default now()
);

create unique index sessions_token_hash_idx on public.sessions (token_hash);
create index sessions_user_idx on public.sessions (user_id);
create index sessions_expires_at_idx on public.sessions (expires_at);

create table public.oauth_states (
  id uuid primary key default gen_random_uuid(),
  state_hash text not null,
  provider text not null,
  redirect_to text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint oauth_states_provider_check check (provider in ('google', 'kakao'))
);

create unique index oauth_states_state_hash_idx on public.oauth_states (state_hash);
create index oauth_states_expires_at_idx on public.oauth_states (expires_at);

create table public.bookmarks (
  user_id uuid not null references public.users(id) on delete cascade,
  place_id text not null,
  source text not null default 'place_detail',
  created_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

create index bookmarks_user_idx on public.bookmarks (user_id);
create index bookmarks_place_idx on public.bookmarks (place_id);

create table public.recommendation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  mood_id text,
  reference_card_id text,
  request jsonb not null,
  recommended_place_ids jsonb not null,
  excluded_place_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index recommendation_logs_user_created_at_idx on public.recommendation_logs (user_id, created_at);
create index recommendation_logs_mood_idx on public.recommendation_logs (mood_id);
create index recommendation_logs_reference_card_idx on public.recommendation_logs (reference_card_id);

alter table public.users enable row level security;
alter table public.user_identities enable row level security;
alter table public.sessions enable row level security;
alter table public.oauth_states enable row level security;
alter table public.bookmarks enable row level security;
alter table public.recommendation_logs enable row level security;

revoke all on table public.users from anon, authenticated;
revoke all on table public.user_identities from anon, authenticated;
revoke all on table public.sessions from anon, authenticated;
revoke all on table public.oauth_states from anon, authenticated;
revoke all on table public.bookmarks from anon, authenticated;
revoke all on table public.recommendation_logs from anon, authenticated;

create or replace function public.cleanup_expired_auth_rows()
returns table(deleted_sessions integer, deleted_oauth_states integer)
language plpgsql
security invoker
set search_path = public
as $$
declare
  session_count integer;
  state_count integer;
begin
  delete from public.sessions
  where expires_at <= now()
  or revoked_at is not null;
  get diagnostics session_count = row_count;

  delete from public.oauth_states
  where expires_at <= now()
  or used_at is not null;
  get diagnostics state_count = row_count;

  return query select session_count, state_count;
end;
$$;

revoke all on function public.cleanup_expired_auth_rows() from public;;
