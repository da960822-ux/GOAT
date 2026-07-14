# GOAT API 명세서

## 공통

- Base URL: `/api`
- 인증: MVP 추천/조회 API는 비회원 호출 가능, 북마크/사용자 기능은 Supabase JWT 사용
- Content-Type: `application/json`
- 공통 성공 응답: `{ "success": true, "code": "SUCCESS", "message": "...", "data": ... }`

---

## Express 서버 API

### GET `/api/healthz`
서버 상태 확인

**Response 200**
```json
{ "status": "ok" }
```

---

### GET `/api/moods`
12개 감성 카테고리 조회

**Response 200**
```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "감성 카테고리를 조회했습니다.",
  "data": {
    "moods": [
      {
        "id": "california-coast",
        "name": "캘리포니아 해안도로",
        "description": "...",
        "keywords": ["바다", "해안도로", "캘리포니아"]
      }
    ]
  }
}
```

---

### POST `/api/recommend-from-tags`
감성/레퍼런스 카드 + 조건 기반 여행지 추천

`moodId` 또는 `referenceCardId` 중 하나는 필수입니다.

**Request Body**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `moodId` | string | △ | 12개 감성 ID 중 1개 |
| `referenceCardId` | string | △ | 21개 레퍼런스 카드 ID 중 1개 |
| `travelPurpose` | string | | 사진·포토스팟 / 산책·힐링 / 카페·실내휴식 / 전시·건축관람 / 체험·액티비티 / 먹거리·야간탐방 / 숙소·리조트 |
| `transportType` | string | | 자차 / 대중교통 / 도보중심 |
| `visitTime` | string | | 새벽 / 오전 / 한낮 / 오후 / 저녁 / 야간 |
| `currentMonth` | number | | 1~12. 없으면 서버 현재 월 사용 |
| `preferences` | object | | 기존 앱 조건 입력 호환용 |
| `origin` | object | | 현재위치/지역/건너뛰기 정보 |
| `excludeIds` | string[] | | 다시 추천 시 제외할 place_id 배열. 최대 58개 |
| `debug` | boolean | | 점수 후보 디버그 정보 포함 여부 |

**Request 예시**
```json
{
  "referenceCardId": "REF_SEA_02",
  "travelPurpose": "사진·포토스팟",
  "transportType": "자차",
  "visitTime": "오후",
  "currentMonth": 7,
  "excludeIds": ["GOAT-025"]
}
```

**Response 200**
```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "추천 장소를 조회했습니다.",
  "data": {
    "referenceCardId": "REF_SEA_02",
    "seedPoolSize": 58,
    "candidatePoolSize": 58,
    "poolPolicy": "ALL58",
    "recommendations": [
      {
        "place": {
          "place_id": "GOAT-025",
          "place_name": "안목해변 카페거리",
          "city": "강릉시",
          "place_type": "해변카페/거리",
          "primary_mood": "바다·해안 무드",
          "mood_tags": ["해변카페", "보드워크", "커피거리"],
          "lat": 37.7725952413582,
          "lng": 128.947321445483,
          "address": "강원특별자치도 강릉시 창해로14번길 20-1"
        },
        "role": "장면 최적",
        "score": 86,
        "reason": "선택한 테마와 장소 테마가 일치합니다.",
        "matchedTags": ["바다", "해변"]
      }
    ],
    "cards": [
      {
        "rank": 1,
        "role": "BEST_SCENE",
        "roleLabel": "최적 장면 카드",
        "placeId": "GOAT-025",
        "placeName": "안목해변 카페거리",
        "city": "강릉시",
        "score": {
          "baseScore": 86,
          "routeDistanceBonus": 0,
          "displayScore": 86
        }
      }
    ],
    "alternatives": [],
    "warnings": []
  }
}
```

**Response 400**
```json
{
  "success": false,
  "code": "INVALID_REQUEST",
  "message": "요청값이 올바르지 않습니다.",
  "data": null
}
```

---

### GET `/api/places/:id`
장소 상세 정보

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `id` | string | place_id |

**Response 200**
```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "장소를 조회했습니다.",
  "data": {
    "place": {
      "place_id": "GOAT-025",
      "place_name": "안목해변 카페거리",
      "city": "강릉시",
      "region_group": "동해안권",
      "place_type": "해변카페/거리",
      "primary_mood": "바다·해안 무드",
      "mood_tags": ["해변카페", "보드워크", "커피거리"],
      "photo_point": "카페거리, 해변 산책로, 커피거리 야경",
      "best_time": "오후",
      "best_season": "봄, 여름, 가을",
      "accessibility": "대중교통 상 / 자차 상",
      "address": "강원특별자치도 강릉시 창해로14번길 20-1",
      "lat": 37.7725952413582,
      "lng": 128.947321445483
    }
  }
}
```

**Response 404**
```json
{
  "success": false,
  "code": "PLACE_NOT_FOUND",
  "message": "장소를 찾을 수 없습니다.",
  "data": null
}
```

---

### GET `/api/kto`
한국관광공사 API 프록시

| Query | 필수 | 설명 |
|------|---:|------|
| `path` | O | `KorService2/searchKeyword2` 등 KTO 하위 경로 |
| `keyword` | | 검색어 |
| `contentId` | | 상세 조회용 ID |
| `areaCode` | | 지역 코드 |
| `numOfRows` | | 반환 개수 |
| `pageNo` | | 페이지 번호 |

---

## Supabase REST API

### 북마크 조회
```http
GET /rest/v1/bookmarks?user_id=eq.<uuid>&select=*,places(*)
Authorization: Bearer <jwt>
```

### 북마크 추가
```http
POST /rest/v1/bookmarks
Authorization: Bearer <jwt>

{ "user_id": "<uuid>", "place_id": "GOAT-025" }
```

### 북마크 삭제
```http
DELETE /rest/v1/bookmarks?user_id=eq.<uuid>&place_id=eq.GOAT-025
Authorization: Bearer <jwt>
```

---

## 에러 코드

| 코드 | 설명 |
|------|------|
| 400 | 잘못된 요청 파라미터 |
| 401 | 인증 토큰 없음/만료 |
| 404 | 리소스 없음 |
| 500 | 서버 내부 오류 또는 외부 API 장애 |
