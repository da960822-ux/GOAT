# GOAT 테스트 명령 모음

모든 명령은 프로젝트 루트의 PowerShell에서 실행합니다. 실제 비밀값을 명령행 인수나 로그에 넣지 말고 루트 `GOAT.env`로만 제공합니다.

## 1. 준비

```powershell
node --version
corepack pnpm --version
corepack pnpm install --frozen-lockfile
```

기대값:

- Node.js `>=20.19.4 <25` (`24.16.0` 권장)
- pnpm `11.8.0`
- frozen lockfile 설치 exit code `0`

환경파일 형식만 검사하는 명령은 외부 API를 호출하지 않습니다.

```powershell
node scripts/verify-goat-env.mjs
```

`LOADED`/`VALID` 상태와 exit code `0`을 확인합니다. 이 스크립트는 값을 출력하지 않지만 파일의 절대 경로는 출력합니다.

## 2. 빠른 오프라인 회귀 세트

```powershell
corepack pnpm run typecheck
corepack pnpm run test:unit
corepack pnpm run test:integration
corepack pnpm run test:e2e
corepack pnpm run test:condition-sensitivity
```

이 세트는 실제 Kakao, 한국관광공사, OpenRouter를 호출하지 않습니다. 기대 결과는 모든 명령 exit code `0`, 외부 서비스 모의 테스트 10건 통과, 프런트 요청 계약 PASS, 조건 민감도 PASS입니다.

## 3. 테스트 종류별 명령

| 구분 | 명령 | 네트워크/비용 | 기대 결과 |
|---|---|---|---|
| 정적 검사 | `corepack pnpm run typecheck` | 없음 | 모든 workspace TypeScript 검사 성공 |
| 단위·데이터 | `corepack pnpm run test:unit` | 없음 | 61곳 데이터 검증과 추천 로직 PASS |
| 추천 로직만 | `corepack pnpm run test:recommendation` | 없음 | 결과 JSON의 `status: PASS` |
| 통합 회귀 | `corepack pnpm run test:integration` | 없음 | 외부 연동 mock 10건과 프런트 계약 PASS |
| API client 통합 | 아래 4.1 절 | 없음 | 최신 API 번들과 생성 client로 추천·상세·재추천 PASS |
| API 라우트 통합 | 아래 4.2 절 | Kakao Local 1회 | 61곳, 7개 무드, 오류 계약, geocode PASS |
| HTTP E2E | `corepack pnpm run test:e2e` | 없음 | 새 API 프로세스에서 7개 무드, 3장, 상세, 세션 재추천, fallback 코스 PASS |
| 실제 UI | `corepack pnpm run dev:web` | UI 조작에 따라 외부 호출 | 브라우저의 전체 사용자 흐름 확인 |
| 61곳 전수 | `corepack pnpm run test:place-coverage` | 없음 | 65,856건 성공, 61/61 도달, 리포트 생성 |
| 모든 레퍼런스 전수 | `corepack pnpm run test:place-coverage:all-references` | 없음 | 197,568건 성공, 61/61 도달 |
| 조건 민감도 | `corepack pnpm run test:condition-sensitivity` | 없음 | OFAT 전 항목 PASS, 리포트 생성 |
| 전체 소스 빌드 | `corepack pnpm run build` | 외부 API 없음 | 타입검사와 모든 workspace 빌드 성공 |
| 웹 export | `corepack pnpm --filter @workspace/goat-mobile run build:web` | 외부 API 없음 | `artifacts/goat-mobile/web-build` 생성 |
| 오프라인 전체 테스트 | `corepack pnpm run test:all` | 없음 | unit, integration, HTTP E2E, 전수, 민감도 연속 PASS |
| 빌드 포함 최종 검증 | `corepack pnpm run verify` | 없음 | 전체 build와 `test:all` 연속 PASS |
| 실제 외부 API | `corepack pnpm run test:external-api` | 실제 호출·quota·OpenRouter 비용 가능 | Kakao/KTO/OpenRouter 모두 실제 응답으로 PASS |

## 4. 통합 테스트

### 4.1 API 번들 ↔ 생성 프런트 client

```powershell
corepack pnpm --filter @workspace/api-server run build
corepack pnpm --filter @workspace/goat-mobile run verify:api-client
```

검증 스크립트가 임시로 `127.0.0.1:43130`에서 API를 실행합니다. 7개 무드, 61곳 seed pool, 3개 고유 카드, 상세 조회, 동일 세션 재추천 시 직전 카드 제외를 확인하고 `Frontend API client verification passed.`를 출력해야 합니다. 외부 API는 호출하지 않습니다.

### 4.2 API 라우트 전체 계약

```powershell
corepack pnpm --filter @workspace/api-server run build
corepack pnpm --filter @workspace/api-server run verify
```

검증 스크립트가 임시로 `127.0.0.1:43129`에서 API를 실행합니다. 다음을 확인합니다.

- 61개 고유 장소와 7개 무드
- 각 무드의 역할이 다른 고유 카드 3장
- 조건·출발지·상세·재추천 세션 계약
- 잘못된 요청 400, 미존재 장소 404, debug 금지 403
- 지도 marker 문자열 escape
- 실제 Kakao Local의 `서울역` 주소/키워드 좌표 변환

마지막 Kakao geocode는 네트워크와 유효한 `KAKAO_REST_API_KEY`가 필요하고 Kakao quota를 1회 사용합니다. 기대 출력은 `API verification passed: 61 places, 7 moods, GOAT reference-card scoring engine.`입니다.

## 5. HTTP E2E

권장 명령은 API를 새 프로세스로 빌드·기동하고, 테스트가 끝나면 자동 종료합니다.

```powershell
corepack pnpm run test:e2e
```

이 테스트는 다음 실제 HTTP 흐름을 검증합니다.

1. health와 7개 무드
2. 최초 고유 카드 3장과 61곳 seed pool
3. 선택 장소 상세 조회
4. `sessionId` + `rerollOfRequestId`만으로 직전 3장 제외
5. 위치 사용 불가 시 정확한 안내와 거리 없는 추천
6. session 없는 재추천 요청 400
7. `forceRuleBasedFallback=true` 규칙 기반 코스와 지도 metadata

E2E 입력은 대중교통이고 코스는 강제 규칙 기반이라 Kakao Mobility, KTO, OpenRouter를 호출하지 않습니다. 기대 출력은 `HTTP flow verification passed:`로 시작하며 카드 ID와 코스 stop 수가 이어집니다.

## 6. 추천 전수검사와 리포트

실제 UI의 7개 감성 진입점 기준 Cartesian 전수검사:

```powershell
corepack pnpm run test:place-coverage
```

기대값:

- 전체 호출 `65,856`
- 성공/실패 `65,856 / 0`
- 3장 반환 실패, 카드 중복, NaN, Infinity, undefined, 점수 범위 위반 모두 `0`
- `REACHABLE 60`, `CONDITIONALLY_REACHABLE 1`, 영구 미도달 `0`
- 다시 추천 포함 전체 61곳 도달
- 신규 `GOAT-055`~`GOAT-061` 7곳 모두 도달
- 좌표 61/61

다음 파일이 갱신됩니다.

- `reports/recommendation-test-summary.md`
- `reports/recommendation-test-results.json`
- `reports/place-recommendation-distribution.csv`
- `reports/place-coverage-report.csv`
- `reports/place-unreachable-report.md`

운영 데이터의 모든 21개 레퍼런스 카드까지 넓힌 검사는 다음입니다.

```powershell
corepack pnpm run test:place-coverage:all-references
```

기대값은 `197,568`건 성공과 61/61 도달입니다. 이 명령은 `--write-reports`를 사용하지 않으므로 기본 전수 리포트를 덮어쓰지 않습니다.

조건을 한 번에 하나만 바꾸는 OFAT 검사는 다음입니다.

```powershell
corepack pnpm run test:condition-sensitivity
```

`primaryTheme`, `mood_tags`, `sceneTags`, 목적, 이동수단, 계절, 출발지, 노출 이력, 재추천은 관련 점수·순위·카드 변화를 보여야 합니다. `companionType`은 정책상 1차 점수에 반영하지 않는 것이 PASS입니다. 결과는 `reports/condition-sensitivity-report.md`에 기록됩니다.

## 7. 실제 외부 API 검증

먼저 형식 검사를 통과하고 API를 최신 소스로 빌드합니다.

```powershell
node scripts/verify-goat-env.mjs
corepack pnpm --filter @workspace/api-server run build
corepack pnpm run test:external-api
```

이 검증은 fallback을 실제 성공으로 인정하지 않습니다. 다음 모두를 요구합니다.

- Kakao Local 실제 geocode 성공
- Kakao Mobility 자동차 경로가 최소 1개 실제 `KAKAO_ROUTE`
- 한국관광공사 실제 주변 후보 1개 이상
- 후보가 OpenRouter 입력까지 전달됨
- OpenRouter 실제 HTTP 200, 요청 모델과 응답 모델 일치, `LLM_OPENROUTER`
- 코스 stop ID가 전달 후보 ID 안에 있고 중복 없음
- Kakao 지도 marker 수와 코스 stop 수 일치
- 신규 7곳 좌표·fallback 코스·지도 marker 확인

성공 시 JSON과 함께 `verification: "PASS"`가 출력되고 다음 결과 파일이 생성됩니다.

```text
artifacts/api-server/reports/external-live-verification.json
```

주의:

- Kakao Local/Mobility와 한국관광공사 quota를 사용합니다.
- OpenRouter는 선택한 모델의 유료 토큰 비용이 발생할 수 있습니다.
- 한 번의 live 검증도 KTO를 여러 content type으로 조회하므로 반복 실행하지 않습니다.
- 429, quota 부족, 외부 장애, DNS/방화벽 문제는 코드 회귀와 구분해 기록합니다.
- 실패 리포트와 터미널을 공유하기 전에 키가 포함되지 않았는지 확인합니다. 현재 검증기는 키 값을 출력하지 않습니다.

별도의 가벼운 네트워크 preflight는 다음입니다.

```powershell
node scripts/verify-goat-env.mjs --network
```

이는 Kakao 주소검색, KTO 기본 조회, OpenRouter 모델 목록을 실제로 각각 확인하지만 코스 전체 품질을 검증하지는 않습니다.

## 8. 전체 빌드

```powershell
corepack pnpm run build
```

루트 `build`는 먼저 전체 typecheck를 실행한 뒤 build 스크립트가 있는 workspace를 빌드합니다. API esbuild 번들, mockup Vite 빌드, Expo iOS/Android 정적 번들과 manifest까지 오류 없이 생성되어야 합니다. Metro는 로컬에서 실행되며 외부 API 호출은 하지 않지만 수 분이 걸릴 수 있습니다.

이 명령으로 생성한 모바일 `static-build`는 로컬 serve 주소를 사용한 개발 검증물입니다. 운영 배포물은 다음처럼 배포 주소를 명시해 별도로 생성합니다.

```powershell
$env:EXPO_PUBLIC_DOMAIN = "https://app.example.com"
$env:EXPO_PUBLIC_API_BASE_URL = "https://api.example.com"
corepack pnpm --filter @workspace/goat-mobile run build:deployment
```

운영 build 후 로컬 주소가 남지 않았는지 확인합니다.

```powershell
rg -n "localhost|127\.0\.0\.1|192\.168\." artifacts/goat-mobile/static-build
```

출력이 없어야 합니다. API `dist`와 모바일 `static-build`는 전달 ZIP에 넣지 말고 수신·배포 환경에서 다시 빌드합니다.

## 9. 권장 최종 게이트 순서

```powershell
corepack pnpm install --frozen-lockfile
node scripts/verify-goat-env.mjs
corepack pnpm run verify
corepack pnpm --filter @workspace/goat-mobile run verify:api-client
corepack pnpm --filter @workspace/api-server run verify
corepack pnpm run test:external-api
```

루트 `verify`와 프런트 API client 검증은 오프라인 회귀입니다. API 패키지의 `verify`는 Kakao Local을 1회 사용하고, 마지막 `test:external-api`는 Kakao·KTO·OpenRouter를 실제 호출합니다. 실제 API 단계는 코드·환경 검증이 모두 끝난 뒤 한 번만 실행하고 결과의 생성 시각, HTTP 상태, 모델, fallback 여부를 리포트에 남깁니다.
