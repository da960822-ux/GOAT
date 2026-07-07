# GOAT 최종 AI/API 추천 로직 완성본

## 1. 최종 서비스 흐름

이번 완성본은 사진 분석 중심 흐름을 빼고, 사용자가 직접 고른 **무드/태그 3개 + 여행 조건**을 기준으로 시작하도록 정리했다.

1. 테마 선택
2. 여행 조건 선택: 동행여부, 이동수단, 여행 목적
3. 추천카드 3개 생성
   - 1번: 최적 장면 카드
   - 2번: 같은 무드 대안 카드
   - 3번: 이동수단·계절·연계거리 조건 맞춤 카드
4. 사용자가 추천카드 3개 중 1개 선택
5. 선택 장소 상세 정보 노출
6. 선택 장소 좌표 기준 한국관광콘텐츠랩 OpenAPI 주변 후보 조회
7. OpenRouter GPT-4o mini LLM 프롬프트로 주변 후보 중 동행자/테마/목적에 맞는 후보 선정
8. 동선 정렬 후 Kakao JS SDK StaticMap 렌더링 config 또는 Kakao 검색 링크와 하루 코스 반환

### 한국관광콘텐츠랩 OpenAPI 적용 기준

- 데이터 출처/활용신청 기준은 `https://api.visitkorea.or.kr`의 한국관광콘텐츠랩 OpenAPI로 고정한다.
- 2차 주변 후보 조회는 국문 관광정보 서비스_GW의 위치기반 관광정보 조회(`locationBasedList2`)를 사용한다.
- 실제 REST 호출 endpoint는 한국관광콘텐츠랩 OpenAPI가 제공하는 공공 API 게이트웨이 주소(`https://apis.data.go.kr/B551011/KorService2/locationBasedList2`)를 사용한다. 이 주소는 임의 관광 사이트가 아니라 한국관광공사 국문 관광정보 OpenAPI 호출 endpoint다.
- 서비스 키 환경변수는 `VISITKOREA_SERVICE_KEY`를 우선 사용한다.

## 2. 핵심 수정 방향

### 기존 기준에서 유지한 부분

- primaryTheme, mood_tags, sceneTags는 1차 추천 카드 점수 계산에 그대로 사용한다.
- 이동수단 접근성은 `상=12점`, `중=7점`, `하=1점`으로 계산한다.
- 계절 적합도는 현재 계절 일치 13점, 사계절 10점, 불일치 0점으로 계산한다.
- routeDistanceBonus는 1번 카드에는 적용하지 않고, 2번/3번 카드에만 최대 10점으로 적용한다.
- 좌표가 없으면 routeDistanceBonus는 0점 처리한다.

### 새 흐름에 맞게 바꾼 부분

- `travelPurpose`는 더 이상 1차 추천카드 필터/점수에 직접 반영하지 않는다.
- `companionType`도 1차 추천카드 점수에는 넣지 않는다.
- 두 값은 사용자가 카드 1개를 선택한 뒤, LLM이 주변 후보를 골라 하루 코스를 만드는 2차 큐레이션 단계에서 사용한다.
- 이 변경을 추적할 수 있도록 `TRAVEL_PURPOSE_RESERVED_FOR_LLM_COURSE`, `COMPANION_RESERVED_FOR_LLM_COURSE` warning을 추가했다.

## 3. 추가/수정된 주요 파일

### 1차 태그 기반 추천

- `SEND_TO_BACKEND/src/goatRecommendationEngine.ts`
  - 접근성 점수 기준 수정: `상 12 / 중 7 / 하 1`
  - 계절 점수 기준 수정: 현재 계절 13 / 사계절 10
  - 여행 목적을 1차 카드 점수에서 제외하고 2차 LLM 단계로 넘기도록 수정
  - 카드3을 `travelPurpose` 필터가 아니라 이동수단·계절·연계거리 중심으로 수정

- `SEND_TO_BACKEND/src/goatRecommendationTypes.ts`
  - `CompanionType` 추가
  - `companionType`, `usePurposeInCardScore` 입력 필드 추가
  - purpose 점수에 `usedInCardScore`, `usedInCoursePlanning` 메타데이터 추가

### 2차 LLM 코스 큐레이션

- `SEND_TO_BACKEND/src/courseRecommendationTypes.ts`
  - 한국관광콘텐츠랩 OpenAPI 후보, 코스 stop, 정적 지도 결과, 하루 코스 응답 타입 정의

- `SEND_TO_BACKEND/src/openRouterCourseLlm.ts`
  - OpenRouter `openai/gpt-4o-mini` 호출 로직
  - JSON-only LLM 프롬프트 생성
  - `.env`의 `OPENROUTER_API_KEY` 자동 로드
  - LLM 응답 JSON 파싱

- `SEND_TO_BACKEND/src/tourApiClient.ts`
  - 선택 장소 좌표 기준 한국관광콘텐츠랩 OpenAPI 위치기반 관광정보 조회 함수
  - 관광지/문화시설/쇼핑/음식점 후보 조회 지원
  - `VISITKOREA_SERVICE_KEY` 우선 사용, 기존 호환용으로 `KTO_SERVICE_KEY`, `TOUR_API_SERVICE_KEY`, `TOURAPI_SERVICE_KEY`도 지원

- `SEND_TO_BACKEND/src/kakaoStaticMap.ts`
  - 코스 stop 좌표가 있으면 프론트에서 `kakao.maps.StaticMap`으로 렌더링할 수 있는 config 생성
  - 키 또는 좌표가 부족하면 Kakao Map 검색 링크로 fallback

- `SEND_TO_BACKEND/src/courseRecommendationService.ts`
  - 선택된 추천카드 장소 → 한국관광콘텐츠랩 OpenAPI 후보 확보 → OpenRouter LLM 코스 생성 → Kakao 지도 결과 반환까지 통합
  - LLM/한국관광콘텐츠랩 OpenAPI 실패 시 규칙 기반 fallback 코스 반환

### 실행/검증 예시

- `SEND_TO_BACKEND/examples/finalServiceFlow.demo.ts`
  - 1차 추천카드 3개 생성
  - 사용자가 1번 카드를 선택했다고 가정
  - 주변 후보 mock 데이터를 넣어 하루 코스 생성

- `SEND_TO_BACKEND/examples/finalServiceFlow.demo.output.json`
  - 위 demo 실행 결과 저장본

## 4. 실행 방법

```bash
cd SEND_TO_BACKEND
npm run build
npm test
node dist/examples/finalServiceFlow.demo.js
```

OpenRouter LLM을 실제 호출하려면 `.env`에 `OPENROUTER_API_KEY`가 있어야 하고, `createGoatDayCourse()` 호출 시 `forceRuleBasedFallback`을 `false` 또는 생략한다.

한국관광콘텐츠랩 OpenAPI를 실제 호출하려면 선택 장소에 `latitude/longitude` 또는 `lat/lng`가 있어야 하고, `.env` 또는 서버 환경변수에 `VISITKOREA_SERVICE_KEY`를 넣는다. 기존 호환을 위해 `KTO_SERVICE_KEY`, `TOUR_API_SERVICE_KEY`, `TOURAPI_SERVICE_KEY`도 읽을 수 있다.

Kakao StaticMap을 실제로 쓰려면 코스 후보 좌표와 `KAKAO_JAVASCRIPT_KEY` 또는 지도 앱 키가 필요하다. 프론트는 반환된 `staticMap.staticMapConfig`를 `kakao.maps.StaticMap` 렌더링 옵션으로 사용하면 된다.

## 5. 검증 결과

- `npm run build`: 성공
- `npm test`: 성공
- `node dist/examples/finalServiceFlow.demo.js`: 성공
- `.env` 안의 `OPENROUTER_API_KEY` 존재 확인: 성공
- OpenRouter live healthcheck: 현재 샌드박스 런타임에서 외부 네트워크 `fetch failed`로 실제 응답 확인은 실패함. 코드 경로와 키 로드는 확인했지만, 라이브 응답 성공 여부는 로컬/서버 환경에서 재확인해야 한다.

## 6. 현재 데이터 한계

현재 포함된 58개 장소 DB에는 `imageUrl`, `address`, `latitude`, `longitude`가 비어 있다. 따라서 1차 태그 점수 추천은 실제 데이터로 정상 동작하지만, 2차 한국관광콘텐츠랩 OpenAPI 반경 검색과 Kakao Static Map은 좌표가 채워져야 완전히 자동화된다. 좌표가 없을 때는 같은 city/region_group 기반 로컬 후보 fallback 또는 프론트/백엔드가 넘긴 `nearbyCandidates`를 사용하도록 처리했다.

## 7. 백엔드 연결 포인트

1차 카드 추천:

```ts
const result = recommendGoatPlaces(request, placesDataset, referenceDataset);
```

선택 장소 기반 하루 코스:

```ts
const course = await createGoatDayCourse({
  selectedPlaceId: "GOAT-048",
  primaryTheme: "바다·해안 무드",
  userMoodTags: ["청량함", "로드트립감성"],
  userSceneTags: ["바다", "해안도로"],
  companionType: "친구",
  travelPurpose: "사진·포토스팟",
  transportType: "자차"
}, placesDataset);
```

## 8. GitHub 주의

`SEND_TO_BACKEND/.env`에는 사용자가 제공한 OpenRouter API 키가 그대로 들어 있다. 로컬 실행용으로는 유지했지만, GitHub에는 절대 커밋하지 말고 `.gitignore`에 `.env`를 포함해야 한다.
