# 2026-07-09 GOAT AI Recommendation Changes

이 문서는 `GOAT_FINAL_AI_API_RECOMMENDATION` 자료를 기준으로 오늘 레포에 반영한 변경 사항을 백엔드, 프론트 확인용 화면, 환경 변수, 검증 항목으로 정리한 기록이다.

## 1. 환경 변수 로드 및 보안

- 루트 상위 폴더의 `GOAT.env`를 자동으로 읽도록 API 서버 초기화 로직을 추가했다.
- `GOAT_ENV_FILE` 환경 변수가 있으면 해당 파일을 우선 사용하고, 없으면 레포 바로 상위 폴더의 `GOAT.env`를 기본으로 읽는다.
- 이미 주입된 환경 변수는 덮어쓰지 않도록 처리했다.
- `.gitignore`에 `.env`, `.env.*`, `GOAT.env` 계열을 추가해 API 키가 커밋되지 않게 막았다.
- 단, `.env.example`은 계속 커밋 가능하게 예외 처리했다.

주요 파일:

- `artifacts/api-server/src/lib/load-env.ts`
- `artifacts/api-server/src/index.ts`
- `.gitignore`

주의:

- OpenRouter API key가 화면에 노출된 적이 있으므로 실제 운영/제출 전에는 키를 재발급하는 것이 안전하다.

## 2. 추천카드 점수 산정 방식 반영

`GOAT_FINAL_AI_API_RECOMMENDATION/점수 산정 방식(기준).txt`의 새 점수 기준을 추천 엔진에 반영했다.

현재 추천카드 점수 구조:

```txt
baseScore = 방문 무드 매칭 45점 + 방문 조건 적합도 45점
routeDistanceBonus = 1번 카드 기준 연계 거리 보너스 최대 10점
displayScore = baseScore + routeDistanceBonus - duplicatePenalty
```

반영된 세부 기준:

- `primaryTheme` 일치: 18점
- `mood_tags` 일치:
  - 1개: 6점
  - 2개: 12점
  - 3개 이상: 17점
- `sceneTags` 일치:
  - 1개: 5점
  - 2개 이상: 10점
- `travelPurpose`가 `purpose_tags`에 있으면 20점
- 이동수단 접근성:
  - 상: 12점
  - 중: 7점
  - 하: 1점
- 계절 적합도:
  - 현재 계절 포함: 13점
  - 사계절 포함: 10점
  - 불일치: 0점
- `place_type`은 점수 직접 가산이 아니라 동률/보조 힌트로 사용한다.
- `companionType`은 문서 기준대로 1차 추천카드 점수에는 직접 반영하지 않는다.

주요 파일:

- `lib/travel-domain/src/goatRecommendationEngine.ts`
- `lib/travel-domain/src/goatRecommendationTypes.ts`

## 3. 감성/테마 7개 체계 반영

기존 감성 선택 체계를 새 기준의 7개 `primaryTheme` 중심으로 정리했다.

현재 7개 테마:

1. 바다·해안 무드
2. 일본 소도시·골목 무드
3. 알프스·고원·목장 무드
4. 숲·정원·자연휴식 무드
5. 레트로·시장·항구 무드
6. 건축·전시·랜드마크 무드
7. 휴양·카페·이국공간 무드

반영 내용:

- `/api/moods`가 7개 감성만 반환하도록 데이터 수정
- 모바일 감성 카드 스타일 매핑을 7개 ID 기준으로 수정
- 검증 스크립트의 기대 감성 개수를 7개로 수정
- OpenAPI 설명 일부를 7개 테마 기준으로 수정

주요 파일:

- `lib/travel-domain/src/data/mood-categories.json`
- `lib/travel-domain/src/recommendationService.ts`
- `artifacts/goat-mobile/src/components/MoodCategoryCard.tsx`
- `artifacts/api-server/scripts/verify-api.mjs`
- `artifacts/goat-mobile/scripts/verify-api-client.ts`
- `lib/api-spec/openapi.yaml`

남은 정리:

- 일부 README나 안내 화면에 예전 `9개`, `12개`라는 문구가 남아 있을 수 있다.
- 기능 동작에는 영향이 없고, 표시 문구 정리 작업으로 분리 가능하다.

## 4. 하루 코스 추천 API 추가

추천카드 3개 중 하나를 선택한 뒤, 선택 장소 중심의 하루 코스를 생성하는 API를 추가했다.

추가된 API:

```http
POST /api/recommend-course
```

요청 핵심 필드:

- `selectedPlaceId`
- `primaryTheme`
- `userMoodTags`
- `userSceneTags`
- `companionType`
- `travelPurpose`
- `transportType`
- `radiusMeters`
- `maxCandidatesForLlm`
- `forceRuleBasedFallback`
- `llmModel`
- `debug`

동작 흐름:

1. 선택한 GOAT 장소를 DB에서 찾는다.
2. 장소 좌표를 기준으로 한국관광공사 VisitKorea API에서 반경 후보를 가져온다.
3. 후보를 최대 `maxCandidatesForLlm`개로 줄인다.
4. OpenRouter LLM에 선택 장소, 후보 목록, 사용자 조건을 프롬프트로 전달한다.
5. LLM이 후보 중 조건에 맞는 장소를 골라 하루 코스를 만든다.
6. LLM 실패 또는 강제 fallback 요청 시 규칙 기반 코스를 생성한다.
7. 지도 렌더링용 Kakao map config와 fallback 링크를 응답에 포함한다.

주요 파일:

- `lib/travel-domain/src/courseRecommendationTypes.ts`
- `lib/travel-domain/src/courseRecommendationService.ts`
- `lib/travel-domain/src/tourApiClient.ts`
- `lib/travel-domain/src/openRouterCourseLlm.ts`
- `lib/travel-domain/src/kakaoStaticMap.ts`
- `lib/travel-domain/src/recommendationService.ts`
- `lib/travel-domain/src/index.ts`
- `artifacts/api-server/src/routes/travel.ts`

## 5. VisitKorea API 연결

선택 장소 좌표 주변 후보를 가져오기 위해 한국관광공사 VisitKorea API 클라이언트를 추가했다.

현재 역할:

- 선택 장소 좌표 기준 반경 검색
- 관광지/문화시설/레포츠/숙박/쇼핑/음식점 등 후보 수집
- 후보를 `TourApiNearbyCandidate` 형태로 정규화
- API 실패 시 같은 city/region_group 기반 로컬 후보 fallback 사용

주요 파일:

- `lib/travel-domain/src/tourApiClient.ts`
- `lib/travel-domain/src/courseRecommendationService.ts`

## 6. OpenRouter LLM 코스 플래너 연결

OpenRouter를 통해 LLM 코스 플래너를 붙였다.

현재 기본 모델:

```txt
openai/gpt-4o-mini
```

프롬프트에 포함되는 정보:

- 사용자가 선택한 기준 장소
- `primaryTheme`
- `userMoodTags`
- `userSceneTags`
- `companionType`
- `travelPurpose`
- `transportType`
- VisitKorea 또는 fallback 주변 후보 목록
- 후보별 거리, 카테고리, 주소, 좌표, 요약 정보

LLM 응답은 JSON으로 파싱하며, 실패 시 규칙 기반 fallback으로 전환한다.

주요 파일:

- `lib/travel-domain/src/openRouterCourseLlm.ts`
- `lib/travel-domain/src/courseRecommendationService.ts`

## 7. Kakao 지도 표시 지원

코스 응답에 지도 렌더링 정보를 포함하고, 프론트 확인용 화면에서 Kakao 지도를 표시하도록 구현했다.

반영 내용:

- 코스 stop 좌표를 기반으로 marker 배열 생성
- Kakao JS SDK 스크립트 URL 구성
- 지도 fallback 검색 링크 제공
- API 서버에 지도 iframe용 HTML endpoint 추가

추가된 API:

```http
GET /api/course-map
```

주의:

- 현재 구현은 실제 이미지 파일을 내려주는 `Kakao Static API 이미지`가 아니라, Kakao JavaScript SDK 기반 지도 렌더링이다.
- 카카오 지도 표시를 위해 Kakao Developers의 JavaScript SDK 도메인에 현재 접속 origin을 등록해야 한다.
- 예: `http://localhost:8081`, `http://127.0.0.1:8081`, `http://localhost:3000`, `http://127.0.0.1:3000`

주요 파일:

- `lib/travel-domain/src/kakaoStaticMap.ts`
- `artifacts/api-server/src/routes/travel.ts`
- `artifacts/goat-mobile/app/detail/[id].tsx`

## 8. 프론트 확인용 상세 화면 연결

정식 프론트 개편 전에도 확인할 수 있도록, 기존 상세 화면에서 선택 장소 중심 하루 코스를 볼 수 있게 연결했다.

반영 내용:

- 상세 화면 진입 시 `POST /api/recommend-course` 호출
- 응답의 `mode`, `courseTitle`, `summary`, `nearbyCandidateCount`, `stops`, `staticMap` 표시
- 웹에서는 Kakao 지도 렌더링 시도
- 지도 로드 실패 시 iframe fallback 또는 카카오맵 검색 링크 제공
- LLM 사용 여부를 badge로 확인 가능

주요 파일:

- `artifacts/goat-mobile/app/detail/[id].tsx`

## 9. OpenAPI 및 생성 클라이언트 갱신

새 코스 API를 OpenAPI에 추가하고 생성 클라이언트 타입을 반영했다.

반영 내용:

- `RecommendCourseRequest`
- `RecommendCourseData`
- `CourseStop`
- `StaticMapResult`
- `RecommendCourseSuccessResponse`
- React API client의 `recommendCourse`
- Zod/generated 타입 파일

주요 파일:

- `lib/api-spec/openapi.yaml`
- `lib/api-client-react/src/generated/api.ts`
- `lib/api-client-react/src/generated/api.schemas.ts`
- `lib/api-zod/src/generated/api.ts`
- `lib/api-zod/src/generated/types/*`

## 10. 스키마/타입 필드 대조 결과

스키마와 타입에 정의된 필드가 실제 로직에서 읽히는지 grep으로 대조했다.

확인 결과:

- 추천카드 점수 핵심 필드인 `primaryTheme`, `mood_tags`, `sceneTags`, `purpose_tags`, `season_tags`, `accessibility`는 실제 엔진에서 읽힌다.
- `/recommend-course`의 `selectedPlaceId`, `primaryTheme`, `userMoodTags`, `userSceneTags`, `companionType`, `travelPurpose`, `transportType`, `radiusMeters`, `maxCandidatesForLlm`, `forceRuleBasedFallback`, `llmModel`, `debug`는 실제 로직에서 읽힌다.

스키마에는 있지만 현재 추천 결과에 영향이 약하거나 없는 필드:

- `/recommend-from-tags`의 `origin`
- `/recommend-from-tags`의 `preferences.companion`
- `visitTime`
- `RecommendRequest.limit`
- `LlmCoursePlannerJson.selectedCandidateIds`
- `LlmCoursePlannerJson.routeNote`

의도적으로 점수에서 제외된 필드:

- `companionType`: 1차 추천카드 점수에는 미반영, 하루 코스 LLM 프롬프트에는 반영
- `visitTime`: 과거 호환용으로만 수신, 현재 점수 계산에서는 제외

## 11. 검증한 명령과 결과

다음 TypeScript 검증을 통과했다.

```powershell
.\node_modules\.bin\tsc.cmd -p .\lib\travel-domain\tsconfig.json --noEmit
.\node_modules\.bin\tsc.cmd -p .\artifacts\api-server\tsconfig.json --noEmit
.\node_modules\.bin\tsc.cmd -p .\artifacts\goat-mobile\tsconfig.json --noEmit
.\node_modules\.bin\tsc.cmd --build
```

API 동작 확인:

- `GET /api/healthz` 정상
- `POST /api/recommend-course` 정상
- `forceRuleBasedFallback=true`일 때 `RULE_BASED_FALLBACK` 확인
- LLM 정상 호출 시 `mode: LLM_OPENROUTER`, `llmPromptUsed: true` 확인
- VisitKorea 후보가 `VISITKOREA_CONTENT_LAB` source로 들어오는 것 확인
- `/api/moods`가 7개 테마를 반환하는 것 확인

프론트 확인:

- Expo web `http://localhost:8081`
- API server `http://localhost:3000`
- 상세 화면에서 코스 영역과 지도 영역 표시 확인

## 12. 서비스 흐름 8단계 반영 상태

| 단계 | 반영 상태 | 비고 |
|---|---:|---|
| 1. 테마 선택 | 완료 | `/api/moods` 7개 테마 |
| 2. 여행 조건 선택 | 완료 | 목적/교통/동행 등 수신 |
| 3. 추천카드 3개 | 완료 | 새 점수 기준 반영 |
| 4. 추천카드 1개 선택 | 완료 | 상세 화면에서 선택 장소 ID 사용 |
| 5. 선택 시 근처 가볼만한 곳 노출 | 부분 완료 | 코스 후보/결과로 반영, 별도 후보 리스트 UI는 미분리 |
| 6. 선택 장소 정보 + VisitKorea 반경 후보 추천 | 완료 | 좌표 기반 후보 조회 |
| 7. LLM이 조건 맞춤 장소 선정 | 완료 | OpenRouter 프롬프트 기반 |
| 8. 동선 정렬 후 지도 + 하루코스 제공 | 대부분 완료 | JS 지도 렌더링. 순수 Static API 이미지 파일은 아님 |

## 13. 남은 작업 후보

- 예전 문구 `9개`, `12개`가 남은 README/안내 화면 정리
- `/recommend-from-tags`의 미사용 `origin`, `preferences.companion`, `visitTime`을 유지할지 제거할지 결정
- `nearbyCandidates`를 외부 API 요청 스키마에도 열지 결정
- LLM 응답의 `routeNote`를 결과 응답과 화면에 노출할지 결정
- 진짜 정적 이미지 형태의 Kakao Static API가 필요하면 현재 JS 지도 방식과 별도로 구현
- 노출 보정/거리 보너스 관련 운영 저장소 연결 범위 결정

## 14. 주의할 git 상태

현재 `git status`에는 예전 `GOAT_backend_frontend_handoff` 폴더 삭제가 크게 잡혀 있다.

이 문서의 변경 요약은 오늘 기능 반영 중심으로 작성했다. 삭제된 자료 폴더가 의도된 정리인지, 아니면 원복해야 하는 자료인지 커밋 전에 한 번 확인해야 한다.
