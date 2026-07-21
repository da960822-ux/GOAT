# GOAT 팀 인수인계 가이드

이 문서는 팀원이 새 PC 또는 배포 환경에서 GOAT를 소스부터 재현하는 절차입니다. 전달물에는 소스·잠금 파일·문서·검증 리포트를 포함하고, 비밀값과 생성물은 포함하지 않습니다.

## 1. 전달받는 사람이 먼저 확인할 것

- Node.js: `24.16.0` 권장 (`.nvmrc`), 지원 범위 `>=20.19.4 <25`
- 패키지 관리자: Corepack으로 고정된 `pnpm 11.8.0`
- 저장소 루트: `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.env.example`이 있는 디렉터리
- 웹 시연 기본 주소: `http://localhost:8081`
- API 기본 주소: `http://127.0.0.1:3000` (`GOAT.env`의 `PORT`가 3000일 때)

PowerShell에서 다음을 확인합니다.

```powershell
node --version
corepack pnpm --version
```

버전이 맞으면 프로젝트 루트에서 의존성을 설치합니다.

```powershell
corepack pnpm install --frozen-lockfile
```

다른 패키지 관리자로 설치하지 마세요. `package-lock.json` 또는 `yarn.lock`을 새로 만들지 말고, `pnpm-lock.yaml`을 기준으로 설치합니다.

## 2. `GOAT.env` 설정

`GOAT.env`가 없을 때만 루트의 예시 파일을 복사합니다.

```powershell
Copy-Item -LiteralPath .env.example -Destination GOAT.env
```

실제 값은 이 문서, Git, 이슈, 메신저, 터미널 캡처에 기록하지 않습니다. 담당자에게 보안 채널로 전달받아 로컬 `GOAT.env`에만 입력하고, 팀원·환경별로 키를 분리합니다. 파일은 UTF-8, 한 줄에 `KEY=value` 형식으로 저장합니다.

| 그룹 | 설정할 변수 | 용도 |
|---|---|---|
| 서버 | `PORT`, `NODE_ENV`, `CORS_ORIGINS`, `TRUST_PROXY` | 포트, 운영 모드, 허용 웹 Origin, 프록시 신뢰 |
| 데이터/인증 | `DATABASE_URL`, `AUTH_BASE_URL`, `AUTH_SUCCESS_REDIRECT_URL`, `AUTH_FAILURE_REDIRECT_URL` | OAuth 사용자 저장 및 리디렉션 |
| Google OAuth | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | Google 로그인 |
| Kakao 서버 | `KAKAO_REST_API_KEY`, `KAKAO_MOBILITY_REST_API_KEY`, `KAKAO_OAUTH_CLIENT_SECRET` | 주소 검색, 자동차 길찾기, Kakao 로그인 |
| Kakao 웹 | `KAKAO_JAVASCRIPT_KEY` | 웹 지도 SDK |
| 관광공사 | `KTO_SERVICE_KEY` | KorService2 주변 관광 후보 조회 |
| LLM | `OPENROUTER_API_KEY`, `OPENROUTER_DEFAULT_MODEL`, `OPENROUTER_ALLOWED_MODELS` | 후보 ID 기반 코스 생성 |
| 운영 제한 | `RECOMMEND_*`, `GEOCODE_*`, `KAKAO_ROUTE_*`, `COURSE_*`, `KTO_*` | rate limit, 노출 이력, 호출량 제한 |

`KAKAO_MOBILITY_REST_API_KEY`를 비우면 서버는 `KAKAO_REST_API_KEY`를 길찾기에도 사용합니다. 운영에서는 제품 권한과 키 구성을 Kakao 콘솔에서 확인하세요. `VISITKOREA_SERVICE_KEY`는 호환용 별칭이며 신규 설정은 `KTO_SERVICE_KEY`를 기준으로 합니다.

값을 노출하지 않고 형식과 필수 키만 검사할 수 있습니다.

```powershell
node scripts/verify-goat-env.mjs
```

`--network` 옵션은 실제 Kakao Local, 한국관광공사, OpenRouter를 호출하므로 키 권한과 네트워크를 확인할 때만 사용합니다.

## 3. 웹 시연: 한 명령으로 API와 Expo 실행

의존성 설치와 `GOAT.env` 설정을 마친 뒤 프로젝트 루트에서 실행합니다.

```powershell
corepack pnpm run dev:web
```

이 명령은 다음을 순서대로 처리합니다.

1. API를 현재 소스에서 빌드합니다.
2. `GOAT.env`의 `PORT`로 API를 실행하고 `/api/healthz`가 준비될 때까지 기다립니다.
3. 해당 API 주소를 `EXPO_PUBLIC_API_BASE_URL`로 주입해 Expo Web을 실행합니다.

기본 확인 주소는 다음과 같습니다.

- UI: `http://localhost:8081`
- API 상태: `http://127.0.0.1:3000/api/healthz`

종료할 때는 실행한 터미널에서 `Ctrl+C`를 눌러 API와 Expo를 함께 종료합니다.

## 4. 물리 기기 시연

PC와 휴대폰을 같은 Wi-Fi에 연결한 뒤 실행합니다.

```powershell
corepack pnpm --filter @workspace/goat-mobile run dev:device
```

스크립트가 LAN IPv4를 자동 탐지해 휴대폰이 접근할 API 주소를 주입합니다. 자동 탐지가 잘못되면 다음처럼 명시합니다.

```powershell
corepack pnpm --filter @workspace/goat-mobile exec node scripts/dev-full.js --lan --host 192.168.x.x
```

Expo Go에 표시되는 QR을 사용합니다. Windows 방화벽에서 Node/Expo의 사설 네트워크 접근을 허용해야 하며, 휴대폰에서 PC의 해당 IP와 `GOAT.env`의 API 포트에 접근할 수 있어야 합니다. Android 에뮬레이터에서 API를 개별 실행하는 경우 호스트 PC는 보통 `10.0.2.2`로 접근합니다.

## 5. 실제 경로와 fallback 경로

| 기능 | 정상 실서비스 경로 | fallback/검증 경로 |
|---|---|---|
| 1차 장소 3장 추천 | 로컬 61곳 데이터와 결정적 TypeScript 점수 엔진 | 외부 API나 LLM을 사용하지 않음 |
| 출발지 검색 | 서버의 Kakao Local API | 사용자가 건너뛰거나 위치를 못 얻으면 거리 정보 없이 추천 |
| 자차 거리 | Kakao Mobility 자동차 길찾기 | 일부/전체 실패 시 Haversine 추정과 경고 |
| 주변 후보 | 한국관광공사 KorService2 | 실패·0건이면 같은 지역의 로컬 후보 |
| 하루 코스 | OpenRouter가 서버가 준 후보 ID 안에서만 선택 | 오류·재시도 소진 시 규칙 기반 코스 |
| 지도 | 웹에서 Kakao JavaScript SDK 설정과 마커를 사용 | 지도 검색 URL 제공; 네이티브는 지도 앱/웹 링크 사용 |

정상 UI 요청은 `forceRuleBasedFallback`을 보내지 않으므로 키가 있으면 한국관광공사와 OpenRouter의 실제 경로를 사용합니다. `test:external`은 응답을 모의 처리하는 회귀 테스트이며 실서비스 성공 증거가 아닙니다. 실제 외부 연동은 `verify:external:live`로 별도 확인합니다.

## 6. 배포 전 설정

1. API 환경에 `NODE_ENV=production`, 운영 `PORT`, 정확한 `CORS_ORIGINS`, 인프라에 맞는 `TRUST_PROXY`를 설정합니다. 운영 CORS에 `*`는 허용되지 않습니다.
2. `AUTH_BASE_URL`을 공개 API 기준 URL로 두고 OAuth 콘솔에 다음 callback을 정확히 등록합니다.
   - Google: `${AUTH_BASE_URL}/api/auth/google/callback`
   - Kakao: `${AUTH_BASE_URL}/api/auth/kakao/callback`
3. Kakao Developers의 JavaScript SDK 허용 도메인에 실제 웹 Origin을 등록합니다. 프로토콜, 호스트, 포트가 실제 배포 주소와 일치해야 합니다.
4. REST/Mobility 키는 서버 환경에만 둡니다. `EXPO_PUBLIC_*` 변수에 비밀키를 넣지 않습니다. `KAKAO_JAVASCRIPT_KEY`는 브라우저용 공개 SDK 키이지만 도메인 제한은 반드시 설정합니다.
5. API와 모바일 산출물을 각각 배포 대상에서 소스부터 빌드합니다.

API:

```powershell
corepack pnpm --filter @workspace/api-server run build
corepack pnpm --filter @workspace/api-server run start
```

Expo 정적 배포 번들:

```powershell
$env:EXPO_PUBLIC_DOMAIN = "https://app.example.com"
$env:EXPO_PUBLIC_API_BASE_URL = "https://api.example.com"
corepack pnpm --filter @workspace/goat-mobile run build:deployment
```

`EXPO_PUBLIC_DOMAIN`은 번들·manifest·asset을 제공할 실제 Origin이고, `EXPO_PUBLIC_API_BASE_URL`은 앱이 호출할 실제 HTTPS API Origin입니다. 빌드 후 `static-build` 안에 `localhost`, `127.0.0.1`, 개발 PC 주소가 남지 않았는지 검사합니다.

```powershell
rg -n "localhost|127\.0\.0\.1|192\.168\." artifacts/goat-mobile/static-build
```

결과가 나오면 해당 산출물을 배포하지 말고 올바른 두 환경변수로 다시 빌드합니다.

## 7. 반드시 소스에서 다시 빌드할 것

- `artifacts/api-server/dist`를 전달하거나 재사용하지 않습니다. 현재 Pino worker 런처는 빌드 시점의 절대 `dist` 경로를 포함할 수 있으므로 다른 PC에 복사한 번들은 실행 경로가 깨질 수 있습니다.
- `artifacts/goat-mobile/static-build`를 전달하거나 재사용하지 않습니다. 개발 빌드의 manifest와 번들에는 로컬 API/asset 주소가 들어갈 수 있습니다.
- 수신자는 `pnpm-lock.yaml`로 설치한 뒤 API, 웹/모바일 산출물을 자신의 실행 또는 배포 환경에서 생성합니다.

팀 전달 ZIP에서 제외할 항목:

```text
GOAT.env
node_modules/
artifacts/api-server/dist/
artifacts/goat-mobile/static-build/
artifacts/goat-mobile/web-build/
.expo/
.expo-shared/
.metro-cache/
.replit-artifact/
logs/
*.log
*.tsbuildinfo
```

반드시 포함할 항목은 소스, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.nvmrc`, `.env.example`, assets, 문서, `reports/`입니다. ZIP 목록 검사에서 아래 명령이 아무것도 출력하지 않아야 합니다.

```powershell
tar -tf .\GOAT-team-handoff.zip | Select-String '(^|/)(GOAT\.env|node_modules|dist|static-build|web-build|\.expo|logs)(/|$)|\.log$'
```

## 8. 현재 운영 제약

추천 노출 이력과 “다시 추천” 직전 카드 제외 상태는 현재 API 프로세스 메모리의 `InMemoryRecommendationExposureRepository`에 저장됩니다. 기본 TTL과 최대 레코드 제한은 환경변수로 조절할 수 있지만 다음은 해결하지 못합니다.

- API 재시작 시 이력 유실
- 여러 API 인스턴스 간 이력 불일치
- 배포 교체 시 세션 연속성 단절

단일 인스턴스 시연에는 사용할 수 있지만 운영 전에는 Redis 또는 DB 기반 공유 저장소로 교체하고, 동일 `sessionId`의 원자적 기록·TTL·중복 제거를 검증해야 합니다.

추가로 61개 scoring 데이터의 직접 `imageUrl`은 비어 있어 UI가 관광공사 동적 이미지, 로컬 자산 또는 placeholder를 사용합니다. 도보 접근성도 명시값이 없어 일부 장소는 보수적 추정치를 사용합니다. 이는 추천 실패와는 별개지만 운영 데이터 보강 대상입니다.

## 9. 자주 발생하는 문제

| 증상 | 확인 및 조치 |
|---|---|
| `Use pnpm instead` | `npm install`이 아니라 `corepack pnpm install --frozen-lockfile`을 사용합니다. |
| Node/pnpm 버전 불일치 | `.nvmrc`의 Node를 사용하고 `corepack pnpm --version`이 11.8.0인지 확인합니다. |
| `PORT environment variable is required` | 루트 `GOAT.env`에 유효한 `PORT`가 있는지, 파일명이 정확한지 확인합니다. |
| 3000 또는 8081 포트 충돌 | `Get-NetTCPConnection -LocalPort 3000,8081 -ErrorAction SilentlyContinue`로 점유 프로세스를 확인한 뒤 해당 앱을 정상 종료합니다. |
| UI는 열리지만 API 실패 | `/api/healthz`를 먼저 확인하고, UI만 실행했다면 `EXPO_PUBLIC_API_BASE_URL`이 API 주소인지 확인합니다. |
| 휴대폰만 연결 실패 | PC/휴대폰 동일 네트워크, LAN IP, 방화벽, API 포트를 확인하고 `--host`를 명시합니다. 휴대폰에서 `localhost`는 PC가 아닙니다. |
| 운영에서 CORS 시작 실패 | `CORS_ORIGINS`에 실제 `https://...` Origin을 쉼표로 구분해 넣고 `*`를 제거합니다. |
| Kakao 지도 빈 화면 | `KAKAO_JAVASCRIPT_KEY`, Kakao 허용 도메인, 실제 웹 Origin, 브라우저 콘솔을 확인합니다. REST 키를 프런트에 넣지 않습니다. |
| 코스가 계속 규칙 기반 | KTO/OpenRouter 키·허용 모델·quota·네트워크를 서버 로그와 live 검증으로 확인합니다. 키 자체를 로그에 출력하지 않습니다. |
| 배포 빌드가 도메인을 요구 | `EXPO_PUBLIC_DOMAIN`과 `EXPO_PUBLIC_API_BASE_URL`을 운영 HTTPS 주소로 설정하고 `build:deployment`을 다시 실행합니다. |
| 전달받은 `dist`가 다른 PC에서 실패 | 전달된 생성물을 사용하지 말고 의존성 설치 후 API를 소스에서 다시 빌드합니다. |

## 10. 인수 완료 체크리스트

- [ ] Node와 pnpm 버전 확인
- [ ] `pnpm install --frozen-lockfile` 성공
- [ ] `GOAT.env`를 보안 채널로 수령하고 형식 검사 통과
- [ ] 웹 한 명령 실행 후 7개 무드, 3개 고유 카드, 상세 화면 확인
- [ ] 다시 추천에서 직전 3개 카드가 제외되는지 확인
- [ ] 실제 KTO/OpenRouter/Kakao live 검증 통과
- [ ] 운영 도메인·CORS·OAuth callback·Kakao 허용 도메인 등록
- [ ] API `dist`와 모바일 `static-build`를 배포 환경에서 재생성
- [ ] 전달 ZIP에 `GOAT.env`, `node_modules`, 생성 `dist/static-build`, 로그가 없는지 확인
- [ ] 다중 인스턴스 운영 전 노출 이력 저장소 교체 계획 확정
