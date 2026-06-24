# GOAT API 명세서

## 공통

- Base URL: `https://<supabase-project>.supabase.co` (Supabase REST) / `/api` (Express 서버)
- 인증: `Authorization: Bearer <supabase-jwt>`
- Content-Type: `application/json`

---

## Express 서버 API

### GET `/api/healthz`
서버 상태 확인

**Response 200**
```json
{ "status": "ok" }
```

---

### GET `/api/recommendations`
감성 + 조건 기반 여행지 추천 (3카드)

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| moodId | string | ✅ | 감성 ID (serene / majestic / romantic / healing / active / nostalgic) |
| companion | string | | 혼자 / 연인 / 친구 / 가족 |
| transport | string | | 자차 / 대중교통 |
| visitTime | string | | 오전 / 오후 / 일몰 / 저녁 / 밤·새벽 |
| purpose | string | | 가볍게 산책 / 사진 위주 / 액티비티 / 조용한 휴식 |
| lat | number | | 현재 위치 위도 |
| lng | number | | 현재 위치 경도 |
| excludeIds | string | | 제외할 place_id (쉼표 구분) |

**Response 200**
```json
{
  "recommendations": [
    {
      "place": {
        "place_id": "gwon-001",
        "place_name": "경포해변",
        "city": "강릉",
        "place_type": "해변",
        "primary_mood": "잔잔하고 조용한",
        "mood_tags": ["파도", "모래", "수평선"],
        "lat": 37.8069,
        "lng": 128.9022,
        "address": "강원도 강릉시 경포로 365"
      },
      "role": "장면 최적",
      "score": 8,
      "reason": "잔잔한 감성과 가장 가까운 '파도', '수평선' 장면을 가진 장소예요.",
      "distanceKm": 23
    }
  ]
}
```

---

### GET `/api/places/:id`
장소 상세 정보

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| id | string | place_id |

**Response 200**
```json
{
  "place_id": "gwon-001",
  "place_name": "경포해변",
  "city": "강릉",
  "region_group": "영동북부",
  "place_type": "해변",
  "primary_mood": "잔잔하고 조용한",
  "mood_tags": ["파도", "모래", "수평선"],
  "photo_point": "일출 시 동쪽 수평선 방향",
  "best_time": "오전, 일몰",
  "best_season": "사계절",
  "accessibility": "자차 상 / 대중 상",
  "parking": "유료 주차장 있음",
  "address": "강원도 강릉시 경포로 365",
  "lat": 37.8069,
  "lng": 128.9022,
  "description": "..."
}
```

**Response 404**
```json
{ "error": "장소를 찾을 수 없습니다." }
```

---

### GET `/api/places/:id/alternatives`
유사 장소 추천

**Query Parameters**

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| limit | number | 3 | 반환 개수 |

**Response 200**
```json
{
  "alternatives": [ /* Place 객체 배열 */ ]
}
```

---

## Supabase REST API (직접 호출)

### 북마크 조회
```
GET /rest/v1/bookmarks?user_id=eq.<uuid>&select=*,places(*)
Authorization: Bearer <jwt>
```

### 북마크 추가
```
POST /rest/v1/bookmarks
Authorization: Bearer <jwt>

{ "user_id": "<uuid>", "place_id": "gwon-001" }
```

### 북마크 삭제
```
DELETE /rest/v1/bookmarks?user_id=eq.<uuid>&place_id=eq.gwon-001
Authorization: Bearer <jwt>
```

---

## 외부 API 연동

### 한국관광공사(KTO) API

| 엔드포인트 | 용도 |
|-----------|------|
| `/areaBasedList` | 지역 기반 관광지 목록 |
| `/detailCommon` | 관광지 상세 정보 |
| `/detailImage` | 관광지 이미지 |
| `/visitAreaBasedList` | 방문자 통계 (혼잡도) |

Base URL: `https://apis.data.go.kr/B551011/KorService1`

---

## 에러 코드

| 코드 | 설명 |
|------|------|
| 400 | 잘못된 요청 파라미터 |
| 401 | 인증 토큰 없음/만료 |
| 404 | 리소스 없음 |
| 500 | 서버 내부 오류 |
