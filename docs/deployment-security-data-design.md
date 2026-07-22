# 배포 전 보안 및 데이터 설계 체크

이 문서는 GOAT API 서버를 배포하기 전에 반드시 확인해야 하는 보안 설정, KTO 프록시 정책, 추천 API rate limit, DB 스키마, 북마크 저장 방식과 KTO 이미지 검증 정책을 정리합니다.

## 요약

| 영역 | 결정 사항 | 상태 |
|---|---|---|
| CORS | 운영 환경에서는 `CORS_ORIGINS`를 반드시 명시하고 `*`는 금지 | 코드 반영 |
| KTO 프록시 | 서버 키로 호출 가능한 KTO endpoint를 allowlist로 제한 | 코드 반영 |
| 추천 API | 인증형 `/recommendations`, 게스트 미리보기와 geocode rate limit | 코드 반영 |
| DB 스키마 | 추천 세션·카드·경고·요청·북마크·피드백·코스 테이블 | 코드 반영 |
| 북마크 | 로그인 사용자별 Supabase 저장 및 중복 방지 | 코드 반영 |
| 사용자 식별 | API body의 `user_id`는 받지 않고 세션에서 추출 | 코드 반영 |
| 이미지 처리 | 사용자 사진 분석은 제거하고 `/api/image-status` KTO URL 검증은 유지 | 코드 반영 |

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

`POST /recommend-from-tags`와 공개 `POST /geocode-origin`에는 IP 기준 rate limit을 적용합니다. 정식 저장형 `POST /recommendations`는 로그인과 Idempotency-Key가 필요합니다.

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

### recommendation_sessions와 하위 테이블

정식 추천 조건과 카드 3개, 점수, 경고, 감사 JSON을 구조적으로 저장합니다. `recommendation_logs`는 레거시 호환을 위해 deprecated 상태로만 유지하고 새 추천은 기록하지 않습니다.

| 테이블 | 용도 |
|---|---|
| `recommendation_sessions` | 사용자, 조건, 정책 버전, 출발지 상태, fallback, 감사 JSON |
| `recommendation_requests` | 사용자별 Idempotency-Key와 요청 해시/상태 |
| `recommendation_session_places` | 외부 place ID 문자열, 카드 순위/역할, v2 점수와 route_info |
| `recommendation_session_warnings` | 경고 코드·메시지·상세를 행 단위 저장 |
| `recommended_courses` | 추천 하나당 하루 코스 하나 |
| `recommendation_feedback` | 사용자·추천·장소별 LIKE/DISLIKE |

관련 코드:

- `lib/db/src/schema/index.ts`

## 5. 북마크 저장 설계 원칙

서버 북마크 API가 사용자별로 장소 ID와 저장 당시 표시 이름·지역을 보존합니다. 모바일에서 버튼을 연결하면 기기와 무관하게 복원할 수 있습니다.

서버 북마크 API를 만들 때는 아래 원칙을 지킵니다.

| 원칙 | 이유 |
|---|---|
| 클라이언트 body에서 `user_id`를 받지 않음 | 위조 가능 |
| 서버가 JWT/session에서 사용자 ID를 직접 추출 | 신뢰 경계 유지 |
| `place_id`만 클라이언트 입력으로 받음 | 저장 대상만 클라이언트가 선택 |
| `user_id + place_id` 중복 저장 방지 | 토글/동기화 단순화 |

현재 API:

```http
GET /api/bookmarks
```

```http
POST /api/bookmarks
Content-Type: application/json

{
  "placeId": "GOAT-001"
}
```

```http
DELETE /api/bookmarks/{placeId}
```

서버 처리 흐름:

1. JWT/session 검증
2. 인증 정보에서 `user_id` 추출
3. 요청 body 또는 path에서 `placeId` 확인
4. `bookmarks` 테이블에 저장, 조회, 삭제

## 6. 추천 로그와 재노출 방지

정식 추천은 `recommendation_session_places`에서 해당 사용자의 최근 카드 20행과 전체 노출 통계를 조회합니다. 재추천은 본인 소유 `rerollOfRecommendationId`의 카드 3개를 자동 제외합니다.

권장 흐름:

1. 사용자가 추천 요청
2. 서버가 JWT/session에서 `user_id` 확인
3. 최근 `recommendation_session_places`에서 같은 사용자에게 이미 노출된 place ID 조회
4. 조회한 ID를 추천 엔진의 `excludeIds`에 전달
5. 확정 세션·카드·경고와 Idempotency 완료를 짧은 트랜잭션으로 저장

초기 운영에서는 최근 N일 또는 최근 N회 기준 중 하나를 선택하면 됩니다.

| 기준 | 장점 | 주의점 |
|---|---|---|
| 최근 N일 | 사용자가 시간이 지나면 다시 볼 수 있음 | 방문 주기가 짧으면 재노출될 수 있음 |
| 최근 N회 | 추천 세션 기준으로 제어 쉬움 | 오래 전 추천도 계속 제외될 수 있음 |

## 7. 이미지 처리 정책

- 사용자 사진 업로드와 AI 이미지 분석 API는 제공하지 않습니다.
- `/api/image-status`는 `visitkorea.or.kr` 이미지 URL의 상태와 MIME type을 검사합니다.
- 검사에 실패하거나 KTO 이미지가 없으면 모바일은 로컬 장소 이미지 또는 placeholder를 사용합니다.
- `/api/image-status`는 사진 분석 기능이 아니므로 유지합니다.

## 배포 전 체크리스트

- [ ] production `CORS_ORIGINS`가 실제 서비스 origin으로 설정되어 있다.
- [ ] production `CORS_ORIGINS`에 `*`가 없다.
- [ ] `KTO_SERVICE_KEY`가 서버 환경변수에만 존재한다.
- [ ] 새로 필요한 KTO endpoint가 있으면 allowlist에 추가하고 리뷰했다.
- [ ] 추천 API rate limit 값이 운영 트래픽에 맞게 조정되어 있다.
- [ ] DB migration 또는 `drizzle-kit push` 적용 계획이 있다.
- [ ] 북마크 API 구현 시 `user_id`를 body에서 받지 않는다.
- [ ] 추천 로그 저장 시 개인정보/민감정보를 `request` JSON에 넣지 않는다.
- [ ] `/api/image-status`의 허용 호스트와 redirect 검증을 유지한다.
