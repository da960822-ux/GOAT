-- GOAT 추천 서비스 DB 스키마 v1.3_api_first_fallback
-- Target: Supabase PostgreSQL / PostgreSQL
-- 핵심 정책:
-- 1) GOAT-001 ~ GOAT-058 전체 후보를 seed pool로 보관한다.
-- 2) 요청 조건에 따라 실제 추천 계산 pool은 ALL58 또는 PRIMARY43가 될 수 있다.
-- 3) data_status는 무조건 제외 조건이 아니라 추천 점수 보정/안내 배지용 메타데이터다.

create table if not exists public.goat_places (
  place_id text primary key,
  name text not null,
  city text not null,
  region_group text not null,
  place_type text not null,
  primary_mood text not null,
  mood_tags text[] not null default '{}',
  search_tags text[] not null default '{}',
  photo_point text,
  best_time text,
  best_time_tags text[] not null default '{}',
  best_season text,
  best_season_tags text[] not null default '{}',
  accessibility jsonb not null default '{}',
  data_status text not null default 'confirmed',
  recommendation_use text,
  note text,
  is_recommendation_candidate boolean not null default true,
  image_url text,
  address text,
  latitude double precision,
  longitude double precision,
  map_search_query text,
  external_map_queries jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_goat_places_candidate on public.goat_places (is_recommendation_candidate, data_status);
create index if not exists idx_goat_places_city on public.goat_places (city);
create index if not exists idx_goat_places_region on public.goat_places (region_group);
create index if not exists idx_goat_places_mood_tags on public.goat_places using gin (mood_tags);
create index if not exists idx_goat_places_search_tags on public.goat_places using gin (search_tags);

create table if not exists public.recommendation_requests (
  request_id uuid primary key default gen_random_uuid(),
  client_request_id text, -- 프론트/시연/테스트에서 전달한 requestId. DB PK는 request_id uuid를 사용한다.
  user_id uuid,
  source text not null default 'manual-demo',
  extracted_tags text[] not null default '{}',
  mood_tags text[] not null default '{}',
  scene_tags text[] not null default '{}',
  preferred_season text,
  preferred_time text,
  region_group text,
  weather_tag text,
  pool_mode text not null default 'auto', -- auto | all58 | primary43
  status text not null default 'PENDING',
  raw_input jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_recommendation_requests_client_request_id on public.recommendation_requests (client_request_id);

create table if not exists public.recommendation_results (
  result_id uuid primary key default gen_random_uuid(),
  request_id uuid references public.recommendation_requests(request_id) on delete cascade,
  status text not null,
  result_type text not null default 'RECOMMEND',
  average_score numeric(5,2),
  seed_pool_size integer,
  candidate_pool_size integer,
  pool_policy text, -- ALL58 | PRIMARY43
  pool_reason text,
  fallback_used boolean not null default false,
  adaptive_pool_retry_used boolean not null default false,
  data_source_requested text, -- api-first | seed-first | seed-only
  data_source_used text, -- api | seed-fallback | seed | mock-fallback
  api_quality jsonb,
  recommendations jsonb not null default '[]',
  fail_reason text,
  created_at timestamptz not null default now()
);
