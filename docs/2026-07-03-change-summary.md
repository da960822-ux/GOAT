# 2026-07-03 변경 사항 정리

이 문서는 2026-07-03 기준 GOAT 백엔드/API/추천 엔진/문서 작업에서 변경된 내용을 한 번에 확인하기 위한 요약입니다.

## 한 줄 요약

오늘 작업은 크게 네 가지입니다.

1. 배포 전 보안 설정을 강화했습니다.
2. DB 기본 스키마와 북마크/추천 로그 설계 기반을 만들었습니다.
3. 이미지 분석 API 계약을 OpenAPI에 추가했습니다.
4. handoff 패키지의 추천 엔진 개선 사항을 `lib/travel-domain`에 반영했습니다.

## 1. 보안 및 운영 설정

### CORS 운영 정책 강화

운영 환경에서 `CORS_ORIGINS`가 비어 있거나 `*`를 포함하면 서버가 시작되지 않도록 했습니다.

변경 파일:

- `artifacts/api-server/src/app.ts`
- `artifacts/api-server/README.md`

현재 정책:

| 환경 | 동작 |
|---|---|
| development | localhost 계열 origin 기본 허용 |
| production | `CORS_ORIGINS` 필수 |
| production + `*` | 서버 시작 실패 |

### KTO 프록시 allowlist 추가

`/api/kto`가 서버의 `KTO_SERVICE_KEY`로 임의 KTO endpoint를 호출하지 못하도록 허용 path를 제한했습니다.

변경 파일:

- `artifacts/api-server/src/routes/kto.ts`
- `lib/api-spec/openapi.yaml`

현재 허용 path:

| 범위 | path |
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

### 추천 API rate limit 추가

`POST /recommend-from-tags`에 IP 기준 in-memory rate limit을 추가했습니다.

변경 파일:

- `artifacts/api-server/src/routes/travel.ts`
- `artifacts/api-server/README.md`

기본값:

```env
RECOMMEND_RATE_LIMIT_WINDOW_SECONDS=60
RECOMMEND_RATE_LIMIT_MAX=30
```

주의:

- 현재 구현은 단일 서버 인스턴스 기준입니다.
- 운영에서 여러 서버 인스턴스를 쓰면 Redis 같은 공유 저장소 기반 rate limit으로 교체하는 것이 좋습니다.

## 2. DB 및 북마크 설계

`lib/db`에 Drizzle 기반 기본 스키마를 추가했습니다.

변경 파일:

- `lib/db/src/schema/index.ts`

추가된 테이블:

| 테이블 | 목적 |
|---|---|
| `users` | 인증 제공자 기준 사용자 식별 |
| `bookmarks` | 사용자별 장소 저장 |
| `recommendation_logs` | 추천 요청/결과 로그 저장 |

북마크 설계 원칙:

- 클라이언트 body에서 `user_id`를 받지 않습니다.
- 서버가 JWT/session에서 사용자 ID를 추출해야 합니다.
- 클라이언트는 저장 대상인 `placeId`만 보냅니다.

참고:

- `bookmarks`는 서버 저장 북마크를 위한 기반입니다.
- 현재 모바일 앱의 AsyncStorage 북마크는 로컬 저장이므로 기기 변경/재설치 시 유지되지 않습니다.

## 3. 이미지 분석 API 계약

기능명세에 있던 `POST /api/analyze-image`를 OpenAPI에 추가했습니다.

변경 파일:

- `lib/api-spec/openapi.yaml`
- `lib/api-client-react/src/generated/api.ts`
- `lib/api-client-react/src/generated/api.schemas.ts`
- `lib/api-zod/src/generated/api.ts`
- `lib/api-zod/src/generated/types/*`

요청 형태:

```json
{
  "imageBase64": "<base64-encoded-image>",
  "mimeType": "image/jpeg",
  "debug": false
}
```

허용 mime type:

- `image/jpeg`
- `image/png`
- `image/webp`

상태:

- API 계약과 generated type은 반영되었습니다.
- 실제 이미지 분석 route 구현은 아직 별도 작업입니다.

## 4. 추천 엔진 기준 정리

handoff 패키지의 백엔드 추천 엔진 개선 사항을 실제 도메인 패키지에 반영했습니다.

변경 파일:

- `lib/travel-domain/src/goatRecommendationEngine.ts`
- `lib/travel-domain/src/goatRecommendationTypes.ts`
- `lib/travel-domain/src/index.ts`
- `lib/travel-domain/src/types.ts`
- `lib/travel-domain/src/recommendationService.ts`
- `lib/travel-domain/src/photoRecommendationAdapter.ts`
- `lib/travel-domain/src/recommendationExposureRepository.ts`
- `lib/travel-domain/src/v13Engine.ts`

반영 내용:

| 항목 | 상태 |
|---|---|
| 실제 서비스 기준 엔진을 `goatRecommendationEngine.ts`로 고정 | 완료 |
| `v13Engine.ts` 삭제 | 완료 |
| `index.ts`에서 v13 export 제거 | 완료 |
| `photoRecommendationAdapter.ts` 추가 | 완료 |
| `recommendationExposureRepository.ts` 추가 | 완료 |

## 5. 카드3 fallback 추적 개선

카드3 조건맞춤 후보에서 `travelPurpose`와 `purpose_tags`가 일치하는 후보가 0개일 때 fallback은 유지하되, 추적 가능한 warning과 audit 정보를 남기도록 했습니다.

관련 코드:

- `CARD3_PURPOSE_FALLBACK`
- `decisionAudit`
- `[GOAT_RECOMMENDATION_WARNING]`
- `logs/goat-recommendation-warnings.jsonl`

기록되는 주요 정보:

| 정보 | 설명 |
|---|---|
| fallback 발생 이유 | 왜 fallback했는지 |
| fallback 전 후보 수 | 목적 태그 strict 후보 수 |
| fallback 후 후보 수 | fallback pool 후보 수 |
| 선택된 `travelPurpose` | 목적 조건 |
| 카드별 선택 이유 | 1번/2번/3번 카드가 왜 뽑혔는지 |
| 카드별 점수 요약 | `moodScore`, `conditionScore`, `baseScore`, `routeDistanceBonus` 등 |
| 카드별 매칭 상세 | `mood_tags`, `sceneTags`, `purpose_tags`, `accessibility`, `season_tags` |

주의:

- warning이 발생하면 기본적으로 서버 로그와 JSONL 파일 저장을 시도합니다.
- `warningLogFilePath` 또는 `GOAT_RECOMMENDATION_LOG_FILE`로 저장 경로를 바꿀 수 있습니다.

## 6. 재노출 방지 및 다시 추천 기반

handoff의 재노출 방지 서비스 레이어를 도메인 패키지에 추가했습니다.

추가된 주요 요소:

| 요소 | 역할 |
|---|---|
| `createGoatRecommendation()` | 추천 전 exposure 통계 조회, 추천 후 exposure 저장 |
| `RecommendationExposureRepository` | 노출 저장소 인터페이스 |
| `InMemoryRecommendationExposureRepository` | DB 연결 전 테스트/MVP용 메모리 저장소 |
| `rerollOfRequestId` | 다시 추천 시 직전 추천 카드 3개 제외 |
| `recentExposureByPlaceId` | 최근 노출 보정 |
| `totalExposureByPlaceId` | 전체 누적 노출 보정 |
| `themeAverageExposure` | 테마 안 과노출 보정 |

현재 상태:

- 도메인 로직과 서비스 레이어는 추가되었습니다.
- `/api/recommend-from-tags` route는 아직 기존 `getRecommendations()` wrapper를 사용합니다.
- 즉, 재노출 방지/다시 추천 흐름은 사용할 준비가 되었지만 API route에는 아직 완전히 연결되지 않았습니다.

## 7. 아직 남은 작업

오늘 대화에서 확인된 미연결 항목입니다.

| 항목 | 상태 | 설명 |
|---|---|---|
| `/api/recommend-from-tags`에서 `createGoatRecommendation()` 사용 | 미연결 | 현재 route는 기존 `getRecommendations()` 호출 |
| `rerollOfRequestId` request schema 추가 | 미반영 | API 요청에서 다시 추천 ID를 받을 수 있게 해야 함 |
| `requestId` response schema 추가 | 미반영 | 프론트가 다음 다시 추천 요청에 사용할 ID |
| OpenAPI/generated client 갱신 | 일부 필요 | `rerollOfRequestId`, `requestId` 추가 후 재생성 필요 |
| 운영 DB 저장소 연결 | 미연결 | 현재는 repository interface와 메모리 구현만 있음 |
| `recommendation_exposures` 테이블 | 미구현 | 카드별 노출 row 저장용 테이블 권장 |

권장 다음 단계:

1. `recommendation_exposures` 테이블을 추가합니다.
2. `RecommendationExposureRepository`의 DB 구현체를 만듭니다.
3. `/recommend-from-tags` route를 `createGoatRecommendation()` 기반으로 바꿉니다.
4. OpenAPI에 `rerollOfRequestId`와 `requestId`를 반영합니다.
5. generated API client/zod 타입을 재생성합니다.
6. 프론트는 응답의 `requestId`를 저장했다가 다시 추천 시 `rerollOfRequestId`로 보냅니다.

## 8. 문서 추가

배포 전 보안/DB/API 설계 문서를 추가했습니다.

추가 문서:

- `docs/deployment-security-data-design.md`
- `docs/2026-07-03-change-summary.md`

API 서버 README에도 배포 전 체크 문서 링크를 추가했습니다.

변경 파일:

- `artifacts/api-server/README.md`

## 9. 검증 결과

오늘 작업 중 확인한 검증:

```powershell
.\node_modules\.bin\tsc.CMD --build
```

통과했습니다.

```powershell
.\node_modules\.bin\tsc.CMD -p artifacts\api-server\tsconfig.json --noEmit
```

통과했습니다.

```powershell
node artifacts\api-server\scripts\verify-api.mjs
```

통과했습니다.

참고:

- `node artifacts\api-server\build.mjs`는 sandbox에서 pnpm/esbuild 경로 접근이 막혀 한 번 실패했고, 권한 상승 후 성공했습니다.
- `orval` codegen도 sandbox 경로 접근 이슈가 있어 권한 상승 후 성공했습니다.

## 10. Git 상태 관련 메모

작업 중 `GOAT_backend_frontend_handoff_v1` 기존 폴더는 삭제 상태로 보이고, 새 `GOAT_backend_frontend_handoff/` 폴더가 추가 상태로 보입니다.

이 변경은 팀원이 준 handoff 폴더 이동/추가로 보이며, 오늘 작업에서는 되돌리지 않았습니다.

커밋 전에 이 폴더 이동을 그대로 인정할지, 기존 위치를 복구할지 별도 확인이 필요합니다.
