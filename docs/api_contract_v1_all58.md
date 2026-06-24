# GOAT 추천 API 계약서 v1.3_api_first_fallback


## 0. v1.3 데이터 소스 모드

초기 구현은 `dataSourceMode: "api-first"`를 사용할 수 있다. 이 경우 백엔드는 한국관광공사 OpenAPI를 먼저 호출하고, API 후보 품질이 낮으면 GOAT 58개 seed 추천으로 fallback한다.

| 값 | 의미 |
|---|---|
| `api-first` | 실제 OpenAPI 후보를 먼저 사용하고 품질 실패 시 seed fallback |
| `seed-first` | API 후보 생성 없이 GOAT seed 추천 우선 |
| `seed-only` | 테스트/시연 안정화를 위해 seed만 사용 |

응답에는 선택적으로 아래 QA 필드를 포함할 수 있다.

```json
{
  "dataSourceRequested": "api-first",
  "dataSourceUsed": "api | seed-fallback | seed",
  "apiQuality": {
    "passed": false,
    "candidateCount": 1,
    "topScore": 18,
    "top3AverageScore": 0,
    "fallbackReason": "API_CANDIDATES_TOO_FEW"
  }
}
```

이 필드는 사용자 화면보다는 QA/디버그용이다.

## 1. 최종 변경점

- 장소 후보는 삭제하지 않고 `GOAT-001 ~ GOAT-058` 58개 전체를 seed pool로 유지한다.
- 요청 조건에 따라 실제 추천 계산 pool은 `ALL58` 또는 `PRIMARY43`가 된다.
- `ALL58`: 숙소·료칸·리조트·카라반 감성, 후보 장소, 확장 장면까지 포함한다.
- `PRIMARY43`: 일반 방문지/사진스팟 추천에서 쓰는 confirmed + 비숙박/비리조트 43개 pool이다.
- `data_status`는 무조건 제외 조건이 아니라 점수 보정과 안내 배지에 사용한다.
- 프론트 응답 구조는 `status/resultData/recommendations` 기준으로 통일한다.
- 추상 무드 태그는 `moodExpansion`으로 실제 장면/스타일 태그에 연결한다.
- `PRIMARY43` 결과가 약한 조합은 `auto` 모드에서 `ALL58`로 한 번 재시도할 수 있다.

## 2. 추천 요청

`POST /api/recommendations`

```json
{
  "requestId": "demo-sea-road-001",
  "dataSourceMode": "api-first",
  "source": "manual-demo",
  "extractedTags": ["바다", "해안도로", "캘리포니아", "로드트립", "일몰"],
  "moodTags": ["청량함", "이국적"],
  "sceneTags": ["드라이브", "오션뷰"],
  "preferredSeason": "봄",
  "preferredTime": "오후~일몰",
  "regionGroup": "동해안권",
  "weatherTag": "맑은 날",
  "companionType": "연인",
  "travelPurpose": "사진 위주",
  "transportType": "자차",
  "limit": 3,
  "poolMode": "auto"
}
```


## 2-1. `requestId` 저장 기준

요청 바디의 `requestId`는 DB 기본키가 아니라 프론트/시연/테스트 추적용 문자열이다.

| 구분 | 필드 | 값 |
|---|---|---|
| DB 내부 PK | `recommendation_requests.request_id` | 서버가 생성하는 `uuid` |
| 클라이언트 추적 ID | `recommendation_requests.client_request_id` | 요청 바디의 `requestId` 문자열 |

예를 들어 요청 바디에 `"requestId": "demo-sea-road-001"`이 들어오면, 백엔드는 `request_id`에는 서버 생성 uuid를 넣고 `client_request_id`에는 `demo-sea-road-001`을 저장한다.

## 3. `poolMode` 기준

| 값 | 의미 |
|---|---|
| `auto` | 기본값. 백엔드가 태그 조건에 따라 `ALL58` 또는 `PRIMARY43` 결정 |
| `all58` | 58개 전체 후보 강제 사용 |
| `primary43` | confirmed + 비숙박/비리조트 43개 pool 강제 사용 |

`auto` 기준:

- 숙소·료칸·리조트·카라반 관련 태그가 있으면 `ALL58`.
- 해안도로·로드트립·주상절리·잔도처럼 후보 장소가 필요한 확장 장면이면 `ALL58`.
- 일반 방문지/사진스팟 추천이면 `PRIMARY43`.


## 3-1. v1.3+ 선택 조건 점수 필드

아래 필드는 선택값이다. 프론트가 아직 넘기지 않으면 백엔드는 0점 처리한다.

| 필드 | 예시 | 설명 |
|---|---|---|
| `companionType` | `혼자`, `연인`, `친구`, `가족` | 동행 유형에 맞는 장소를 소폭 올린다. |
| `travelPurpose` | `사진 위주`, `산책`, `액티비티`, `휴식`, `먹거리` | 여행 목적에 맞는 장소를 소폭 올린다. 문자열 또는 배열 모두 가능하다. |
| `transportType` | `자차`, `대중교통`, `도보` | 장소의 접근성 `상/중/하`를 기준으로 이동수단 적합도를 반영한다. |
| `weatherTag` | `맑은 날`, `비`, `흐린 날`, `강풍`, `눈` | 방문 적합도 기준으로 날씨를 가산·감점한다. |

응답 카드의 `scoreBreakdown`에는 `companion`, `travelPurpose`, `transport`, `weather`가 포함될 수 있다.

## 4. 추천 응답

프론트는 `resultData.recommendations` 배열로 카드 3개를 표시한다.

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

## 5. 백엔드 처리 순서

1. DB에 `goat_schema.sql`과 `seed_places_all58.sql`을 반영한다.
2. `dataSourceMode`가 `api-first`이면 OpenAPI 후보를 먼저 수집하고 `recommendWithApiFallback(input, apiCandidates, seedPlaces)`를 호출한다.
3. OpenAPI 후보 품질이 통과하면 API 후보가 `RecommendationCard`로 변환되어 `dataSourceUsed: "api"`로 반환된다.
4. OpenAPI 후보 품질이 낮으면 seed 추천으로 대체되고 `dataSourceUsed: "seed-fallback"`, `apiQuality.fallbackReason`이 함께 반환된다.
5. `seed-first` 또는 `seed-only`이면 `getGoatRecommendations(input, places)` 기반 seed 추천을 사용한다.
6. 응답의 `seedPoolSize`가 58인지 확인한다.
7. seed 추천 기준 `candidatePoolSize`는 조건에 따라 58 또는 43이 될 수 있다. API 추천 기준 `candidatePoolSize`는 API 후보 수로 볼 수 있다.
8. 요청 로그 저장 시 `request_id`는 서버 생성 uuid, `client_request_id`는 요청 바디의 `requestId`로 저장한다.
9. 결과 로그 저장 시 `adaptive_pool_retry_used`, `data_source_requested`, `data_source_used`, `api_quality`를 함께 저장한다.

## 6. 프론트 처리 순서

1. API 전에는 `mock_recommendation_response.json`으로 카드 화면 선개발.
2. API 완성 후 같은 타입으로 교체.
3. 이미지가 없으면 기본 이미지 사용.
4. 좌표가 없으면 `mapSearchQuery`로 지도 검색 연결.
5. 화면 디버그용으로 `poolPolicy`, `candidatePoolSize`, `adaptivePoolRetryUsed`, `dataSourceUsed`, `apiQuality.fallbackReason`을 작은 텍스트로 표시해도 된다.

## 7. 태그 구분 기준

| 구분 | 용도 | 예시 | 점수 영향 |
|---|---|---|---|
| `sceneTags` | 실제 보이는 장면 | 바다, 해안도로, 철길, 목장, 숲, 협곡 | 높음 |
| `moodTags` | 추상 분위기 | 청량함, 이국적, 낭만적, 탁트임 | 낮음, expansion 사용 |
| `styleTags` | 해외감성/연상 스타일 | 일본감성, 캘리포니아, 발리, 북유럽 | 중간 |
| `conditionTags` | 계절/시간/날씨 | 겨울, 일몰, 흐린날 | 보정 |
| `intentTags` | pool 전환 | 숙소, 료칸, 리조트, 카라반 | ALL58 전환 |

`숙소`, `리조트`, `료칸`은 장면 태그가 아니라 intent 태그로 본다. 그래서 일반 방문지 추천에서는 PRIMARY43을 쓰지만, 숙소 의도가 있으면 ALL58을 사용한다.

## 8. 약한 태그와 재시도 기준

단독으로 후보 3개를 안정적으로 만들기 어려운 태그는 `꽃밭`, `폐광`, `산`, `호수`, `발리`, `산토리니`, `이국적`, `청량함`, `낭만적`, `탁트임`, `도시적`이다.

이 태그들은 프론트에서 단독 선택 카드로 노출하지 말고, `발리+서핑+해변`, `호수+반영+SNS`, `폐광+레트로+흐린날`처럼 조합으로 사용한다. `auto` 모드에서 PRIMARY43 결과가 약하면 백엔드가 ALL58로 재시도하고 `adaptivePoolRetryUsed: true`를 반환한다.
