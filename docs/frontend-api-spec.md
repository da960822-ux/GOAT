# GOAT 프론트엔드 API 명세

작성일: 2026-07-05

이 문서는 프론트엔드에서 바로 연동해야 하는 백엔드 API 명세입니다.

## 1. 기본 정보

개발 서버 기준 API Base URL:

```text
http://localhost:3000/api
```

프론트 개발 서버:

```text
http://localhost:8081
```

현재 백엔드에서 허용한 CORS Origin:

```text
http://localhost:8081
http://localhost:5173
http://localhost:3000
```

프론트에서 쿠키 세션을 사용하는 API를 호출할 때는 반드시 `credentials: "include"`를 넣어야 합니다.

```ts
fetch("http://localhost:3000/api/auth/me", {
  credentials: "include",
});
```

## 2. 공통 응답 형식

대부분의 API 성공 응답:

```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "처리 결과 메시지",
  "data": {}
}
```

대부분의 API 실패 응답:

```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "에러 메시지",
  "data": null
}
```

단, 아래 API는 예외적으로 공통 응답 형식을 사용하지 않습니다.

```text
GET /api/kto
GET /api/image-status
GET /api/healthz
```

## 3. 로그인 / 인증 API

인증 방식은 Bearer Token이 아니라 **HTTP-only 쿠키 세션 방식**입니다.

세션 쿠키 이름:

```text
goat.sid
```

쿠키 특징:

```text
HttpOnly
SameSite=Lax
Path=/
Max-Age=14일
production 환경에서만 Secure=true
```

프론트에서는 쿠키 값을 직접 읽을 수 없습니다. 로그인 여부는 `/api/auth/me`로 확인해야 합니다.

## 4. 구글 로그인

### 4.1 구글 로그인 시작

```http
GET /api/auth/google/start
```

프론트는 이 API를 `fetch`로 호출하지 말고, 브라우저 페이지 이동으로 열어야 합니다.

```ts
function loginWithGoogle() {
  window.location.href = "http://localhost:3000/api/auth/google/start";
}
```

선택 query:

| 이름 | 타입 | 설명 |
|---|---|---|
| `redirect_to` | string | 로그인 성공 후 이동할 프론트 내부 경로입니다. `/`로 시작해야 합니다. |

예시:

```text
http://localhost:3000/api/auth/google/start?redirect_to=/mypage
```

동작:

1. 백엔드가 Google 로그인 페이지로 리다이렉트합니다.
2. 사용자가 Google 로그인을 완료합니다.
3. Google이 백엔드 callback API로 돌아옵니다.
4. 백엔드가 세션 쿠키를 발급합니다.
5. 백엔드가 프론트의 `/login/callback`으로 이동시킵니다.

### 4.2 구글 로그인 콜백

```http
GET /api/auth/google/callback
```

프론트가 직접 호출하지 않습니다.

Google Cloud Console에 등록해야 하는 Redirect URI:

```text
http://localhost:3000/api/auth/google/callback
```

로그인 성공 후 백엔드가 이동시키는 프론트 주소:

```text
http://localhost:8081/login/callback
```

로그인 실패 후 백엔드가 이동시키는 프론트 주소:

```text
http://localhost:8081/login
```

## 5. 카카오 로그인

### 5.1 카카오 로그인 시작

```http
GET /api/auth/kakao/start
```

프론트는 이 API를 `fetch`로 호출하지 말고, 브라우저 페이지 이동으로 열어야 합니다.

```ts
function loginWithKakao() {
  window.location.href = "http://localhost:3000/api/auth/kakao/start";
}
```

선택 query:

| 이름 | 타입 | 설명 |
|---|---|---|
| `redirect_to` | string | 로그인 성공 후 이동할 프론트 내부 경로입니다. `/`로 시작해야 합니다. |

예시:

```text
http://localhost:3000/api/auth/kakao/start?redirect_to=/mypage
```

현재 백엔드는 카카오 authorize 요청에 `scope`를 직접 보내지 않습니다.  
카카오 동의항목은 카카오 Developers 콘솔 설정을 따릅니다.

현재 필요한 카카오 동의항목:

```text
profile_nickname
profile_image
```

카카오 Developers에 등록해야 하는 Redirect URI:

```text
http://localhost:3000/api/auth/kakao/callback
```

등록 위치:

```text
앱 설정 > 앱 > 플랫폼 키 > REST API 키 > 카카오 로그인 리다이렉트 URI
```

사용하는 키:

```text
REST API 키
```

네이티브 앱 키는 사용하지 않습니다.

### 5.2 카카오 로그인 콜백

```http
GET /api/auth/kakao/callback
```

프론트가 직접 호출하지 않습니다.

카카오 로그인 완료 후 백엔드가 처리하는 일:

1. 카카오가 넘긴 `code`, `state`를 확인합니다.
2. 카카오 access token을 발급받습니다.
3. 카카오 사용자 정보를 조회합니다.
4. DB에 사용자/소셜 계정 정보를 저장하거나 갱신합니다.
5. 세션 쿠키 `goat.sid`를 발급합니다.
6. 프론트 `/login/callback`으로 이동시킵니다.

카카오 이메일은 현재 `null`일 수 있습니다. 지금은 닉네임과 프로필 이미지를 중심으로 사용하면 됩니다.

## 6. 현재 로그인 사용자 조회

```http
GET /api/auth/me
```

로그인 상태를 확인하는 API입니다.

프론트 호출 예시:

```ts
async function fetchMe() {
  const res = await fetch("http://localhost:3000/api/auth/me", {
    credentials: "include",
  });

  if (res.status === 401) {
    return null;
  }

  const body = await res.json();
  return body.data.user;
}
```

성공 응답:

```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "Authenticated user loaded.",
  "data": {
    "user": {
      "id": "a8f5d4b0-0000-0000-0000-000000000000",
      "email": "user@example.com",
      "displayName": "홍길동",
      "avatarUrl": "https://...",
      "lastLoginAt": "2026-07-05T01:00:00.000Z",
      "provider": "google"
    }
  }
}
```

사용자 필드:

| 필드 | 타입 | nullable | 설명 |
|---|---|---:|---|
| `id` | string | no | GOAT 내부 사용자 UUID |
| `email` | string | yes | 소셜 계정 이메일. 카카오는 `null`일 수 있습니다. |
| `displayName` | string | yes | Google 이름 또는 Kakao 닉네임 |
| `avatarUrl` | string | yes | 소셜 프로필 이미지 URL |
| `lastLoginAt` | string | yes | 마지막 로그인 시각 |
| `provider` | `"google"` 또는 `"kakao"` | no | 현재 세션의 로그인 제공자 |

로그인하지 않은 경우:

```json
{
  "success": false,
  "code": "UNAUTHENTICATED",
  "message": "Authentication is required.",
  "data": null
}
```

프론트 사용 위치:

- 앱 최초 실행 시
- `/login/callback` 진입 시
- 마이페이지 진입 전
- 로그인 상태가 필요한 화면 진입 전

## 7. 로그아웃

```http
POST /api/auth/logout
```

프론트 호출 예시:

```ts
async function logout() {
  await fetch("http://localhost:3000/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });

  // 프론트 로그인 상태 초기화 후 로그인 페이지 또는 홈으로 이동
}
```

성공 응답:

```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "Logged out.",
  "data": null
}
```

동작:

- 서버 세션을 폐기합니다.
- `goat.sid` 쿠키를 삭제합니다.
- 프론트는 저장해둔 사용자 상태를 비우면 됩니다.

## 8. 프론트 로그인 구현 흐름

### 8.1 로그인 페이지

구글 버튼:

```ts
window.location.href = "http://localhost:3000/api/auth/google/start";
```

카카오 버튼:

```ts
window.location.href = "http://localhost:3000/api/auth/kakao/start";
```

### 8.2 로그인 콜백 페이지

프론트 라우트:

```text
/login/callback
```

콜백 페이지에서 해야 할 일:

```ts
async function handleLoginCallback() {
  const res = await fetch("http://localhost:3000/api/auth/me", {
    credentials: "include",
  });

  if (!res.ok) {
    // 로그인 실패 처리
    window.location.href = "/login";
    return;
  }

  const body = await res.json();
  const user = body.data.user;

  // user를 프론트 전역 상태에 저장
  // 이후 메인 페이지로 이동
  window.location.href = "/";
}
```

## 9. 감성 목록 조회

```http
GET /api/moods
```

추천 요청에 사용할 감성 목록을 조회합니다.

응답:

```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "...",
  "data": {
    "moods": [
      {
        "id": "mood-id",
        "name": "감성 이름",
        "description": "감성 설명",
        "keywords": ["키워드1", "키워드2"]
      }
    ]
  }
}
```

프론트는 `moods[].id`를 추천 요청의 `moodId`로 사용하면 됩니다.

## 10. 장소 추천

```http
POST /api/recommend-from-tags
Content-Type: application/json
```

현재는 로그인 없이 호출 가능합니다. 로그인 상태에서도 호출 가능합니다.

프론트 호출 예시:

```ts
async function getRecommendations(moodId: string) {
  const res = await fetch("http://localhost:3000/api/recommend-from-tags", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      moodId,
      currentMonth: new Date().getMonth() + 1,
    }),
  });

  const body = await res.json();
  return body.data.recommendations;
}
```

요청 body:

```ts
type RecommendFromTagsRequest = {
  moodId?: string;
  referenceCardId?: string;
  travelPurpose?: string;
  transportType?: string;
  visitTime?: string;
  currentMonth?: number;
  debug?: boolean;
  preferences?: {
    companion: string;
    transport: string;
    visitTime?: string | null;
    purpose: string;
  };
  origin?: {
    type: "current" | "region" | "skip";
    latitude?: number;
    longitude?: number;
    regionName?: string;
  };
  excludeIds?: string[];
};
```

필수 조건:

- `moodId` 또는 `referenceCardId` 중 하나는 반드시 필요합니다.

검증 규칙:

- `currentMonth`: 1부터 12까지
- `origin.latitude`: -90부터 90까지
- `origin.longitude`: -180부터 180까지
- `excludeIds`: 최대 61개
- `excludeIds`: 중복 불가
- 정의되지 않은 추가 필드는 허용하지 않음

가장 기본 요청:

```json
{
  "moodId": "mood-id-from-api-moods",
  "currentMonth": 7
}
```

다시 추천 요청:

```json
{
  "moodId": "mood-id-from-api-moods",
  "currentMonth": 7,
  "excludeIds": ["GOAT-001", "GOAT-002", "GOAT-003"]
}
```

성공 응답:

```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "...",
  "data": {
    "moodId": "mood-id",
    "referenceCardId": "reference-card-id",
    "appliedTags": ["tag"],
    "seedPoolSize": 61,
    "candidatePoolSize": 12,
    "poolPolicy": "ALL61",
    "poolReason": "...",
    "fallbackUsed": false,
    "adaptivePoolRetryUsed": false,
    "recommendations": [
      {
        "place": {
          "place_id": "GOAT-001",
          "city": "강릉",
          "region_group": "강원",
          "place_name": "장소명",
          "place_type": "카페",
          "primary_mood": "감성",
          "mood_tags": ["감성태그"],
          "photo_point": "사진 포인트",
          "best_time": "오후",
          "best_season": "봄",
          "accessibility": "접근성",
          "data_status": "confirmed",
          "recommendation_use": "추천 용도",
          "note": "메모",
          "address": "주소",
          "lat": 37.0,
          "lng": 127.0,
          "imageUrl": "https://..."
        },
        "role": "추천 역할",
        "score": 87.5,
        "reason": "추천 이유",
        "matchedTags": ["매칭 태그"],
        "scoreBreakdown": {},
        "safetyNotes": ["주의사항"],
        "weatherFit": "날씨 적합도",
        "parkingInfo": "주차 정보"
      }
    ],
    "cards": [],
    "alternatives": [],
    "warnings": []
  }
}
```

프론트 표시 기준:

- 추천 카드 UI는 `data.recommendations`를 사용하면 됩니다.
- 각 추천의 장소 ID는 `recommendation.place.place_id`입니다.
- 다시 추천할 때 이전 추천 장소 ID들을 `excludeIds`에 넣으면 됩니다.

실패 응답 예시:

```json
{
  "success": false,
  "code": "INVALID_REQUEST",
  "message": "...",
  "data": {}
}
```

```json
{
  "success": false,
  "code": "INVALID_MOOD_ID",
  "message": "...",
  "data": null
}
```

```json
{
  "success": false,
  "code": "RATE_LIMITED",
  "message": "Too many recommendation requests. Please try again later.",
  "data": null
}
```

추천 API는 기본적으로 IP 기준 rate limit이 있습니다.

```text
기본값: 60초에 30회
```

제한에 걸리면 응답 헤더에 `Retry-After`가 포함됩니다.

## 11. 선택 카드 기반 하루 코스 추천

```http
POST /api/recommend-course
Content-Type: application/json
```

추천카드 3개 중 사용자가 1개를 선택한 뒤 호출합니다. 백엔드는 선택 장소 좌표 기준으로 한국관광공사 주변 후보를 조회하고, OpenRouter LLM으로 동행자/테마/목적 조건에 맞는 하루 코스를 구성합니다. LLM 또는 외부 API가 실패하면 규칙 기반 fallback 코스를 반환합니다.

요청 body:

```ts
type RecommendCourseRequest = {
  selectedPlaceId: string;
  primaryTheme: string;
  userMoodTags?: string[];
  userSceneTags?: string[];
  companionType?: "혼자" | "친구" | "연인" | "가족";
  travelPurpose?: string;
  transportType?: "자차" | "대중교통" | "도보중심";
  radiusMeters?: number;
  maxCandidatesForLlm?: number;
  forceRuleBasedFallback?: boolean;
  debug?: boolean;
};
```

예시:

```json
{
  "selectedPlaceId": "GOAT-048",
  "primaryTheme": "바다·해안 무드",
  "userMoodTags": ["청량함", "로드트립감성"],
  "userSceneTags": ["바다", "해안도로"],
  "companionType": "친구",
  "travelPurpose": "사진·포토스팟",
  "transportType": "자차"
}
```

성공 응답:

```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "하루 코스를 생성했습니다.",
  "data": {
    "status": "DONE",
    "resultType": "COURSE",
    "mode": "LLM_OPENROUTER",
    "courseTitle": "아야진해수욕장 중심 하루 코스",
    "summary": "선택 장소와 주변 후보를 묶은 하루 코스입니다.",
    "stops": [
      {
        "order": 1,
        "id": "GOAT-048",
        "title": "아야진해수욕장",
        "type": "START_PLACE",
        "category": "START_PLACE",
        "stayMinutes": 60,
        "reason": "사용자가 선택한 기준 장소입니다."
      }
    ],
    "staticMap": {
      "provider": "KAKAO_JS_SDK_STATIC_MAP",
      "staticMapConfig": {}
    },
    "warnings": []
  }
}
```

`data.mode`가 `RULE_BASED_FALLBACK`이면 LLM 또는 한국관광공사 주변 후보 조회가 실패해 백엔드가 로컬 데이터 기반 백업 코스를 만든 상태입니다. 프론트는 실패 화면 대신 같은 코스 화면을 보여주되, 필요하면 `warnings`를 참고해 “기본 코스” 라벨을 붙이면 됩니다.

서버는 루트 폴더의 한 단계 상위에 있는 `GOAT.env`를 자동으로 읽습니다. 로컬 실행 시 `KTO_SERVICE_KEY`, `OPENROUTER_API_KEY`, `KAKAO_JAVASCRIPT_KEY`가 그 파일에 들어 있으면 됩니다.

## 12. 장소 상세 조회

```http
GET /api/places/{id}
```

예시:

```text
GET /api/places/GOAT-001
```

성공 응답:

```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "...",
  "data": {
    "place": {
      "place_id": "GOAT-001",
      "city": "강릉",
      "region_group": "강원",
      "place_name": "장소명",
      "place_type": "카페",
      "primary_mood": "감성",
      "mood_tags": ["감성태그"],
      "photo_point": "사진 포인트",
      "best_time": "오후",
      "best_season": "봄",
      "accessibility": "접근성",
      "data_status": "confirmed",
      "recommendation_use": "추천 용도",
      "note": "메모",
      "address": "주소",
      "lat": 37.0,
      "lng": 127.0,
      "imageUrl": "https://..."
    }
  }
}
```

장소가 없는 경우:

```json
{
  "success": false,
  "code": "PLACE_NOT_FOUND",
  "message": "...",
  "data": null
}
```

## 13. 이미지 URL 상태 확인

```http
GET /api/image-status?url={encodedImageUrl}
```

VisitKorea 이미지 URL이 실제로 이미지로 응답하는지 확인하는 API입니다.

허용되는 이미지 host:

```text
tong.visitkorea.or.kr
*.visitkorea.or.kr
```

프론트 호출 예시:

```ts
const url = encodeURIComponent("https://tong.visitkorea.or.kr/...");
const res = await fetch(`http://localhost:3000/api/image-status?url=${url}`);
```

성공 예시:

```json
{
  "ok": true,
  "status": 200,
  "url": "https://tong.visitkorea.or.kr/...",
  "finalUrl": "https://tong.visitkorea.or.kr/...",
  "contentType": "image/jpeg"
}
```

실패 예시:

```json
{
  "ok": false,
  "url": "https://example.com/image.jpg",
  "error": "unsupported image host"
}
```

캐시 관련 응답 헤더:

```text
X-Image-Status-Cache: HIT | MISS
```

## 14. 한국관광공사 KTO 프록시

```http
GET /api/kto?path={allowedKtoPath}&...
```

한국관광공사 API를 백엔드에서 대신 호출하는 프록시 API입니다.

목적:

- 브라우저 CORS 문제 회피
- `KTO_SERVICE_KEY` 프론트 노출 방지
- 백엔드 캐싱

허용된 `path`:

```text
PhotoGalleryService1/gallerySearchList1
PhotoGalleryService1/galleryList1
PhotoContestService1/getPhotoContestList1
KorService2/searchKeyword2
KorService2/detailCommon2
KorService2/detailIntro2
LocalGovTourInfoService1/getLocalGovTourInfo1
TatsCnctrRateService/tatsCnctrRatedList
```

예시:

```text
GET /api/kto?path=KorService2/searchKeyword2&MobileOS=ETC&MobileApp=GOAT&_type=json&keyword=강릉&numOfRows=10&pageNo=1
```

응답:

- 성공 시 한국관광공사 원본 JSON을 그대로 반환합니다.
- 공통 응답 형식으로 감싸지 않습니다.

실패 예시:

```json
{ "error": "path query param is required" }
```

```json
{ "error": "KTO path is not allowed" }
```

```json
{ "error": "KTO service key not configured on server" }
```

캐시 관련 응답 헤더:

```text
X-KTO-Cache: HIT | MISS
X-KTO-Cache-TTL-Seconds: number
```

## 15. 서버 상태 확인

```http
GET /api/healthz
```

응답:

```json
{
  "status": "ok"
}
```

사용 목적:

- 서버 실행 여부 확인
- 배포 환경 health check

## 16. 사진 분석 제거 정책

사용자 사진 업로드 및 AI 이미지 분석 API는 제품 흐름에서 제거되었습니다. `/api/image-status`는 KTO 이미지 URL이 실제 이미지인지 검사해 로컬 이미지 fallback을 돕는 별도 기능이므로 유지합니다.

## 17. 프론트 우선 연동 체크리스트

로그인:

```text
GET  /api/auth/google/start
GET  /api/auth/kakao/start
GET  /api/auth/me
POST /api/auth/logout
```

추천:

```text
GET  /api/moods
POST /api/recommend-from-tags
POST /api/recommend-course
GET  /api/places/:id
```

보조:

```text
GET /api/image-status
GET /api/kto
GET /api/healthz
```
