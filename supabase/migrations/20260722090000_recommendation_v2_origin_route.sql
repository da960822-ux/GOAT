begin;

alter table public.recommendation_sessions
  add column origin_status text,
  add column origin_notice text,
  add constraint recommendation_sessions_origin_status_check
    check (origin_status is null or origin_status in ('APPLIED', 'SKIPPED', 'UNAVAILABLE'));

alter table public.recommendation_session_places
  add column origin_distance_bonus integer,
  add column route_info jsonb,
  add constraint recommendation_session_places_origin_distance_bonus_check
    check (origin_distance_bonus is null or origin_distance_bonus between 0 and 10),
  add constraint recommendation_session_places_route_info_check
    check (route_info is null or jsonb_typeof(route_info) = 'object');

alter table public.recommendation_session_places
  drop constraint recommendation_session_places_selection_score_check,
  add constraint recommendation_session_places_selection_score_check
    check (selection_score is null or selection_score between -11 and 116);

comment on column public.recommendation_sessions.origin_status is
  'goat-score-v2 origin resolution status. Null for legacy v1 sessions.';
comment on column public.recommendation_session_places.origin_distance_bonus is
  'goat-score-v2 origin proximity bonus, 0..10. Null for legacy v1 cards.';
comment on column public.recommendation_session_places.route_info is
  'goat-score-v2 route distance/time/source snapshot. Null for legacy v1 cards.';

commit;
