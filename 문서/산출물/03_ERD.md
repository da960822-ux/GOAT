# GOAT ERD (Supabase / PostgreSQL)

## 테이블 구조

```
┌─────────────────────────────────────────┐
│                  places                 │
├──────────────┬──────────────────────────┤
│ place_id     │ VARCHAR PRIMARY KEY       │  예) "GOAT-025"
│ place_name   │ VARCHAR NOT NULL          │  예) "안목해변 카페거리"
│ city         │ VARCHAR NOT NULL          │  예) "강릉시"
│ region_group │ VARCHAR                   │  예) "동해안권"
│ place_type   │ VARCHAR                   │  예) "해변카페/거리"
│ primary_mood │ VARCHAR                   │  예) "캘리포니아 보드워크"
│ mood_tags    │ TEXT[]                    │  예) ["해변카페","보드워크","일출"]
│ scene_tags   │ TEXT[]                    │  LLM/레퍼런스 장면 매칭용
│ photo_point  │ TEXT                      │
│ best_time    │ VARCHAR                   │  예) "오전, 일몰"
│ best_season  │ VARCHAR                   │  예) "사계절"
│ accessibility│ TEXT                      │  예) "자차 상 / 대중 중"
│ parking      │ VARCHAR                   │
│ address      │ TEXT                      │
│ lat          │ DOUBLE PRECISION          │
│ lng          │ DOUBLE PRECISION          │
│ coordinate_source │ VARCHAR              │  KTO_SEARCH / KAKAO_MAP_SEARCH 등
│ kto_content_id │ VARCHAR                 │  KTO 상세·이미지 연동용(보강 예정)
│ recommendation_use │ TEXT               │
│ note         │ TEXT                      │
│ data_status  │ VARCHAR DEFAULT 'confirmed'│  confirmed / needs_verification
│ description  │ TEXT                      │
│ created_at   │ TIMESTAMPTZ DEFAULT NOW() │
└──────────────┴──────────────────────────┘

┌─────────────────────────────────────────┐
│                  users                  │
├──────────────┬──────────────────────────┤
│ id           │ UUID PRIMARY KEY          │  Supabase Auth 연동
│ email        │ VARCHAR UNIQUE            │
│ nickname     │ VARCHAR                   │
│ created_at   │ TIMESTAMPTZ DEFAULT NOW() │
└──────────────┴──────────────────────────┘

┌─────────────────────────────────────────┐
│               bookmarks                 │
├──────────────┬──────────────────────────┤
│ id           │ UUID PRIMARY KEY DEFAULT gen_random_uuid() │
│ user_id      │ UUID REFERENCES users(id) ON DELETE CASCADE│
│ place_id     │ VARCHAR REFERENCES places(place_id)        │
│ created_at   │ TIMESTAMPTZ DEFAULT NOW()                  │
│              │ UNIQUE(user_id, place_id)                  │
└──────────────┴──────────────────────────┘

┌─────────────────────────────────────────┐
│            recommendation_logs          │
├──────────────┬──────────────────────────┤
│ id           │ UUID PRIMARY KEY DEFAULT gen_random_uuid() │
│ user_id      │ UUID REFERENCES users(id) ON DELETE SET NULL│
│ mood_id      │ VARCHAR NOT NULL          │
│ companion    │ VARCHAR                   │  혼자/연인/친구/가족
│ transport    │ VARCHAR                   │  자차/대중교통/도보중심
│ visit_time   │ VARCHAR                   │
│ purpose      │ VARCHAR                   │
│ origin_type  │ VARCHAR                   │  current/region/skip
│ origin_lat   │ DOUBLE PRECISION          │
│ origin_lng   │ DOUBLE PRECISION          │
│ result_place_ids │ TEXT[]               │  추천된 place_id 3개
│ created_at   │ TIMESTAMPTZ DEFAULT NOW() │
└──────────────┴──────────────────────────┘
```

## 관계도

```
users ─────────────┬──── bookmarks ──── places
                   │
                   └──── recommendation_logs
```

## Supabase RLS 정책 (Row Level Security)

| 테이블 | 정책 | 조건 |
|--------|------|------|
| places | SELECT | 전체 공개 |
| bookmarks | SELECT / INSERT / DELETE | `user_id = auth.uid()` |
| recommendation_logs | INSERT | 인증 사용자 또는 anonymous |
| users | SELECT / UPDATE | `id = auth.uid()` |

## 인덱스

```sql
-- 위치 기반 검색 최적화
CREATE INDEX idx_places_lat_lng ON places(lat, lng);

-- 감성 검색 최적화
CREATE INDEX idx_places_primary_mood ON places(primary_mood);
CREATE INDEX idx_places_city ON places(city);
CREATE INDEX idx_places_scene_tags ON places USING GIN(scene_tags);
CREATE INDEX idx_places_mood_tags ON places USING GIN(mood_tags);

-- 북마크 조회 최적화
CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);
```
