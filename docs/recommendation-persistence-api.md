# 추천 기록·북마크·피드백 API

로그인 사용자의 공식 추천은 `POST /api/recommendations`로 생성합니다. 기존 `POST /api/recommend-from-tags`는 저장하지 않는 미리보기·호환 API입니다.

## 추천 생성

```http
POST /api/recommendations
Idempotency-Key: <client-generated UUID>
Content-Type: application/json
```

- 세션 쿠키 인증이 필수입니다.
- 동일 사용자·동일 키·동일 요청은 기존 추천을 반환합니다.
- 동일 키에 다른 요청을 보내면 `409 IDEMPOTENCY_KEY_REUSED`입니다.
- 처리 중이면 `409 REQUEST_IN_PROGRESS`와 `Retry-After`를 반환합니다.
- 추천 세션과 카드 3개 저장까지 성공해야 `201`입니다.

조회 및 삭제:

```text
GET    /api/recommendations/recent?limit=1
GET    /api/recommendations/:recommendationId
DELETE /api/recommendations/:recommendationId
```

## 북마크와 피드백

```text
GET    /api/bookmarks
POST   /api/bookmarks
DELETE /api/bookmarks/:placeId
GET    /api/bookmarks/:placeId/status

GET    /api/recommendations/:recommendationId/places/:placeId/feedback
PUT    /api/recommendations/:recommendationId/places/:placeId/feedback
DELETE /api/recommendations/:recommendationId/places/:placeId/feedback
```

`userId`는 요청 body가 아니라 세션에서 가져옵니다. 장소 ID는 GOAT 로컬 데이터셋의 `GOAT-*` 문자열이며 DB 외래 키가 아닙니다.

## DB 적용

운영 DB에는 [`lib/db/sql/recommendation-persistence.sql`](../lib/db/sql/recommendation-persistence.sql)을 검토 후 적용합니다. 외부 API 호출과 추천 계산은 트랜잭션 밖에서 수행하고, idempotency 예약과 최종 결과 저장만 각각 짧은 트랜잭션으로 처리합니다.
