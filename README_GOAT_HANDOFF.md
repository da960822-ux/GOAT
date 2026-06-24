# GOAT 백엔드·프론트 인계 패키지 v1.3_api_first_fallback

생성일: 2026-06-23  
수정 기준: **API-first 품질 게이트 + API 후보 카드 변환 + seed fallback + 58개 전체 seed pool 유지 + 조건별 PRIMARY43 + adaptive ALL58 재시도**


## 빠른 시작 문서

- `README_FOR_BACKEND_FRONTEND.md`: 프론트엔드·백엔드가 바로 이해해야 하는 실행/연동/응답 기준.
- `README_FOR_DB_AI_RECOMMENDATION_OWNER.md`: DB·AI 추천 로직 담당자가 바로 이해해야 하는 태그/후보/로직 기준.
- `docs/tag_combination_coverage_final_v1_3.md`: 13개 태그 조합별 전체 유효 후보 목록.
- `docs/tag_combination_coverage_raw_v1_3.json`: 조합별 raw 점수와 후보 상세 데이터.

## 핵심 변경

이 버전은 장소 후보를 삭제하지 않는다. 원본 후보는 항상 `GOAT-001 ~ GOAT-058` 58개다.  
다만 추천 요청 조건에 따라 아래 두 가지 pool 중 하나로 추천한다. v1.3에서는 API 후보 품질이 충분하면 API 후보를 RecommendationCard로 직접 반환하고, 품질이 낮으면 58개 seed 추천으로 fallback한다. v1.2의 태그 분류, 추상 무드 확장, 약한 태그 조합 보강, adaptive ALL58 재시도 기준도 유지한다.

| pool | 의미 | 사용 조건 |
|---|---|---|
| `ALL58` | 58개 전체 후보 | 숙소·료칸·리조트·카라반 감성, future_candidate/needs_verification 후보가 필요한 장면, 해안도로·주상절리 같은 확장 장면 |
| `PRIMARY43` | 58개 중 confirmed + 비숙박/비리조트 43개 | 일반 방문지·사진스팟 추천, 검증 완료 장소 중심 추천 |

## 포함 파일

### root
- `package.json`: v1.3.0. 추천 엔진 테스트와 TypeScript typecheck 실행 스크립트 포함.
- `tsconfig.json`: TypeScript/ESM 실행 설정.
- `test_engine.ts`: 13개 추천 QA 케이스 실행 파일.

### data
- `goat_places_all58.json`: 58개 전체 후보 정규화 데이터. 검색 태그에서 `1번`, `6월`, `오는` 노이즈 제거 완료.
- `tag_dictionary_v1_all58.json`: 장면/무드/스타일/의도 태그 분리, aliases, relatedTags, moodExpansion, 약한 태그 정책.
- `recommendation_test_cases.json`: 시연/QA용 추천 입력 13개 케이스. expected pool policy, adaptive retry 기대값 포함.

### backend
- `goat_schema.sql`: DB 테이블 생성 SQL. `recommendation_requests.client_request_id`와 v1.3 API-first QA 필드 포함.
- `seed_places_all58.sql`: 58개 전체 후보 seed SQL.
- `migration_add_client_request_id.sql`: 기존 DB에 `client_request_id`만 추가할 때 쓰는 보완 SQL.
- `migration_add_api_first_fields_v1_3.sql`: 기존 DB에 `adaptive_pool_retry_used`, `data_source_requested`, `data_source_used`, `api_quality`를 추가하는 v1.3 보완 SQL.
- `recommendationEngine.ts`: 58개 seed + 조건별 43개 필터 + 태그 분류/무드 확장 + adaptive ALL58 재시도 추천 로직.
- `apiFirstRecommendationAdapter.ts`: OpenAPI 후보 품질 평가, API 후보 → RecommendationCard 변환, seed fallback 연결 로직.
- `recommendation_api_response.sample.json`: 백엔드 응답 샘플.

### frontend
- `recommendationResponse.types.ts`: 프론트 타입 정의. `seedPoolSize`, `candidatePoolSize`, `poolPolicy`, `poolReason`, `adaptivePoolRetryUsed`, `dataSourceRequested`, `dataSourceUsed`, `apiQuality` 포함.
- `mock_recommendation_response.json`: 프론트 선개발용 mock 응답.
- `frontend_mapping_guide.md`: 카드/상세/지도 연결 필드 매핑 가이드. v1.3 dataSource QA 필드 표시 기준 포함.

### docs
- `api_contract_v1_all58.md`: 추천 API 계약서. v1.3 API-first/fallback 응답 필드 포함.
- `data_decision_note.md`: 58개 seed + 조건별 43개 pool 결정 노트.
- `current_project_mapping_note.md`: 기존 프로젝트 반영 주의사항.
- `todo_one_week.md`: 일주일 긴급 작업표.
- `qa_test_result_v1_1.md`: 이전 추천 엔진 5개 케이스 검증 결과.
- `qa_test_result_v1_2.md`: 추천 엔진 13개 케이스 검증 결과.
- `tag_strategy_and_coverage_v1_2.md`: 태그 분류, 후보 커버리지, 약한 태그 정책 정리.

## 추천 엔진 테스트 실행

패키지 루트(`goat_handoff_package_v1_3_api_first_fallback/`)에서 아래 명령을 실행한다.

```bash
npm install
npm run test:recommend
```

정상 기준:

- 13개 테스트 케이스가 모두 `PASS`로 표시된다.
- `seedPoolSize`는 항상 58이다.
- `candidatePoolSize`는 케이스에 따라 58 또는 43이다.
- 실패 케이스가 있으면 프로세스 종료 코드가 1로 떨어진다.
- `abstract-mood-only` 케이스는 `adaptivePoolRetryUsed: true`가 정상이다.

## DB requestId 저장 기준

API 요청의 `requestId`는 프론트/시연/테스트 추적용 문자열이다. DB 내부 PK와 혼동하지 않는다.

| 필드 | 용도 |
|---|---|
| `recommendation_requests.request_id` | 서버가 생성하는 DB 내부 uuid PK |
| `recommendation_requests.client_request_id` | 프론트/시연/테스트에서 전달한 `requestId` 문자열 |

백엔드는 저장 시 아래 기준을 따른다.

```txt
request_id = 서버 생성 uuid
client_request_id = 프론트/시연/테스트에서 보낸 requestId
```

이미 기존 DB를 만든 상태라면 `backend/migration_add_client_request_id.sql`을 추가 실행한다.

## 바로 쓰는 순서

1. 백엔드: `goat_schema.sql` 실행.
2. 백엔드: `seed_places_all58.sql` 실행.
3. 백엔드: `recommendationEngine.ts`를 서비스 레이어에 추가.
4. 백엔드: `POST /api/recommendations`에서 `poolMode`를 받을 수 있게 연결.
5. 프론트: `mock_recommendation_response.json`으로 카드 화면 먼저 완성.
6. 백엔드/프론트: `api_contract_v1_all58.md` 기준으로 실제 API 연결.

## 반드시 지킬 것

- 58개 후보 파일에서 장소를 삭제하지 않는다.
- `candidatePoolSize`는 조건에 따라 58 또는 43이 될 수 있다.
- 전체 seed 수는 `seedPoolSize: 58`로 확인한다.
- `dataStatus === confirmed`만 무조건 남기는 필터는 금지한다.
- 숙소/리조트/후보 장소도 요청 감성이 맞으면 `ALL58`에서 추천 가능하다.
- `allCandidateTags`는 프론트 표시용이 아니라 내부 태그 점검용이다.


## v1.3에서 추가로 지킬 것

- `숙소`, `리조트`, `료칸`은 장면 태그가 아니라 intent 태그로 본다.
- `청량함`, `이국적`, `낭만적`, `탁트임` 같은 추상 무드는 직접 추천보다 `moodExpansion`으로 실제 장면 태그에 연결한다.
- `꽃밭`, `폐광`, `산`, `호수`, `발리`, `산토리니`는 단독 선택 카드로 쓰지 말고 조합으로 쓴다.
- 자유 태그 조합보다 검증된 레퍼런스 카드 12개를 먼저 프론트에 노출한다.
- `adaptivePoolRetryUsed`가 true여도 오류가 아니다. PRIMARY43 결과가 약해서 58개 전체 pool로 보강한 정상 동작이다.


## v1.3 수정 완료 항목

- `apiFirstRecommendationAdapter.ts` import 경로를 ESM/TypeScript 기준에 맞게 `./recommendationEngine.ts`로 수정했다.
- API 후보 품질이 통과하면 `ScoredApiCandidate`를 실제 `RecommendationCard`로 변환해 반환한다.
- API 후보 품질이 낮으면 `dataSourceUsed: "seed-fallback"`과 `apiQuality`를 포함해 seed 추천으로 fallback한다.
- `recommendation_results`에 v1.3 QA 저장 필드(`adaptive_pool_retry_used`, `data_source_requested`, `data_source_used`, `api_quality`)를 추가했다.
- `seed_places_all58.sql`의 `on conflict do update`에 `image_url`, `address`, `latitude`, `longitude` 업데이트를 추가했다.
- 프론트 타입과 mock 응답에 `dataSourceRequested`, `dataSourceUsed`, `apiQuality`를 추가했다.


## v1.3+ 점수 추천 로직 간단 보완

이번 보완으로 기존 태그/장면/권역/계절/시간/날씨/데이터상태 점수에 아래 선택 점수가 추가되었습니다. 새 입력값이 없으면 0점 처리되어 기존 추천 결과는 유지됩니다.

| 입력값 | 예시 | 반영 방식 |
|---|---|---|
| `companionType` | `혼자`, `연인`, `친구`, `가족` | 동행 유형에 맞는 장소 성격이면 가산, 맞지 않으면 소폭 감점 |
| `travelPurpose` | `사진 위주`, `산책`, `액티비티`, `휴식`, `먹거리` | 여행 목적과 장소 유형/태그/포토포인트가 맞으면 가산 |
| `transportType` | `자차`, `대중교통`, `도보` | 장소 접근성의 자차/대중 `상·중·하` 값을 점수화 |
| `weatherTag` | `맑은 날`, `비`, `흐린 날`, `강풍`, `눈` | 날씨에 따라 야외/실내/해안/산악/도로형 장소를 가산·감점 |

카드의 `scoreBreakdown`에는 `companion`, `travelPurpose`, `transport`, `weather`가 포함됩니다. 자세한 기준은 `docs/score_logic_update_simple_conditions_v1_3_plus.md`를 확인하면 됩니다.

---

## 추가 문서: 점수 추천 로직 README

점수 추천 로직을 백엔드/프론트엔드/DB 및 AI 추천 로직 담당자가 함께 이해할 수 있도록 정리한 문서는 아래 파일을 확인한다.

- `README_SCORE_RECOMMENDATION_LOGIC.md`

이 문서에는 추천 요청값, 점수 계산식, 새로 추가된 동행 유형/여행 목적/이동수단/날씨 점수, 응답 카드 구조, 역할별 체크리스트가 정리되어 있다.
