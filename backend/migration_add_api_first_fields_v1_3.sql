-- GOAT v1.3 migration: API-first/fallback QA fields

alter table public.recommendation_results
add column if not exists adaptive_pool_retry_used boolean not null default false,
add column if not exists data_source_requested text,
add column if not exists data_source_used text,
add column if not exists api_quality jsonb;
