begin;

alter table public.recommendation_sessions
  add column policy_version text not null default 'legacy-unknown',
  add column fallback_used boolean not null default false,
  add column fallback_reason text,
  add column decision_audit jsonb;

alter table public.recommendation_sessions
  alter column policy_version drop default,
  add constraint recommendation_sessions_policy_version_check
    check (length(btrim(policy_version)) > 0),
  add constraint recommendation_sessions_decision_audit_check
    check (decision_audit is null or jsonb_typeof(decision_audit) = 'object');

alter table public.recommendation_session_places
  add column mood_score integer,
  add column condition_score integer,
  add column base_score integer,
  add column route_distance_bonus integer,
  add column duplicate_penalty integer,
  add column exposure_penalty integer,
  add column coverage_boost integer,
  add column low_exposure_boost integer,
  add column selection_score integer,
  add column display_score integer,
  add column cautions jsonb not null default '[]'::jsonb;

update public.recommendation_session_places
set display_score = score
where display_score is null;

alter table public.recommendation_session_places
  add constraint recommendation_session_places_mood_score_check
    check (mood_score is null or mood_score between 0 and 45),
  add constraint recommendation_session_places_condition_score_check
    check (condition_score is null or condition_score between 0 and 45),
  add constraint recommendation_session_places_base_score_check
    check (base_score is null or base_score between 0 and 90),
  add constraint recommendation_session_places_route_distance_bonus_check
    check (route_distance_bonus is null or route_distance_bonus between 0 and 10),
  add constraint recommendation_session_places_duplicate_penalty_check
    check (duplicate_penalty is null or duplicate_penalty between 0 and 6),
  add constraint recommendation_session_places_exposure_penalty_check
    check (exposure_penalty is null or exposure_penalty between 0 and 5),
  add constraint recommendation_session_places_coverage_boost_check
    check (coverage_boost is null or coverage_boost between 0 and 3),
  add constraint recommendation_session_places_low_exposure_boost_check
    check (low_exposure_boost is null or low_exposure_boost between 0 and 3),
  add constraint recommendation_session_places_selection_score_check
    check (selection_score is null or selection_score between -11 and 106),
  add constraint recommendation_session_places_display_score_check
    check (display_score is null or display_score between 0 and 100),
  add constraint recommendation_session_places_cautions_check
    check (jsonb_typeof(cautions) = 'array');

create table public.recommendation_session_warnings (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references public.recommendation_sessions(id) on delete cascade,
  warning_code text not null,
  warning_message text not null,
  warning_details jsonb,
  created_at timestamp with time zone not null default now(),
  constraint recommendation_session_warnings_recommendation_code_key
    unique (recommendation_id, warning_code),
  constraint recommendation_session_warnings_code_check
    check (length(btrim(warning_code)) > 0),
  constraint recommendation_session_warnings_details_check
    check (warning_details is null or jsonb_typeof(warning_details) = 'object')
);

alter table public.recommendation_session_warnings enable row level security;
revoke all on table public.recommendation_session_warnings from anon, authenticated;
grant maintain, references, trigger, truncate on public.recommendation_session_warnings to service_role;

create index recommendation_sessions_policy_created_at_idx
  on public.recommendation_sessions (policy_version, created_at desc);
create index recommendation_sessions_fallback_created_at_idx
  on public.recommendation_sessions (created_at desc)
  where fallback_used = true;
create index recommendation_session_places_place_created_at_idx
  on public.recommendation_session_places (place_id, created_at desc);
create index recommendation_session_warnings_code_created_at_idx
  on public.recommendation_session_warnings (warning_code, created_at desc);

comment on table public.recommendation_logs is
  'Deprecated legacy recommendation log. New recommendation writes use recommendation_sessions and child tables.';

commit;
