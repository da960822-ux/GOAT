# 배포 전 보안 및 데이터 설계 체크

이 문서는 GOAT API 서버를 배포하기 전에 반드시 확인해야 하는 보안 설정, KTO 프록시 정책, 추천 API rate limit, DB 스키마, 북마크 저장 방식, 이미지 분석 API 계약을 정리합니다.

## 요약

| 영역 | 결정 사항 | 상태 |
|---|---|---|
| CORS | 운영 환경에서는 `CORS_ORIGINS`를 반드시 명시하고 `*`는 금지 | 코드 반영 |
| KTO 프록시 | 서버 키로 호출 가능한 KTO endpoint를 allowlist로 제한 | 코드 반영 |
| 추천 API | `POST /recommend-from-tags`에 IP 기준 rate limit 적용 | 코드 반영 |
| DB 스키마 | `users`, `bookmarks`, `recommendation_logs` 테이블 정의 | 코드 반영 |
| 북마크 | 클라이언트 로컬 저장은 임시, 서버 저장 API 필요 | 설계 확정 필요 |
| 사용자 식별 | API body의 `user_id`는 신뢰하지 않고 JWT/session에서 추출 | 원칙 확정 |
| 이미지 분석 | `POST /api/analyze-image` 계약을 OpenAPI에 추가 | 문서/타입 반영 |

## 1. CORS 정책

운영 환경에서는 허용 origin을 명시적으로 관리합니다.

```env
NODE_ENV=production
CORS_ORIGINS=https://goat.example.com,https://admin.goat.example.com
```

규칙은 다음과 같습니다.

| 환경 | `CORS_ORIGINS` 미설정 | `CORS_ORIGINS=*` |
|---|---|---|
| development | localhost 계열 기본 origin만 허용 | 설정값으로 쓰면 허용 |
| production | 서버 시작 실패 | 서버 시작 실패 |

관련 코드:

- `artifacts/api-server/src/app.ts`

## 2. KTO 프록시 보안

`GET /api/kto`는 서버의 `KTO_SERVICE_KEY`를 사용해 한국관광공사 API를 대신 호출합니다. 따라서 클라이언트가 임의의 KTO endpoint를 호출하지 못하도록 path allowlist를 둡니다.

현재 허용된 path:

| 범위 | 허용 path |
|---|---|
| 사진 | `PhotoGalleryService1/gallerySearchList1` |
| 사진 | `PhotoGalleryService1/galleryList1` |
| 사진 | `PhotoContestService1/getPhotoContestList1` |
| 관광 정보 | `KorService2/searchKeyword2` |
| 관광 정보 | `KorService2/detailCommon2` |
| 관광 정보 | `KorService2/detailIntro2` |
| 관광 정보 | `LocalGovTourInfoService1/getLocalGovTourInfo1` |
| 방문 집중도 | `TatsCnctrRateService/tatsCnctrRatedList` |

허용되지 않은 path는 `403`으로 거절합니다.

관련 코드:

- `artifacts/api-server/src/routes/kto.ts`
- `lib/api-spec/openapi.yaml`

## 3. 추천 API Rate Limit

`POST /recommend-from-tags`는 추천 엔진을 실행하는 endpoint라 반복 호출 비용이 있습니다. 현재는 간단한 in-memory rate limit을 적용합니다.

기본값:

```env
RECOMMEND_RATE_LIMIT_WINDOW_SECONDS=60
RECOMMEND_RATE_LIMIT_MAX=30
```

동작:

| 조건 | 응답 |
|---|---|
| client IP가 60초 안에 30회 이하 요청 | 정상 처리 |
| client IP가 60초 안에 30회를 초과 | `429 RATE_LIMITED` |

주의할 점:

- 현재 방식은 단일 서버 인스턴스 기준입니다.
- 운영에서 서버를 여러 대 띄우면 Redis 같은 공유 저장소 기반 rate limit으로 교체하는 것이 좋습니다.

관련 코드:

- `artifacts/api-server/src/routes/travel.ts`

## 4. DB 스키마

`lib/db`에는 Drizzle 기반으로 다음 테이블을 정의합니다.

### users

사용자 계정의 서버 기준 식별자입니다.

| 컬럼 | 설명 |
|---|---|
| `id` | 내부 사용자 UUID |
| `auth_provider` | 인증 제공자 |
| `auth_subject` | 인증 제공자 안에서의 고유 subject |
| `email` | 이메일, 선택값 |
| `display_name` | 표시 이름, 선택값 |
| `created_at` | 생성 시각 |
| `updated_at` | 수정 시각 |

`auth_provider + auth_subject` 조합은 unique입니다.

### bookmarks

사용자가 저장한 장소입니다.

| 컬럼 | 설명 |
|---|---|
| `user_id` | `users.id` 참조 |
| `place_id` | 저장한 장소 ID |
| `source` | 저장이 발생한 화면/맥락 |
| `created_at` | 저장 시각 |

`user_id + place_id`를 primary key로 사용해 같은 사용자가 같은 장소를 중복 저장하지 않도록 합니다.

### recommendation_logs

추천 요청과 결과를 기록합니다. 재노출 방지, 추천 품질 분석, 디버깅에 사용할 수 있습니다.

| 컬럼 | 설명 |
|---|---|
| `id` | 로그 UUID |
| `user_id` | 사용자 UUID, 비로그인 요청이면 null 가능 |
| `mood_id` | 추천 요청의 mood ID |
| `reference_card_id` | 추천 요청의 reference card ID |
| `request` | 원본 요청 JSON |
| `recommended_place_ids` | 추천 결과 place ID 목록 |
| `excluded_place_ids` | 요청에서 제외한 place ID 목록 |
| `created_at` | 기록 시각 |

관련 코드:

- `lib/db/src/schema/index.ts`

## 5. 북마크 저장 설계 원칙

현재 모바일 앱의 북마크는 `AsyncStorage` 기반 로컬 저장입니다. 이 방식은 MVP에는 빠르지만 다음 한계가 있습니다.

- 기기를 바꾸면 북마크가 사라집니다.
- 앱 재설치 시 복구할 수 없습니다.
- 여러 기기 간 동기화가 되지 않습니다.

서버 북마크 API를 만들 때는 아래 원칙을 지킵니다.

| 원칙 | 이유 |
|---|---|
| 클라이언트 body에서 `user_id`를 받지 않음 | 위조 가능 |
| 서버가 JWT/session에서 사용자 ID를 직접 추출 | 신뢰 경계 유지 |
| `place_id`만 클라이언트 입력으로 받음 | 저장 대상만 클라이언트가 선택 |
| `user_id + place_id` 중복 저장 방지 | 토글/동기화 단순화 |

권장 API 초안:

```http
GET /api/bookmarks
Authorization: Bearer <token>
```

```http
POST /api/bookmarks
Authorization: Bearer <token>
Content-Type: application/json

{
  "placeId": "GOAT-001"
}
```

```http
DELETE /api/bookmarks/{placeId}
Authorization: Bearer <token>
```

서버 처리 흐름:

1. JWT/session 검증
2. 인증 정보에서 `user_id` 추출
3. 요청 body 또는 path에서 `placeId` 확인
4. `bookmarks` 테이블에 저장, 조회, 삭제

## 6. 추천 로그와 재노출 방지

추천 엔진에는 이미 `excludeIds` 기반 재노출 방지 흐름이 있습니다. `recommendation_logs`가 쌓이면 서버가 최근 추천 이력을 조회해 자동으로 `excludeIds`를 구성할 수 있습니다.

권장 흐름:

1. 사용자가 추천 요청
2. 서버가 JWT/session에서 `user_id` 확인
3. 최근 `recommendation_logs`에서 같은 사용자에게 이미 노출된 place ID 조회
4. 조회한 ID를 추천 엔진의 `excludeIds`에 전달
5. 추천 결과를 `recommendation_logs`에 저장

초기 운영에서는 최근 N일 또는 최근 N회 기준 중 하나를 선택하면 됩니다.

| 기준 | 장점 | 주의점 |
|---|---|---|
| 최근 N일 | 사용자가 시간이 지나면 다시 볼 수 있음 | 방문 주기가 짧으면 재노출될 수 있음 |
| 최근 N회 | 추천 세션 기준으로 제어 쉬움 | 오래 전 추천도 계속 제외될 수 있음 |

## 7. 이미지 분석 API 계약

사진 기능을 붙일 때 사용할 API 계약은 OpenAPI에 정의되어 있습니다.

```http
POST /api/analyze-image
Content-Type: application/json
```

Request:

```json
{
  "imageBase64": "<base64-encoded-image>",
  "mimeType": "image/jpeg",
  "debug": false
}
```

`mimeType` 허용값:

- `image/jpeg`
- `image/png`
- `image/webp`

Response:

```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "이미지 분위기를 분석했습니다.",
  "data": {
    "primaryMood": "유럽 골목 감성",
    "moodTags": ["골목", "이국적", "산책"],
    "matchedSceneTags": ["stone_alley", "warm_light"],
    "confidence": 0.82,
    "recommendedMoodId": "mood-europe-street",
    "isEstimated": true,
    "warnings": []
  }
}
```

설계 메모:

- 이미지 저장 또는 분석 이력 저장이 필요하면 사용자 식별은 JWT/session에서 추출합니다.
- 요청 body에 `user_id`를 넣지 않습니다.
- 현재 문서는 API 계약을 확정한 상태이며, 실제 이미지 분석 route 구현은 모델/스토리지 결정 후 붙이면 됩니다.

관련 파일:

- `lib/api-spec/openapi.yaml`
- `lib/api-client-react/src/generated/api.ts`
- `lib/api-zod/src/generated/api.ts`

## 배포 전 체크리스트

- [ ] production `CORS_ORIGINS`가 실제 서비스 origin으로 설정되어 있다.
- [ ] production `CORS_ORIGINS`에 `*`가 없다.
- [ ] `KTO_SERVICE_KEY`가 서버 환경변수에만 존재한다.
- [ ] 새로 필요한 KTO endpoint가 있으면 allowlist에 추가하고 리뷰했다.
- [ ] 추천 API rate limit 값이 운영 트래픽에 맞게 조정되어 있다.
- [ ] DB migration 또는 `drizzle-kit push` 적용 계획이 있다.
- [ ] 북마크 API 구현 시 `user_id`를 body에서 받지 않는다.
- [ ] 추천 로그 저장 시 개인정보/민감정보를 `request` JSON에 넣지 않는다.
- [ ] 이미지 분석 구현 시 이미지 크기 제한과 mime type 검증을 적용한다.
