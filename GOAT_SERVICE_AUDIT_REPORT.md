# 1. 최종 판정

**최종 판정: 수정 후 시연 가능**

- 감사일: 2026-07-21 (Asia/Seoul)
- 기준 원본: `GOAT-61-accessibility-final.zip`과 별도 제공된 `GOAT.env`
- 원본 무결성 확인: ZIP 파일 522개와 최초 추출본 522개를 대조해 누락 0개, 크기 불일치 0개를 확인했다.
- 감사 범위: 설치, 타입 검사, 프론트엔드·백엔드 빌드, 추천 엔진, 61개 데이터, 실제 외부 API, HTTP 및 브라우저 E2E, 실패 복구, 팀 전달·보안 조건

로컬 데모에서는 태그 선택 → 여행 조건 → 서로 다른 추천 카드 3장 → 상세 → 주변 코스 API → 카카오 지도 계약과 다시 추천까지 동작한다. 61개 장소도 유효한 조건에서 전부 추천 가능하다. 다만 운영 배포 전에는 추천 노출 이력을 프로세스 메모리에서 영속·공유 저장소로 옮기고, 실제 배포 도메인·CORS·카카오 허용 도메인·HTTPS 프록시를 확정해야 한다. 따라서 “바로 운영 배포 가능”이 아니라 “수정 후 시연 가능”으로 판정한다.

| 구분 | 판정 | 근거 |
|---|---|---|
| 팀원 로컬 실행 | 가능 | 고정된 pnpm 버전, 원클릭 웹+API 실행, 소스 빌드 검증 |
| 실제 사용자 시연 | 가능 | 실제 브라우저 흐름과 실제 OpenRouter·KTO·Kakao 호출 성공 |
| 운영 배포 | 조건부 | 노출 이력 영속화와 배포 도메인·보안 설정이 남음 |
| Mock 의존 | 핵심 흐름 없음 | 정상 코스 흐름은 실제 API, 실패 테스트만 의도적으로 mock 주입 |

# 2. 실행 환경

| 항목 | 확인값 |
|---|---|
| Node.js | 실제 검증 `v24.16.0`; 지원 범위 `>=20.19.4 <25`; `.nvmrc` 제공 |
| 패키지 매니저 | Corepack + `pnpm@11.8.0` |
| Workspace | pnpm workspaces 10개 |
| 프론트엔드 | Expo 54, React Native 0.81.5, Expo Router, React Native Web |
| 백엔드 | Node.js, Express 5, Zod/OpenAPI, esbuild, Pino |
| 추천 도메인 | `lib/travel-domain` |
| 실제 장소 데이터 | `lib/travel-domain/src/data/goat_simplified_scoring_tags_v10_accessibility_merged.json` |
| 프론트 포트 | `8081` |
| 백엔드 포트 | `3000` |
| 로컬 API Base URL | `http://127.0.0.1:3000` |

주요 실행 명령은 다음과 같다.

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm run typecheck
corepack pnpm run build
corepack pnpm test
corepack pnpm run dev:web
```

`dev:web`은 루트 `GOAT.env`를 읽고 API를 빌드·기동한 다음 Expo Web을 시작한다. 백엔드와 UI를 분리해 실행할 때는 아래 명령을 사용한다.

```powershell
corepack pnpm --filter @workspace/api-server run dev
corepack pnpm --filter @workspace/goat-mobile run dev:web:ui
```

필수·주요 환경변수명만 기록한다. 값은 보고서와 로그에 남기지 않았다.

- 서버·배포: `PORT`, `NODE_ENV`, `CORS_ORIGINS`, `TRUST_PROXY`, `DATABASE_URL`
- Kakao: `KAKAO_REST_API_KEY`, `KAKAO_MOBILITY_REST_API_KEY`, `KAKAO_JAVASCRIPT_KEY`
- 관광공사: `KTO_SERVICE_KEY`, `VISITKOREA_SERVICE_KEY`
- OpenRouter: `OPENROUTER_API_KEY`, `OPENROUTER_DEFAULT_MODEL`, `OPENROUTER_ALLOWED_MODELS`, `OPENROUTER_BASE_URL`, `OPENROUTER_TIMEOUT_MS`, `OPENROUTER_MAX_ATTEMPTS`
- 추천 운영: `RECOMMEND_EXPOSURE_MAX_RECORDS`, `RECOMMEND_EXPOSURE_TTL_HOURS`, 각 API rate limit 변수
- 프론트 공개 설정: `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_KTO_MOBILE_OS`, `EXPO_PUBLIC_KTO_MOBILE_APP`

비밀 파일 `GOAT.env`는 Git과 팀 전달 ZIP에서 제외하고 별도 보안 채널로 전달해야 한다. 실제 비밀값 전체 일치 스캔에서는 `GOAT.env` 밖의 일치가 0건이었다.

# 3. 실행 결과

실제로 실행한 항목만 판정했다.

| 항목 | 명령/검증 | 결과 | 요약 |
|---|---|---|---|
| install | `corepack pnpm install --frozen-lockfile` | PASS | lockfile 고정 설치 성공 |
| typecheck | `corepack pnpm run typecheck` | PASS | 공유 라이브러리와 앱 workspace 전체 통과 |
| frontend build | `corepack pnpm run build`, 모바일 `build:web` | PASS | iOS·Android 번들 71 assets, Web 1,502 modules/77 assets 생성 |
| backend build | `corepack pnpm --filter @workspace/api-server run build` | PASS | 새 dist 빌드 및 실제 프로세스 기동 검증 |
| unit test | `corepack pnpm test` | PASS | 61개 데이터와 추천 불변조건 통과 |
| integration test | `corepack pnpm --filter @workspace/api-server run test:external` | PASS | 외부 API 정상·실패 행렬 10/10 |
| HTTP E2E | `corepack pnpm run test:e2e` | PASS | 임시 API 빌드·기동 후 추천·상세·재추천·fallback 코스 계약 통과 |
| 브라우저 E2E | 인앱 브라우저, `dev:web` 실제 서버 | PASS | 랜딩부터 추천·상세·재추천까지 통과, 콘솔 오류 0 |
| recommendation test | `corepack pnpm run test:recommendation` | PASS | 3장, 유일 ID, finite score, 결정적 결과 |
| 61 place coverage | `corepack pnpm run test:place-coverage` | PASS | 실제 UI 65,856조합, 61/61 도달 |
| 확장 coverage | `corepack pnpm run test:place-coverage:all-references` | PASS | 레퍼런스 21장 기준 197,568회, 61/61 도달 |
| condition sensitivity | `corepack pnpm run test:condition-sensitivity` | PASS | OFAT 10개 축 정책 일치 |
| API/서버 smoke | `corepack pnpm --filter @workspace/api-server run verify` | PASS | 61개/7개 신규/세션 재추천/잘못된 요청 검증 |
| LLM 실제 호출 | `corepack pnpm --filter @workspace/api-server run verify:external:live` | PASS | OpenRouter 실제 200, JSON schema 통과 |
| 관광공사 실제 호출 | 같은 live 검증 | PASS | 5/5 실제 200, 후보 12개 연결 |
| 지도·길찾기 | 같은 live 검증 | PARTIAL | Kakao 실제 route 2개, 1개 Haversine 안전 fallback; 지도 계약 검증 |
| 배포 빌드 guard | `build:deployment`에 URL 미지정 | PASS | 로컬 URL이 운영 산출물에 들어가지 않도록 의도대로 조기 실패 |

백엔드 빌드는 Pino worker가 빌드 임시 디렉터리 절대경로를 기억하던 문제를 수정했다. 최종 dist 안에는 임시 `.dist-build-*` 참조가 없고 새 프로세스가 정상 기동했다. 그래도 생성된 dist는 현재 머신 절대경로를 포함할 수 있으므로 팀 전달본에서는 제외하고 대상 머신에서 소스 빌드한다. 로컬 `static-build`도 `127.0.0.1` 설정을 포함하므로 전달본에서 제외하고 배포 URL로 재생성한다.

# 4. 서비스 흐름 구현 상태

| 기능 | 상태 | 근거/제약 |
|---|---|---|
| 테마·레퍼런스 선택 | 실제 동작 | 7개 UI 진입 레퍼런스와 공유 태그 사용 |
| 여행 조건 입력 | 실제 동작 | 목적·동행·이동수단·시간대·계절 전달 |
| 출발지/위치 | 실제 동작 | 주소 좌표화, 좌표 전달, 미사용·실패 fallback 지원 |
| 1차 추천 카드 3장 | 실제 동작 | 역할이 다른 카드 1·2·3과 유일 ID 보장 |
| 점수 산정 | 실제 동작 | deterministic; random 점수 없음 |
| 61개 전체 도달 | 실제 동작 | 실제 UI 조합과 확장 조합 모두 61/61 |
| 다시 추천 | 부분 동작 | 단일 프로세스 데모 정상; 이력 저장소가 메모리 기반 |
| 장소 상세 | 실제 동작 | 브라우저 상세와 API 계약 통과 |
| 관광공사 주변 후보 | 실제 동작 | 실제 KTO 후보가 LLM 입력으로 연결 |
| LLM 코스 | 실제 동작 | 실제 OpenRouter 호출, 후보 ID 제한, schema 검증 |
| 동선 정렬 | 실제 동작 | Kakao route 우선, 실패 구간은 좌표 기반 fallback |
| Kakao 지도 | 부분 동작 | Web JS SDK 지도 계약·마커·앱 링크 확인; 네이티브는 지도앱 fallback 중심 |
| 빈 결과·외부 장애 | 실제 동작 | 규칙 기반 코스와 사용자 안내, 10개 실패 시나리오 통과 |
| 모바일 대응 | 부분 동작 | iOS·Android 정적 번들 성공; 실제 기기 권한·네트워크 회귀는 남음 |
| 환경변수 | 실제 동작 | 루트 env 로드와 예제 파일 정리, 값은 클라이언트에 미노출 |
| 운영 배포 | 부분 동작 | 프로덕션 URL·CORS·도메인·프록시·비밀 교체 필요 |

정상 서비스 경로에는 추천 결과를 대신하는 mock이 없다. 실패 회귀 테스트는 외부 장애를 재현하기 위해 mock 응답을 의도적으로 주입하며, 운영 fallback은 규칙 기반 코스·Haversine·지도앱 링크다.

# 5. 추천 점수 검증

## 실제 점수식

```text
moodScore     = primaryThemeScore + moodTagScore + sceneTagScore
conditionScore = purposeScore + accessibilityScore + seasonScore
baseScore      = moodScore + conditionScore
selectionScore = baseScore + 카드 역할별 거리/중복/노출/커버리지 보정
displayScore   = selectionScore를 0~100으로 clamp한 UI 값
```

| 항목 | 실제 배점/용도 |
|---|---|
| `primaryThemeScore` | 일치 `+18` |
| `moodTagScore` | 일치 1/2/3개 이상 `+6/+12/+17` |
| `sceneTagScore` | 일치 1/2개 이상 `+5/+10` |
| `place_type` | base 점수 `0`; 동점 비교 힌트로만 사용(최대 3), 합산 점수 아님 |
| `purposeScore` | 목적 일치 `+20` |
| `accessibilityScore` | 선택 이동수단의 상/중/하 `+12/+7/+1`, 비정상값 `0` |
| `seasonScore` | 현재 계절 `+13`, 사계절 `+10` |
| `originDistanceBonus` | 카드 2·3에 최대 `+10` |
| `routeDistanceBonus` | 카드 1과 카드 2·3의 연계성, 최대 `+10`; 실제 이동시간 우선 |
| `duplicatePenalty` | 카드 2 장면 중복에 최대 `-6` |
| `exposurePenalty` | 카드 2·3 최근 노출에 최대 `-5` |
| `coverageBoost` | 카드 2·3에 `+3` |
| `lowExposureBoost` | 카드 2·3에 최대 `+3`; 이력이 비어 있으면 `0` |
| `best_time`/방문 시간 | 1차 점수 `0` |
| `companionType` | 1차 점수 `0`; 2차 LLM 코스 조건으로 사용 |

baseScore 정의 범위는 `0~90`, 감사에서 관측한 selectionScore 범위는 `-11~116`, displayScore는 `0~100`이었다. NaN, Infinity, undefined, 정의 범위 위반은 모두 0건이었다. 정렬은 고정된 비교 규칙으로 결정되며 무작위 점수나 무작위 tie-break를 사용하지 않는다.

현재 구현은 **정책 A의 혼합형**이다. 즉 1차 추천에 테마·무드·장면과 함께 목적·이동수단 접근성·계절·거리까지 반영한다. 단, 동행자와 `best_time`/방문 시간은 1차 점수에서 제외하고 동행자는 2차 LLM 큐레이션에 사용한다. 상충하던 과거 문서보다 이 코드·테스트 정의를 최종 기준으로 삼았다.

수정·검증 결과는 다음과 같다.

- 빈 노출 이력에 lowExposureBoost가 잘못 들어가던 계산을 `0`으로 수정했다.
- 도보중심은 명시적 `accessibility.walk`를 우선하고, 값이 없을 때만 보수적으로 추정한다.
- 고원·목장·산악·대형 숙소가 근거 없이 도보 접근성 “상”이 되지 않도록 추정 규칙을 보수화했다.
- 출발지와 카드 간 거리, 카드 1과 후속 카드의 연계 거리를 별도 점수로 유지했다.
- 실제 route duration을 우선하고 실패 시 거리 기반 보정으로 안전하게 내려간다.
- legacy breakdown과 실제 합산값을 일치시켰다.

# 6. 카드 1·2·3 검증

| 카드 | 역할 | 후보/선정 규칙 | 적용 보정 |
|---|---|---|---|
| 카드 1 | `BEST_SCENE` 최적 장면 | 선택 primaryTheme 일치 풀에서 무드·장면 적합도가 높은 장소 | 거리·노출·coverage 보정 없음 |
| 카드 2 | `SAME_MOOD_ALTERNATIVE` 같은 무드 대안 | 카드 1과 다른 장소, 같은 테마 우선 | 출발지·카드1 연계, 장면 중복, 최근 노출, coverage/저노출 |
| 카드 3 | `CONDITION_FIT_ALTERNATIVE` 조건 맞춤 | 목적 일치 풀 우선, 다른 테마 허용 | 목적·이동수단·계절·거리·노출; 목적 풀이 없을 때만 fallback warning |

65,856개 실제 UI 조합에서 카드 3장 반환 실패 0, ID 중복 0, 목적 일치 후보가 있는데 잘못 fallback한 경우 0이었다. `CARD3_PURPOSE_FALLBACK` 1,408건은 실제 목적 일치 후보가 없는 조건에서만 발생했다. 카드 1 테마 불일치 4,640건은 다시 추천에서 직전 카드 제외로 같은 테마 후보가 소진된 경우였고, 일치 후보가 남아 있는데 다른 테마를 고른 경우는 0건이었다.

브라우저 실제 입력과 결과는 다음과 같다.

- 입력: 알프스·고원·목장 / 친구 / 자차 / 오후 / 가을 / 사진·포토스팟 / 출발지 없음
- 최초 3장: 삼양라운드힐, 델피노, 금진해변·헌화로
- 상세: 델피노 상세에서 주의사항, 유사 대안, Kakao 지도 CTA 확인
- 다시 추천: 켄싱턴 설악밸리, 해피초원목장, 발왕산 천년주목숲길·애니포레
- 최초와 다시 추천의 겹침: 0개
- 브라우저 콘솔 오류: 0개. React Native Web의 `shadow*`, `pointerEvents` deprecation warning만 존재

브라우저에서는 상세의 지도 CTA까지 확인했다. 하루 코스 지도 렌더링 자체를 브라우저로 중복 검증했다고 주장하지 않으며, 코스·지도는 별도 실제 API smoke와 계약 테스트로 확인했다.

# 7. 61개 장소 데이터 검증

| 검사 | 결과 |
|---|---:|
| 실제 runtime 장소 수 | 61 |
| `GOAT-001`~`GOAT-061` ID 누락/중복 | 0 / 0 |
| 장소명 중복 | 0 |
| 후보 로더 통과 | 61/61 |
| 유한 좌표 | 61/61 |
| 백엔드 API·카드·상세 계약 | 61/61 |
| 신규 7개 후보 포함 | 7/7 |
| scoring JSON의 직접 `imageUrl` | **0/61** |
| 명시적 `accessibility.walk` | **0/61** |

추천 엔진은 최신 61개 JSON을 직접 import한다. 과거 54개·58개 파일은 runtime import가 아니며, 백엔드 전달용 데이터 사본도 최신 JSON과 동기화했다. 신규 7개의 비어 있던 좌표는 Kakao 검색 결과로 채웠고 `coordinateSource=KAKAO_MAP_SEARCH`로 출처를 남겼다.

직접 이미지 URL은 61개 모두 비어 있다. 추천 제외 조건은 아니므로 카드 도달에는 영향이 없고, UI는 KTO 동적 이미지 → 로컬 자산 → placeholder 순으로 표시한다. 그러나 65,856회 감사에서 발생한 카드 appearance 197,568건 모두가 “원본 데이터 직접 이미지 없음”으로 집계되므로, 안정적인 운영 콘텐츠를 위해 대표 이미지 권리·URL을 데이터에 넣어야 한다.

명시적 도보 접근성도 61개 모두 없다. 현재 보수적 추정으로 안전하게 동작하지만 운영 데이터에는 `accessibility.walk`를 직접 수집하는 것이 필요하다.

신규 장소 검증은 다음과 같다.

| ID | 장소 | 추천 | 좌표 | 상세/규칙 코스 smoke | 지도 마커 |
|---|---|---|---|---|---:|
| GOAT-055 | 쏠비치 양양 | 도달 | 유한 | DONE, 3 stops | 3 |
| GOAT-056 | 허브나라농원 | 도달 | 유한 | DONE, 2 stops | 2 |
| GOAT-057 | 로미지안가든 | 도달 | 유한 | DONE, 2 stops | 2 |
| GOAT-058 | 고석정 꽃밭 | 조건부 도달 | 유한 | DONE, 2 stops | 2 |
| GOAT-059 | 파크로쉬 리조트 앤 웰니스 | 도달 | 유한 | DONE, 2 stops | 2 |
| GOAT-060 | 켄싱턴호텔 평창 프렌치가든 | 도달 | 유한 | DONE, 2 stops | 2 |
| GOAT-061 | 델피노·소노펠리체 델피노 | 도달 | 유한 | DONE, 3 stops | 3 |

61개별 데이터·카드·상세·지도·최초/최고 조건은 [place-coverage-report.csv](reports/place-coverage-report.csv), 원시 결과는 [recommendation-test-results.json](reports/recommendation-test-results.json)에 있다.

# 8. 61개 추천 도달 가능성 결과

## 실제 UI 진입점 전수 조합

테마 7 × 목적 7 × 이동수단 3 × 동행 4 × 계절 4 × 출발지 7 × 노출 2 × 다시 추천 2 = **65,856회**를 실행했다. 각 실행은 외부 API 없이 순수 추천 엔진만 호출했다.

| 분류 | 수 |
|---|---:|
| 전체 장소 | 61 |
| REACHABLE | 60 |
| CONDITIONALLY_REACHABLE | 1 |
| UNREACHABLE | 0 |
| FILTERED_BY_POLICY | 0 |
| DATA_ERROR | 0 |
| LOGIC_ERROR | 0 |
| 카드 1 고유 장소 | 38 |
| 카드 2 고유 장소 | 58 |
| 카드 3 고유 장소 | 60 |
| 최초 추천만의 고유 장소 | 60 |
| 다시 추천 포함 고유 장소 | 61 |
| 한 번도 추천되지 않는 장소 | **없음** |
| 신규 7개 도달 | 7/7 |

GOAT-058 고석정 꽃밭은 공식 확인 운영 기간 `2026-05-15~2026-06-14`에만 후보가 되는 명시적 계절 정책 때문에 `CONDITIONALLY_REACHABLE`이다. 감사 기준일 2026-07-21에는 제외되지만 `currentDate=2026-05-20`에서 실제 등장했다. 데이터·로직 오류가 아니다.

초기 추천만으로 빠지는 GOAT-008은 다시 추천에서, 최근 노출 상태에서 빠지는 GOAT-022는 최근 노출+다시 추천에서 등장했다. 모든 21개 레퍼런스 카드로 확장한 197,568회 테스트에서는 카드 1/2/3 고유 장소가 각각 60/61/61이었다.

수정 전 추천 도달도 61/61, 수정 후도 61/61이다. 이번 수정은 도달률을 억지로 높이기 위한 random 점수 추가가 아니라, 좌표·도보 추정·노출 보정·재추천 API·외부 연결의 정확성을 고친 것이다. 신규 7개의 지도 연결 가능성은 좌표 보완으로 7/7이 되었다.

분포는 다음과 같다.

- 총 카드 appearance: 197,568
- 최소: GOAT-022, 208회
- 최대: GOAT-036, 8,468회
- 평균/중앙값: 3,238.82 / 2,912회
- 모집단 표준편차: 2,044.50, 변동계수 0.6312, Gini 0.3524
- Top 5 점유율: 19.4809%
- 최대/최소 비: 40.71배
- 신규 7개 합계: 20,172회

전 장소의 재현 가능한 최초 조건·최고 조건·최고 점수·best rank와 역할별 횟수는 [추천 조합 요약](reports/recommendation-test-summary.md), [추천 분포 CSV](reports/place-recommendation-distribution.csv), [도달성 CSV](reports/place-coverage-report.csv), [미추천 분석](reports/place-unreachable-report.md)을 참조한다.

# 9. 조건 변경 민감도

동일 기준 입력에서 한 번에 하나만 바꾸는 OFAT 테스트는 PASS했다.

| 변경 축 | 관측 결과 | 판정 |
|---|---|---|
| primaryTheme | `primaryThemeScore`와 카드 후보/순위 변경 | PASS |
| mood_tags | `moodTagScore`와 카드 변경 | PASS |
| sceneTags | `sceneTagScore`와 카드 변경 | PASS |
| travelPurpose | `purposeScore`와 카드 3 후보 변경 | PASS |
| transportType | `accessibilityScore`와 순위 변경 | PASS |
| companionType | 1차 점수·카드 불변 | PASS, 정책 의도 |
| season | `seasonScore`와 순위 변경 | PASS |
| departure | 카드 2·3 `originDistanceBonus`와 순위 변경 | PASS |
| exposure history | 카드 2·3 노출 보정과 결과 변경 | PASS |
| retry | 직전 카드 3개 제외, 중복 0 | PASS |

출발지는 카드 1의 장면 적합 점수에는 넣지 않고 카드 2·3의 출발지 근접도에 반영한다. 카드 1에서 카드 2·3으로 이어지는 거리는 별도 `routeDistanceBonus`다. 동행자가 1차 결과를 바꾸지 않는 것은 누락이 아니라 2차 LLM에서 사용하는 현재 정책이다. 세부 전후 값은 [condition-sensitivity-report.md](reports/condition-sensitivity-report.md)에 있다.

# 10. LLM 연결

| 항목 | 실제 결과 |
|---|---|
| provider | OpenRouter |
| 요청/실제 model | `openai/gpt-4o-mini` / 동일 |
| HTTP status | 200 |
| 전체 코스 latency | 15,355ms |
| LLM 자체 latency | 5,698ms |
| attempts | 1 |
| 출력 | JSON mode + schema validation 성공 |
| 후보 연결 | KTO 후보 12개 ID를 전달하고 ID로 canonical join |
| stop | 4개, 중복 0 |
| 후보 외 생성 | 0 |
| warning | 0 |

LLM은 1차 추천 점수를 계산하지 않는다. 사용자가 고른 대표 장소 주변의 KTO 후보 중 조건에 맞는 곳을 고르는 2차 큐레이터다. 응답은 허용 후보 ID만 받아들이고, 알 수 없는 ID·중복 ID·대표 장소 재선택을 거부한다. JSON/schema 오류, timeout, 429, 5xx에는 제한 재시도 후 규칙 기반 코스로 내려간다. 대표 장소가 LLM 결과의 주변 후보에 중복되던 정규화 문제도 수정했다.

실제 호출의 비밀값, Authorization 헤더, 전체 프롬프트는 보고서와 로그에 출력하지 않았다. 근거는 [external-api-live-results.json](reports/external-api-live-results.json)과 `artifacts/api-server/reports/external-live-verification.json`에 있다.

# 11. 외부 API

## 한국관광공사 OpenAPI

| 항목 | 실제 결과 |
|---|---|
| 요청 | content type 5종 병렬 요청 |
| HTTP | 200 × 5, 성공 5/5 |
| latency | 9,650ms |
| 원본/필터/좌표 후보 | 12 / 12 / 12 |
| LLM 전달 후보 | 12 |
| 실제 예시 | 사랑대게, `[해파랑길] 44코스`, 옛뜰 |

서비스 키 이중 인코딩을 방지했고, 단일 객체/배열 응답을 정규화하며, 중복·무좌표·거리 밖 후보를 거른다. 부분 실패는 성공한 content type으로 계속 진행하고 전부 실패하거나 0건이면 규칙 기반 fallback으로 내려간다. 실제 KTO 후보가 LLM prompt와 ID 기반 join까지 이어지는 것을 검증했다.

## Kakao 지오코딩·길찾기·지도

| 항목 | 실제 결과 |
|---|---|
| 주소/키워드 좌표화 | HTTP 200, 162ms, 유한 좌표, source `KEYWORD` |
| 길찾기 | API HTTP 200, 전체 1,140ms |
| 추천 경로 3개 | Kakao 실제 route 2, Haversine fallback 1 |
| warning | `KAKAO_ROUTE_PARTIAL_FALLBACK` |
| 지도 계약 | `KAKAO_JS_SDK_STATIC_MAP`, 마커 4개, fallback URL 존재 |

Kakao route가 실패한 구간도 텍스트 코스와 좌표 기반 최근접 정렬을 유지한다. Kakao REST 키는 서버에서만 사용하고, 클라이언트에는 공개 사용을 전제로 한 JavaScript SDK 키만 전달한다. 운영 전 Kakao 콘솔에 실제 웹 도메인을 등록해야 한다. Web은 JS SDK 지도를, 네이티브는 지도앱 링크 fallback을 제공한다.

외부 실패 회귀 10/10에는 KTO 부분·전체 실패, 키 인코딩, LLM 429 재시도, JSON/schema 오류, 후보 외 ID, 중복, 지도 URL, 규칙 기반 fallback, 노출 scope가 포함된다.

# 12. 발견 문제

## 남아 있는 P0/P1/P2/P3

| 등급 | 상태 | 문제/영향 | 필요한 조치 |
|---|---|---|---|
| P0 | 없음 | 핵심 시연을 막는 실행·추천·API 단절 없음 | - |
| P1 | 남음 | 추천 노출 이력이 프로세스 메모리 저장소라 재시작 시 사라지고 다중 인스턴스 간 공유되지 않음 | Redis/DB 기반 repository로 교체, session/request TTL·동시성 테스트 |
| P1 | 운영 gate | 현재 `web-build`는 `/api` same-origin 또는 명시적 API URL을 기대하지만 `serve.js`는 `web-build`를 서빙하거나 `/api`를 proxy하지 않음. 실제 배포 URL·CORS·Kakao 허용 도메인·HTTPS reverse proxy·`TRUST_PROXY`·비밀 교체도 미확정 | Web 호스팅과 API reverse proxy 토폴로지를 결정하거나 절대 API URL로 빌드한 뒤 `build:deployment`와 실제 도메인 E2E 재실행 |
| P2 | 남음 | 직접 대표 이미지 URL 0/61로 KTO/로컬/placeholder에 의존 | 권리 확인된 대표 이미지 URL·출처·캐시 정책 추가 |
| P2 | 남음 | 명시적 `accessibility.walk` 0/61, 추정값 의존 | 현장/운영 데이터로 상·중·하 입력, 이동수단 회귀 재실행 |
| P2 | 남음 | KTO 9.65초, 전체 LLM 코스 15.36초로 체감 지연 가능 | 캐시, 후보 조회 예열, 진행 상태 UI, timeout/재시도 관측 지표 |
| P2 | 남음 | Kakao route 3개 중 1개가 Haversine fallback; 네이티브 지도는 앱 링크 중심 | 교통수단별 route 정책과 네이티브 지도 컴포넌트 보강 |
| P2 | 검증 범위 | 브라우저 코스 지도 전체 렌더와 실제 기기 위치 권한 거부를 직접 조작하지 않음 | 배포 후보 URL과 실제 iOS/Android 기기에서 최종 회귀 |
| P3 | 남음 | RN Web `shadow*`, `pointerEvents` deprecation warning | `boxShadow`와 style 기반 pointer events로 점진 교체 |

위치 불가 문구는 HTTP/프론트 계약 테스트에서 정확히 `현재 위치를 불러오지 못했어요. 우선 거리 정보 없이 추천해드릴게요.`로 확인했다. 브라우저 E2E는 출발지 없음 경로를 사용했으므로 실제 브라우저 권한 거부 조작과 구분한다.

## 직접 수정하고 회귀한 핵심 문제

| 문제 | 원인 | 수정 | 수정 후 결과 |
|---|---|---|---|
| 신규 7개 지도 연결 불가 | 좌표 `null` | Kakao 검색 좌표와 출처를 runtime/clean DB/전달 사본에 반영 | 61/61 유한 좌표, 신규 7개 지도·코스 smoke 성공 |
| 빈 이력 저노출 보정 | 빈 이력을 저노출로 간주 | 빈 이력 boost를 0으로 변경 | 점수 breakdown·민감도 PASS |
| 도보 과대평가 위험 | 명시적 walk 부재와 느슨한 추정 | 명시값 우선, 산악·고원·목장·대형 숙소 추정 보수화 | transport sensitivity PASS |
| 재추천 중복 위험 | 클라이언트 excludeIds 의존 | 서버 session repository, requestId/rerollOfRequestId, 직전 3개 강제 제외 | excludeIds 없이도 겹침 0 |
| LLM 대표 장소 중복 | selected representative를 주변 후보로 재수용 | canonical 대표 ID 제거 후 schema 검증 | 실제 LLM 4 stops, 고유 4 |
| KTO 인증 불안정 | 서비스 키 이중 인코딩 가능 | raw/encoded key 정규화 | 실제 5/5 HTTP 200 |
| 외부 장애 전체 실패 | 오류별 처리 분산 | timeout/retry/schema 검증/규칙 기반 fallback 통합 | 실패 행렬 10/10 |
| API 계약 불일치 위험 | 세션·재추천 필드 미공유 | OpenAPI, Zod, generated client 동기화 | frontend contract PASS |
| 중복 클릭·stale 응답 | 요청 수명과 화면 상태 미연결 | 요청 잠금, stale 응답 무시, AsyncStorage 세션 저장 | HTTP·브라우저 E2E PASS |
| 백엔드 빌드 worker 오류 | staging 경로를 Pino worker에 bake | final dist 직접 빌드 + 실패 시 복구 | 새 프로세스 verify PASS |
| 개발 실행 분리 | API URL과 두 프로세스 수동 설정 | `dev:web`/`dev:device` 통합 실행 스크립트 | API 3000 + Web 8081 기동 PASS |
| Replit 잔재와 낡은 설명 | 앱 router origin과 문서가 과거 Replit·58개 기준 | `app.json` origin 제거·한글 복구, `replit.md`를 61개/현재 포트·KTO 호환 설명으로 교체 | typecheck·프론트 계약 PASS |

# 13. 변경 파일 목록

빌드 산출물과 TypeScript cache를 제외한 주요 변경은 다음과 같다.

- 추천 도메인: `lib/travel-domain/src/goatRecommendationEngine.ts`, `recommendationService.ts`, `recommendationExposureRepository.ts`, `courseRecommendationService.ts`, `openRouterCourseLlm.ts`, `tourApiClient.ts`, `kakaoStaticMap.ts`와 관련 타입/exports
- API 서버: `artifacts/api-server/src/routes/travel.ts`, `src/routes/kto.ts`, `src/services/kakao-location.ts`, `build.mjs`, `scripts/dev.mjs`, `verify-api.mjs`, `external-services.test.ts`, `live-external-smoke.mjs`, `run-external-tests.mjs`
- API 계약: `lib/api-spec/openapi.yaml`, `lib/api-zod/src/generated/**`, `lib/api-client-react/src/generated/api.schemas.ts`
- 프론트: `artifacts/goat-mobile/app.json`, `app/results.tsx`, `app/detail/[id].tsx`, `app/travel-preference.tsx`, `src/context/AppContext.tsx`, `src/services/recommendationRequest.ts`, API/KTO hooks·services·UI components, `run-http-e2e.mjs`를 포함한 실행·검증 scripts
- 데이터: runtime scoring JSON, `문서/goat_places_clean_db_ready.json`, 백엔드 전달용 동일 데이터 사본 2개
- 자동 테스트: `scripts/src/verifyRecommendationLogic.ts`, `auditRecommendationCoverage.ts`, `verifyConditionSensitivity.ts`, 프론트 계약·HTTP 흐름, 백엔드 외부 실패·live smoke
- 실행·문서: 루트와 앱 `package.json`, `.nvmrc`, `.env.example` 계열, `.gitignore`, `README.md`, `replit.md`, `GOAT_TEAM_HANDOFF.md`, `GOAT_TEST_COMMANDS.md`
- 감사 산출물: 이 보고서와 `reports/` 아래 추천·도달성·민감도·실제 API 결과

`GOAT.env`, `node_modules`, `dist`, `web-build`, `static-build`, `.expo`, `.expo-shared`, `.metro-cache`, `.replit-artifact`, `*.tsbuildinfo`, `logs`는 팀 전달 ZIP에서 제외한다. 생성 산출물은 대상 머신의 환경변수와 경로로 다시 만든다.

# 14. 팀원 실행 가이드

## 처음 실행

1. Node `24.16.x` 또는 지원 범위의 Node를 사용한다.
2. 별도 보안 채널로 받은 `GOAT.env`를 프로젝트 루트에 둔다. 저장소·메신저 공개 채널·ZIP에는 넣지 않는다.
3. 프로젝트 루트에서 실행한다.

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm run dev:web
```

4. 브라우저에서 `http://localhost:8081`을 열고, API health는 `http://127.0.0.1:3000/api/healthz`로 확인한다.

모바일 기기 테스트는 다음 명령을 사용한다. PC와 기기가 같은 네트워크에 있어야 하며, 방화벽과 LAN API 주소를 확인한다.

```powershell
corepack pnpm --filter @workspace/goat-mobile run dev:device
```

## 회귀 테스트

```powershell
corepack pnpm run typecheck
corepack pnpm run verify
corepack pnpm run test:place-coverage:all-references
```

실제 외부 API 검증은 호출량과 비용을 인지하고 필요할 때 실행한다.

```powershell
corepack pnpm --filter @workspace/api-server run verify:external:live
```

운영 빌드는 실제 HTTPS API URL을 지정하고 Kakao 콘솔의 허용 도메인을 먼저 등록한다.

```powershell
$env:EXPO_PUBLIC_API_BASE_URL='https://api.example.com'
$env:EXPO_PUBLIC_DOMAIN='https://app.example.com'
corepack pnpm --filter @workspace/goat-mobile run build:deployment
```

명령별 목적과 예상 결과는 `GOAT_TEST_COMMANDS.md`, 운영·env·장애 대응은 `GOAT_TEAM_HANDOFF.md`를 함께 본다.

# 15. 최종 시연 체크리스트

- [ ] 전달 ZIP에 `GOAT.env`, 실제 비밀값, 의존성·빌드·캐시·로그 산출물이 없는지 확인
- [ ] 별도 전달받은 개발용 키가 활성 상태인지 확인하고, 발표 후/배포 전 교체 계획 확인
- [ ] `corepack pnpm install --frozen-lockfile`와 `corepack pnpm run typecheck` 통과
- [ ] `dev:web`으로 API 3000, Web 8081 동시 기동
- [ ] `/api/healthz`가 `ok`인지 확인
- [ ] 테마·목적·동행·이동수단·계절·출발지 조건 변경이 화면과 요청에 반영되는지 확인
- [ ] 추천 카드 3장이 서로 다른지 확인
- [ ] 다시 추천이 직전 카드 3장을 제외하는지 확인
- [ ] 상세 화면의 주의사항·대안·지도 CTA 확인
- [ ] 실제 KTO 주변 후보와 OpenRouter 코스가 생성되는지 대표 1회 확인
- [ ] 외부 API 지연 시 로딩 상태와 규칙 기반 fallback이 유지되는지 확인
- [ ] Kakao 웹 도메인·지도 마커·지도앱 fallback 확인
- [ ] GOAT-055~061 중 하나를 추천→상세→코스→지도까지 확인
- [ ] 실제 iOS/Android 기기에서 위치 허용·거부와 LAN API 주소를 최종 확인
- [ ] 운영 배포 전 Redis/DB 노출 저장소, CORS/HTTPS/`TRUST_PROXY`, rate limit, 모니터링을 완료

핵심 근거 파일:

- [추천 테스트 요약](reports/recommendation-test-summary.md)
- [추천 테스트 원시 결과](reports/recommendation-test-results.json)
- [장소별 추천 분포](reports/place-recommendation-distribution.csv)
- [61개 도달성 상세](reports/place-coverage-report.csv)
- [미추천/조건부 분석](reports/place-unreachable-report.md)
- [조건 민감도](reports/condition-sensitivity-report.md)
- [실제 외부 API 검증](reports/external-api-live-results.json)
