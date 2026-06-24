# GOAT 프론트엔드·백엔드 인계 README v1.3_api_first_fallback

생성일: 2026-06-23  
대상: 프론트엔드 담당자, 백엔드 담당자  
목적: 이 패키지를 받는 팀원이 바로 실행·연동·검증할 수 있게 만드는 인계 문서

---

## 1. 이 패키지의 한 줄 요약

GOAT 추천 패키지는 **강원 이색 장면 후보 58개를 seed pool로 유지**하고, 사용자가 선택한 태그/분위기/조건을 기준으로 **추천 카드 3개**를 반환하는 추천 로직 패키지다.

v1.3의 핵심은 아래 3가지다.

1. **58개 후보는 삭제하지 않는다.**  
   전체 seed는 항상 `GOAT-001 ~ GOAT-058`이다.

2. **실제 추천 계산 pool은 조건에 따라 58개 또는 43개가 될 수 있다.**  
   일반 방문지 추천은 `PRIMARY43`, 숙소·확장장면·후보장소가 필요한 경우는 `ALL58`을 쓴다.

3. **API-first + seed fallback 구조다.**  
   OpenAPI 후보 품질이 좋으면 API 후보를 카드로 반환하고, 품질이 낮으면 58개 seed 기반 추천으로 대체한다.

---

## 2. 최종 검증 상태

패키지 루트에서 아래 명령으로 검증한다.

```bash
npm install
npm run typecheck
npm run test:recommend
```

정상 기준:

```txt
Recommendation test result: 13 passed, 0 failed
```

현재 v1.3 기준 확인 결과:

- TypeScript typecheck 통과
- 추천 테스트 13개 전부 PASS
- `seedPoolSize` 정상값: 58
- `candidatePoolSize` 정상값: 43 또는 58
- `abstract-mood-only` 케이스는 `adaptivePoolRetryUsed: true`가 정상

---

## 3. 폴더별 핵심 파일

```txt
goat_handoff_package_v1_3_api_first_fallback/
├─ README_GOAT_HANDOFF.md
├─ README_FOR_BACKEND_FRONTEND.md                 ← 이 문서
├─ README_FOR_DB_AI_RECOMMENDATION_OWNER.md       ← DB/AI추천 담당자용
├─ package.json
├─ tsconfig.json
├─ test_engine.ts
├─ data/
│  ├─ goat_places_all58.json
│  ├─ tag_dictionary_v1_all58.json
│  └─ recommendation_test_cases.json
├─ backend/
│  ├─ goat_schema.sql
│  ├─ seed_places_all58.sql
│  ├─ migration_add_client_request_id.sql
│  ├─ migration_add_api_first_fields_v1_3.sql
│  ├─ recommendationEngine.ts
│  ├─ apiFirstRecommendationAdapter.ts
│  └─ recommendation_api_response.sample.json
├─ frontend/
│  ├─ recommendationResponse.types.ts
│  ├─ mock_recommendation_response.json
│  └─ frontend_mapping_guide.md
└─ docs/
   ├─ api_contract_v1_all58.md
   ├─ api_first_db_fallback_strategy_v1_3.md
   ├─ api_first_quality_checklist_v1_3.md
   ├─ tag_combination_coverage_final_v1_3.md
   ├─ tag_combination_coverage_raw_v1_3.json
   └─ tag_strategy_and_coverage_v1_2.md
```

---

## 4. 백엔드가 먼저 보면 되는 파일

백엔드는 아래 순서로 보면 된다.

| 순서 | 파일 | 목적 |
|---:|---|---|
| 1 | `docs/api_contract_v1_all58.md` | 요청/응답 계약 확인 |
| 2 | `backend/goat_schema.sql` | DB 테이블 생성 |
| 3 | `backend/seed_places_all58.sql` | 58개 장소 seed 입력 |
| 4 | `backend/recommendationEngine.ts` | seed 기반 추천 로직 |
| 5 | `backend/apiFirstRecommendationAdapter.ts` | OpenAPI 후보 품질평가 + API 카드 변환 + seed fallback |
| 6 | `data/recommendation_test_cases.json` | QA 테스트 케이스 |
| 7 | `test_engine.ts` | 추천 테스트 실행 파일 |

### 백엔드 구현 흐름

```txt
POST /api/recommendations
→ 요청 body 수신
→ recommendation_requests 저장
→ dataSourceMode 확인
→ api-first면 OpenAPI 후보 먼저 수집
→ recommendWithApiFallback(input, apiCandidates, seedPlaces) 호출
→ seed-only/seed-first면 getGoatRecommendations(input, seedPlaces) 호출
→ recommendation_results 저장
→ 프론트에 RecommendationApiResponse 반환
```

### 백엔드에서 반드시 저장할 필드

`recommendation_results`에는 아래 QA 필드를 저장한다.

```sql
adaptive_pool_retry_used boolean not null default false,
data_source_requested text,
data_source_used text,
api_quality jsonb
```

이 필드는 “왜 API 후보를 안 쓰고 seed fallback 했는지”, “왜 43개가 아니라 58개 pool로 갔는지”를 설명하는 근거다.

### 기존 DB가 이미 있으면 실행할 migration

```sql
-- requestId 추적용
backend/migration_add_client_request_id.sql

-- API-first/fallback QA 필드용
backend/migration_add_api_first_fields_v1_3.sql
```

---

## 5. 프론트엔드가 먼저 보면 되는 파일

프론트는 아래 순서로 보면 된다.

| 순서 | 파일 | 목적 |
|---:|---|---|
| 1 | `frontend/mock_recommendation_response.json` | API 전 화면 선개발용 mock |
| 2 | `frontend/recommendationResponse.types.ts` | 응답 타입 정의 |
| 3 | `frontend/frontend_mapping_guide.md` | 카드 UI 필드 매핑 |
| 4 | `docs/api_contract_v1_all58.md` | 실제 API 요청/응답 확인 |
| 5 | `data/recommendation_test_cases.json` | 레퍼런스 카드 입력값 확인 |

### 프론트 렌더링 기준

프론트는 우선 아래 배열만 믿고 카드 3개를 그리면 된다.

```ts
response.resultData.recommendations
```

카드에서 바로 쓰는 필드:

| UI 위치 | 응답 필드 |
|---|---|
| 카드 라벨 | `cardLabel` |
| 장소명 | `name` |
| 지역 | `city`, `regionGroup` |
| 점수 | `score` |
| 추천 이유 | `reason` |
| 포토포인트 | `photoPoint` |
| 태그 | `matchedTags` |
| 상태 배지 | `dataStatusLabel` |
| 계절/시간 | `bestSeason`, `bestTime` |
| 안전 안내 | `safetyNotes` |
| 지도 연결 | `mapSearchQuery` |
| 이미지 | `imageUrl` |

### 프론트에서 정상으로 봐야 하는 상태

- `candidatePoolSize === 43`: 정상. 일반 방문지 추천에서 `PRIMARY43` 사용.
- `candidatePoolSize === 58`: 정상. 전체 seed 또는 확장 pool 사용.
- `adaptivePoolRetryUsed === true`: 정상. 후보가 약해서 58개 전체로 재시도한 것.
- `dataSourceUsed === "seed-fallback"`: 정상. API 후보 품질이 낮아 seed 추천으로 대체한 것.
- `imageUrl === null`: 현재 seed 데이터에서는 가능. 기본 이미지/그라데이션 처리 필요.
- `latitude/longitude === null`: 현재 seed 데이터에서는 가능. `mapSearchQuery`로 지도 검색 연결.

---

## 6. API 요청 예시

```json
{
  "requestId": "demo-sea-road-001",
  "dataSourceMode": "api-first",
  "source": "reference-card",
  "extractedTags": ["바다", "해안도로", "캘리포니아", "로드트립", "일몰"],
  "moodTags": ["청량함", "이국적"],
  "sceneTags": ["드라이브", "오션뷰"],
  "preferredSeason": "봄",
  "preferredTime": "오후~일몰",
  "regionGroup": "동해안권",
  "weatherTag": "맑은 날",
  "limit": 3,
  "poolMode": "auto"
}
```

---

## 7. API 응답 핵심 구조

```json
{
  "status": "DONE",
  "resultType": "RECOMMEND",
  "score": 75.7,
  "message": "58개 seed 후보 중 58개 조건 pool 기반 추천이 완료되었습니다.",
  "failReason": null,
  "resultData": {
    "requestId": "demo-sea-road-001",
    "inputTags": ["바다", "해안도로", "캘리포니아"],
    "seedPoolSize": 58,
    "candidatePoolSize": 58,
    "poolPolicy": "ALL58",
    "poolReason": "후보 장소나 확장 장면 태그가 포함되어 58개 전체 후보를 사용했습니다.",
    "fallbackUsed": false,
    "adaptivePoolRetryUsed": false,
    "dataSourceRequested": "api-first",
    "dataSourceUsed": "api",
    "apiQuality": {
      "passed": true,
      "reason": "API 후보 품질 기준을 통과했습니다. API 후보를 추천 카드로 반환합니다.",
      "candidateCount": 8,
      "topScore": 62,
      "top3AverageScore": 48.3,
      "hasEnoughDisplayData": true,
      "fallbackReason": null
    },
    "recommendations": []
  }
}
```

---

## 8. dataSourceMode 기준

| 값 | 의미 | 사용 상황 |
|---|---|---|
| `api-first` | OpenAPI 후보 우선, 품질 낮으면 seed fallback | 최종 목표 / 실제 서비스 방향 |
| `seed-first` | API 후보 없이 seed 추천 우선 | 개발 중 안정 테스트 |
| `seed-only` | seed만 사용 | 시연 백업 / API 장애 대비 |

백엔드는 `api-first`일 때만 `apiCandidates`를 수집해서 `recommendWithApiFallback()`에 넘기면 된다.

---

## 9. poolPolicy 기준

| poolPolicy | candidatePoolSize | 의미 |
|---|---:|---|
| `ALL58` | 58 | 전체 seed 후보 사용 |
| `PRIMARY43` | 43 | confirmed + 비숙박/비리조트 중심 방문지 후보 사용 |

자동 선택 기준:

- 숙소/료칸/리조트/카라반 태그가 있으면 `ALL58`
- 해안도로/로드트립/주상절리/잔도처럼 확장 후보가 필요하면 `ALL58`
- 일반 방문지/사진스팟은 `PRIMARY43`
- PRIMARY43 결과가 약하면 자동으로 ALL58 재시도 가능

---

## 10. 프론트에 열어줄 추천 레퍼런스 카드

자유 태그 전체 선택 UI보다 아래 검증된 카드부터 여는 것이 안전하다.

| 카드명 | 핵심 태그 | 기대 Top3 |
|---|---|---|
| 캘리포니아 해안도로 컷 | 바다, 해안도로, 캘리포니아 | GOAT-031, GOAT-044, GOAT-040 |
| 일본 소도시 철길 컷 | 일본, 가마쿠라, 골목, 철길 | GOAT-029, GOAT-037, GOAT-032 |
| 알프스 목장 컷 | 초원, 목장, 알프스 | GOAT-017, GOAT-018, GOAT-019 |
| 교토 료칸 숙소 컷 | 료칸, 숙소, 자쿠지 | GOAT-007, GOAT-008, GOAT-033 |
| 흐린 날 협곡 컷 | 협곡, 주상절리, 잔도 | GOAT-058, GOAT-010, GOAT-057 |
| 북유럽 겨울 숲 컷 | 북유럽, 숲, 겨울 | GOAT-012, GOAT-020, GOAT-024 |
| 레트로 야간 시장 컷 | 레트로, 시장, 야간 | GOAT-043, GOAT-038, GOAT-035 |
| 몽골 고원 별보기 컷 | 고원, 별, 은하수 | GOAT-030, GOAT-016, GOAT-023 |
| 발리 서핑 해변 컷 | 발리, 서핑, 해변 | GOAT-044, GOAT-045, GOAT-047 |
| 유럽 정원·성당 컷 | 유럽감성, 정원, 성당 | GOAT-001, GOAT-013, GOAT-050 |
| 호수 반영 SNS 컷 | 호수, 반영, SNS | GOAT-014, GOAT-036, GOAT-040 |
| 일본 레트로 카페 컷 | 카페, 일본풍, 레트로 | GOAT-042, GOAT-054, GOAT-006 |
| 추상 무드 컷 | 청량함, 이국적 | GOAT-044, GOAT-031, GOAT-012 |

---

## 11. 절대 하지 말아야 할 것

- 58개 후보에서 임의로 장소 삭제하지 않기
- `candidatePoolSize === 43`을 오류로 처리하지 않기
- 프론트에서 API 키 직접 호출하지 않기
- `imageUrl`이 null이라고 추천 실패 처리하지 않기
- 자유 태그를 전부 단독 선택 가능하게 열지 않기
- 숙소/료칸/리조트 태그를 일반 scene tag처럼 처리하지 않기
- `dataStatus !== confirmed`인 장소를 무조건 제외하지 않기

---

## 12. 팀 합의용 최종 문장

백엔드와 프론트가 공유해야 할 기준은 이것이다.

> GOAT 추천은 58개 전체 후보를 보관하고, 조건에 따라 43개 또는 58개 pool로 계산한다. 프론트는 recommendations 배열을 렌더링하고, 백엔드는 API-first 품질이 충분하면 API 카드, 부족하면 seed fallback 카드를 반환한다. `candidatePoolSize`가 43이어도 정상이며, `seedPoolSize`는 항상 58이어야 한다.


## v1.3+ 점수 추천 로직 간단 보완

이번 보완으로 기존 태그/장면/권역/계절/시간/날씨/데이터상태 점수에 아래 선택 점수가 추가되었습니다. 새 입력값이 없으면 0점 처리되어 기존 추천 결과는 유지됩니다.

| 입력값 | 예시 | 반영 방식 |
|---|---|---|
| `companionType` | `혼자`, `연인`, `친구`, `가족` | 동행 유형에 맞는 장소 성격이면 가산, 맞지 않으면 소폭 감점 |
| `travelPurpose` | `사진 위주`, `산책`, `액티비티`, `휴식`, `먹거리` | 여행 목적과 장소 유형/태그/포토포인트가 맞으면 가산 |
| `transportType` | `자차`, `대중교통`, `도보` | 장소 접근성의 자차/대중 `상·중·하` 값을 점수화 |
| `weatherTag` | `맑은 날`, `비`, `흐린 날`, `강풍`, `눈` | 날씨에 따라 야외/실내/해안/산악/도로형 장소를 가산·감점 |

카드의 `scoreBreakdown`에는 `companion`, `travelPurpose`, `transport`, `weather`가 포함됩니다. 자세한 기준은 `docs/score_logic_update_simple_conditions_v1_3_plus.md`를 확인하면 됩니다.
