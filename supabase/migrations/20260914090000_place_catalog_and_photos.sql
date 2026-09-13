create table if not exists public.places (
  place_id text primary key,
  place_name text not null,
  city text not null,
  region_group text not null,
  place_type text not null,
  primary_theme text not null,
  mood_tags jsonb not null default '[]'::jsonb,
  scene_tags jsonb not null default '[]'::jsonb,
  photo_point text not null,
  purpose_tags jsonb not null default '[]'::jsonb,
  season_tags jsonb not null default '[]'::jsonb,
  best_time text not null,
  accessibility jsonb not null default '{}'::jsonb,
  recommendation_use text not null,
  note text not null default '',
  description text,
  address text,
  latitude double precision,
  longitude double precision,
  coordinate_source text,
  verification_status text,
  verification_items jsonb,
  source_urls jsonb,
  source_checked_at timestamptz,
  operating_condition jsonb,
  external_ids jsonb not null default '{}'::jsonb,
  is_recommendation_candidate boolean not null default true,
  is_course_candidate boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists places_city_idx on public.places (city);
create index if not exists places_primary_theme_idx on public.places (primary_theme);
create index if not exists places_recommendation_candidate_idx on public.places (is_recommendation_candidate);
create index if not exists places_course_candidate_idx on public.places (is_course_candidate);

create table if not exists public.place_photos (
  id uuid primary key default gen_random_uuid(),
  place_id text not null references public.places(place_id) on delete cascade,
  storage_path text,
  url text,
  provider text not null,
  source_ref text not null,
  attribution jsonb not null default '{}'::jsonb,
  is_hero boolean not null default false,
  photo_type text not null default 'PHOTO',
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint place_photos_location_check check (storage_path is not null or url is not null),
  constraint place_photos_type_check check (photo_type in ('PHOTO', 'SYNTHETIC', 'SYNTHETIC_REFERENCE_ONLY'))
);

create unique index if not exists place_photos_place_provider_source_idx
  on public.place_photos (place_id, provider, source_ref);
create index if not exists place_photos_place_active_idx
  on public.place_photos (place_id, is_active);

alter table public.places enable row level security;
alter table public.place_photos enable row level security;
revoke all on table public.places from anon, authenticated;
revoke all on table public.place_photos from anon, authenticated;
