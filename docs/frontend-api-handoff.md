# GOAT 프론트엔드 연동 API 명세

이 문서는 현재 백엔드 구현과 `lib/api-spec/openapi.yaml`을 대조해 정리한 프론트엔드 공유용 계약이다.

## 1. 공통 규칙

- Base URL: `/api`
- 로그인 방식: HttpOnly 세션 쿠키 `goat.sid`
- 로그인 필요 API를 호출할 때 브라우저 요청은 쿠키를 포함해야 한다.
- 생성된 API 클라이언트의 `customFetch`는 기본적으로 `credentials: "include"`를 사용한다.
- 날짜/시간 문자열은 ISO 8601 형식이다.
- `placeId`는 `GOAT-001` 형식의 GOAT 장소 ID다.
- `recommendationId`는 저장된 추천 세션의 UUID다.

공통 성공 응답:

```ts
type ApiSuccess<T> = {
  success: true;
  code: string;
  message: string;
  data: T;
  requestId?: string;
};
```

공통 실패 응답:

```ts
type ApiError = {
  success: false;
  code: string;
  message: string;
  data: unknown | null;
  requestId: string;
};
```

`requestId`는 사용자에게 표시하는 값이 아니라 서버 오류 문의와 로그 추적에 사용한다.

## 2. 권장 프론트 흐름

```text
로그인 상태 확인
→ 무드 목록 조회
→ 추천 생성 및 저장
→ 추천 카드 3개 표시
→ 북마크 또는 LIKE/DISLIKE 처리
→ 선택 장소 하루 코스 생성 및 저장
→ 최근 추천/추천 상세에서 복원
```

공식 추천 화면에서는 `POST /recommendations`를 사용한다. 기존 `POST /recommend-from-tags`는 DB에 저장하지 않는 미리보기·호환용 API다.

## 3. 인증

### 로그인 시작

```http
GET /api/auth/google/start?redirect_to=/원하는/내부/경로
GET /api/auth/kakao/start?redirect_to=/원하는/내부/경로
```

- `fetch`로 JSON을 받는 API가 아니라 브라우저를 해당 URL로 이동시키는 OAuth 시작 URL이다.
- `redirect_to`는 `/`로 시작하는 서비스 내부 경로만 허용한다.
- 로그인 성공 후 서버가 `goat.sid` 쿠키를 발급하고 지정한 내부 경로로 이동시킨다.

### 로그인 사용자 조회

```http
GET /api/auth/me
```

```ts
type AuthUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  lastLoginAt: string | null;
  provider: "google" | "kakao";
};

type AuthMeResponse = ApiSuccess<{ user: AuthUser }>;
```

- 비로그인: `401 UNAUTHENTICATED`

### 로그아웃

```http
POST /api/auth/logout
```

- 세션을 폐기하고 쿠키를 제거한다.
- 성공 응답의 `data`는 `null`이다.

## 4. 무드 목록

```http
GET /api/moods
```

```ts
type Mood = {
  id: string;
  name: string;
  description: string;
  keywords: string[];
};

type MoodsResponse = ApiSuccess<{ moods: Mood[] }>;
```

프론트는 무드 ID를 하드코딩하지 말고 이 응답의 `id`를 추천 요청에 사용한다.

## 5. 추천 생성 및 저장

```http
POST /api/recommendations
Idempotency-Key: <클라이언트가 생성한 UUID>
Content-Type: application/json
```

로그인이 반드시 필요하다.

### Idempotency-Key 규칙

- 사용자가 추천 버튼을 한 번 누를 때 UUID를 한 개 생성한다.
- 네트워크 오류로 같은 작업을 재시도할 때는 같은 UUID를 다시 보낸다.
- 사용자가 조건을 바꾸거나 새 추천을 요청하면 새로운 UUID를 만든다.
- `requestId`를 Idempotency-Key로 사용하지 않는다.

### 요청 DTO

`moodId` 또는 `referenceCardId` 중 하나는 반드시 필요하다.

```ts
type RecommendationRequest = {
  moodId?: string;
  referenceCardId?: string;
  travelPurpose?:
    | "사진·포토스팟"
    | "산책·힐링"
    | "카페·실내휴식"
    | "전시·건축관람"
    | "체험·액티비티"
    | "먹거리·야간탐방"
    | "숙소·리조트";
  transportType?: "자차" | "대중교통" | "도보중심";
  visitTime?: "새벽" | "오전" | "한낮" | "오후" | "저녁" | "야간";
  currentMonth?: number; // 1~12
  debug?: boolean;
  preferences?: {
    companion: "혼자" | "연인" | "친구" | "가족";
    transport: "자차" | "대중교통" | "도보중심";
    visitTime?: string | null;
    purpose: "가볍게 산책" | "사진 위주" | "액티비티" | "조용한 휴식";
  };
  origin?:
    | { type: "current"; latitude: number; longitude: number }
    | { type: "region"; regionName: string }
    | { type: "skip" };
  excludeIds?: string[]; // 최대 58개, 중복 금지
};
```

예시:

```json
{
  "moodId": "mood-sea-coast",
  "travelPurpose": "산책·힐링",
  "transportType": "자차",
  "visitTime": "오후",
  "currentMonth": 7,
  "preferences": {
    "companion": "연인",
    "transport": "자차",
    "visitTime": "오후",
    "purpose": "사진 위주"
  },
  "origin": {
    "type": "region",
    "regionName": "강릉"
  }
}
```

### 추천 응답 DTO

```ts
type RecommendationRole =
  | "BEST_SCENE"
  | "SAME_MOOD_ALTERNATIVE"
  | "CONDITION_FIT_ALTERNATIVE";

type VisitConcentration = {
  level: "low" | "medium" | "high" | "unknown";
  label: string | null;
  concentrationRate: number | null;
  baseDate: string | null;
  source: "KTO_VISIT_CONCENTRATION" | "fallback";
};

type RecommendationScoreSummary = {
  moodScore: number;      // 0~45
  conditionScore: number; // 0~45
  baseScore: number;      // 0~90
  displayScore: number;   // 0~100
};

type RecommendationScoreDetails = {
  theme: {
    requested?: string;
    placeTheme: string;
    matched: boolean;
    score: number;
  };
  moodTags: MatchDetail;
  sceneTags: MatchDetail;
  purpose: {
    requested?: string;
    placePurposeTags: string[];
    matched: boolean;
    score: number;
  };
  accessibility: {
    transportType?: string;
    grade?: string;
    score: number;
    inferred?: boolean;
    note?: string;
  };
  season: {
    requested?: string;
    placeSeasonTags: string[];
    matchType: "current" | "all_season" | "none" | "not_requested";
    score: number;
  };
};

type MatchDetail = {
  requested: string[];
  matched: string[];
  count: number;
  score: number;
};

type RecommendationCard = {
  placeId: string;
  name: string;
  region: string;
  imageUrl: string | null;
  rank: 1 | 2 | 3;
  role: RecommendationRole;
  score: number; // 화면 표시용 0~100
  scoreSummary: RecommendationScoreSummary | null;
  scoreDetails: RecommendationScoreDetails | null;
  reason: string;
  reasons: string[];
  cautions: string[];
  bestSeasons: string[];
  seasonBadge: {
    label: string;
    isCurrentSeason: boolean;
  } | null;
  crowd: VisitConcentration;
  bookmarked: boolean;
  feedback: "LIKE" | "DISLIKE" | null;
};

type RecommendationData = {
  recommendationId: string;
  conditions: RecommendationRequest;
  cards: [RecommendationCard, RecommendationCard, RecommendationCard];
  course: Record<string, unknown> | null;
  createdAt: string;
};

type RecommendationResponse = ApiSuccess<RecommendationData>;
```

### 상태 코드

- `201 RECOMMENDATION_CREATED`: 새 추천 계산·저장 완료
- `200 RECOMMENDATION_REPLAYED`: 동일 Idempotency-Key 재시도로 기존 추천 반환
- 재실행 응답 헤더: `Idempotency-Replayed: true`
- `400 INVALID_IDEMPOTENCY_KEY`: 헤더가 없거나 UUID가 아님
- `400 VALIDATION_ERROR`: 요청 body 오류
- `400 INVALID_MOOD_ID`: 존재하지 않는 무드 ID
- `401 UNAUTHORIZED`: 로그인 필요
- `409 IDEMPOTENCY_KEY_REUSED`: 같은 키로 다른 조건을 전송
- `409 REQUEST_IN_PROGRESS`: 같은 요청이 아직 처리 중. `Retry-After: 1` 확인 후 같은 키로 재시도
- `422 RECOMMENDATION_FAILED`: 카드 3개 생성 실패
- `503 DB_QUERY_FAILED`: 저장 실패. 응답 `data.retryable`이 `true`면 같은 키로 재시도 가능

## 6. 최근 추천과 상세 복원

### 최근 추천

```http
GET /api/recommendations/recent?limit=1
```

- 로그인 필수
- `limit`: 1~20, 기본값 1

```ts
type RecentRecommendationsResponse = ApiSuccess<{
  items: RecommendationData[];
  nextCursor: null;
}>;
```

비로그인 상태에서는 최근 추천 영역을 숨기거나 로그인 유도 UI를 표시하고 이 API를 호출하지 않는 것을 권장한다.

### 추천 상세

```http
GET /api/recommendations/{recommendationId}
```

- 로그인 필수
- 본인 소유 추천만 조회 가능
- 성공 응답은 추천 생성 응답의 `data`와 같은 `RecommendationData`다.
- 없음 또는 타 사용자 소유: `404 RECOMMENDATION_NOT_FOUND`

### 추천 삭제

```http
DELETE /api/recommendations/{recommendationId}
```

- 로그인 필수
- 성공: `200 RECOMMENDATION_DELETED`
- 연결된 카드·경고·피드백·코스도 DB 관계에 따라 정리된다.

## 7. crowd 표시 규칙

`crowd`는 추천 당시 고정값이 아니라 추천 조회 시 백엔드가 KTO 방문 집중률 API를 다시 조회해 채우는 동적 정보다.

권장 표시:

- `low`: 여유
- `medium`: 보통
- `high`: 혼잡 예상
- `unknown`: 혼잡도 정보 없음

`source === "fallback"`이거나 `level === "unknown"`이면 혼잡도 수치를 임의로 만들어 표시하지 않는다.

## 8. 북마크

북마크는 장소 보관 기능이며 추천 피드백 `LIKE`와 별개다.

### 목록 조회

```http
GET /api/bookmarks
```

```ts
type BookmarkItem = {
  placeId: string;
  name: string;
  region: string;
  imageUrl: string | null;
  bestSeasons: string[];
  unavailable: boolean;
  bookmarkedAt: string;
};

type BookmarksResponse = ApiSuccess<{ items: BookmarkItem[] }>;
```

### 저장

```http
POST /api/bookmarks
Content-Type: application/json

{ "placeId": "GOAT-001" }
```

### 상태 조회

```http
GET /api/bookmarks/{placeId}/status
```

### 삭제

```http
DELETE /api/bookmarks/{placeId}
```

저장·상태·삭제 응답:

```ts
type BookmarkStatusResponse = ApiSuccess<{
  placeId: string;
  bookmarked: boolean;
}>;
```

관련 오류:

- `401 UNAUTHORIZED`
- `400 VALIDATION_ERROR`
- `404 PLACE_NOT_FOUND`

## 9. 추천 피드백

피드백은 사용자가 특정 추천 카드에 대해 남기는 `LIKE` 또는 `DISLIKE`다.

```http
GET    /api/recommendations/{recommendationId}/places/{placeId}/feedback
PUT    /api/recommendations/{recommendationId}/places/{placeId}/feedback
DELETE /api/recommendations/{recommendationId}/places/{placeId}/feedback
```

저장·변경 요청:

```ts
type FeedbackRequest = {
  type: "LIKE" | "DISLIKE";
  reasonCode?:
    | "TOO_FAR"
    | "NOT_MY_MOOD"
    | "TRANSPORT_DIFFICULT"
    | "ALREADY_VISITED"
    | "TOO_CROWDED"
    | "OTHER"
    | null;
  reasonText?: string | null; // 최대 500자
};
```

규칙:

- `LIKE`에는 `reasonCode`, `reasonText`를 보내지 않는다.
- `reasonCode === "OTHER"`이면 비어 있지 않은 `reasonText`가 필요하다.
- `PUT`은 최초 저장과 변경을 모두 처리한다.
- `DELETE`는 피드백을 취소한다.

응답:

```ts
type Feedback = {
  type: "LIKE" | "DISLIKE";
  reasonCode: FeedbackRequest["reasonCode"];
  reasonText: string | null;
  updatedAt?: string;
};

type FeedbackResponse = ApiSuccess<{
  recommendationId: string;
  placeId: string;
  feedback: Feedback | null;
}>;
```

추천 카드 응답의 `feedback` 필드에는 현재 `LIKE`, `DISLIKE`, `null` 상태가 함께 포함된다.

## 10. 하루 코스 생성 및 저장

```http
POST /api/recommend-course
Content-Type: application/json
```

```ts
type RecommendCourseRequest = {
  recommendationId?: string;
  selectedPlaceId: string;
  primaryTheme: string;
  userMoodTags?: string[];
  userSceneTags?: string[];
  companionType?: "혼자" | "친구" | "연인" | "가족";
  travelPurpose?: RecommendationRequest["travelPurpose"];
  transportType?: RecommendationRequest["transportType"];
  radiusMeters?: number;       // 100~20000
  maxCandidatesForLlm?: number; // 1~20
  forceRuleBasedFallback?: boolean;
  llmModel?: string;
  debug?: boolean;
};
```

- `recommendationId`를 보내면 로그인과 본인 소유 추천 카드 검증 후 생성된 코스를 해당 추천에 저장한다.
- 저장된 코스는 이후 추천 상세의 `course`에 포함된다.
- `recommendationId`를 보내지 않으면 코스만 생성하고 추천 기록에는 연결하지 않는다.

응답 핵심 필드:

```ts
type RecommendCourseData = {
  status: "DONE" | "FAILED";
  resultType: "COURSE" | "UNKNOWN";
  mode: "LLM_OPENROUTER" | "RULE_BASED_FALLBACK";
  message: string;
  selectedPlace: Record<string, unknown>;
  conditions: Record<string, unknown>;
  nearbyCandidateCount: number;
  courseTitle?: string;
  summary?: string;
  stops: CourseStop[];
  staticMap: Record<string, unknown>;
  llmPromptUsed?: boolean;
  failReason?: string | null;
  warnings: string[];
};
```

정적 지도 처리 방식은 기존 정책을 유지한다.

## 11. 장소 상세

```http
GET /api/places/{placeId}
```

```ts
type PlaceResponse = ApiSuccess<{
  place: Record<string, unknown>;
}>;
```

- 존재하지 않는 장소: `404`

## 12. 이미지 및 KTO 보조 API

프론트 화면 컴포넌트가 직접 조립하기보다 기존 장소·사진 서비스 adapter를 통해 사용하는 것을 권장한다.

```http
GET /api/image-status?url=<KTO 이미지 URL>
GET /api/kto?path=<허용된 KTO API 경로>&...
```

`/image-status`는 사용자 사진 분석 API가 아니다. KTO 이미지 URL이 실제 이미지인지 검사해 로컬 이미지 fallback을 결정하는 API다.

## 13. 프론트 구현 시 반드시 합의할 항목

1. 비로그인 상태에서는 최근 추천·북마크·피드백 UI를 숨길지 로그인 유도를 표시할지
2. 추천 카드에서 `score`만 표시할지 `scoreSummary`와 `scoreDetails`까지 펼쳐 보여줄지
3. `reasons`와 `cautions`의 최대 노출 개수
4. `crowd.level === "unknown"`의 문구와 UI
5. 북마크 버튼과 추천 `LIKE` 버튼을 서로 다른 기능으로 표현하는 방법
6. `REQUEST_IN_PROGRESS`, `DB_QUERY_FAILED` 재시도 UX
7. 최근 추천 기본 조회 개수

## 14. 현재 OpenAPI 보완 필요 사항

다음은 실제 백엔드 동작은 존재하지만 현재 OpenAPI 계약에서 빠졌거나 느슨하게 표현된 부분이다.

- `/auth/*` 경로가 OpenAPI에 없음
- `/image-status`가 OpenAPI에 없음
- 북마크 목록 item이 `additionalProperties: true`로만 정의됨
- 피드백 응답 `data`가 `additionalProperties: true`로만 정의됨
- 추천 생성 API의 `400`, `401`, `422`, `503` 오류 응답 선언이 일부 누락됨
- 추천 상세·최근 추천·북마크·피드백의 공통 `401` 오류 선언이 일부 누락됨

프론트와 최종 계약을 확정한 뒤 위 항목을 OpenAPI에 반영하고 React/Zod 클라이언트를 다시 생성해야 한다.
