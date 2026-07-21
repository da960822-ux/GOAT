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

revoke all on function public.cleanup_expired_auth_rows() from public;
