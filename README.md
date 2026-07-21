# GOAT — Gangwon Of All Time

GOAT는 사용자가 선택한 감성 태그와 여행 조건을 바탕으로 강원도 장소 3곳을 추천하고, 선택한 장소 주변의 한국관광공사 정보를 OpenRouter LLM으로 재정렬해 하루 코스와 지도 정보를 제공하는 Expo + Express 서비스입니다.

## 현재 서비스 흐름

1. 7개 감성 무드 중 하나를 선택합니다.
2. 동행자, 이동수단, 방문 시간, 계절, 여행 목적, 출발지를 설정합니다.
3. 추천 엔진이 역할이 다른 카드 3장을 반환합니다.
   - 카드 1: 최적 장면
   - 카드 2: 같은 무드 대안
   - 카드 3: 조건 맞춤
4. 장소를 선택하면 한국관광공사 OpenAPI에서 주변 후보를 가져옵니다.
5. OpenRouter LLM은 전달된 후보 ID 안에서만 하루 코스를 구성합니다.
6. 좌표와 실제 경로 또는 Haversine 대체값으로 코스를 정렬하고 Kakao 지도 정보를 제공합니다.

1차 장소 점수는 LLM이 계산하지 않습니다. 운영 추천 데이터는 정확히 61곳이며, `lib/travel-domain/src/data/goat_simplified_scoring_tags_v10_accessibility_merged.json` 한 파일을 기준으로 사용합니다.

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프런트엔드 | React Native 0.81, Expo 54, Expo Router 6, React 19 |
| 백엔드 | Node.js, Express 5, TypeScript |
| 추천 도메인 | 공유 TypeScript 라이브러리 (`@workspace/travel-domain`) |
| API 계약 | OpenAPI, Orval, Zod |
| 외부 서비스 | 한국관광공사 KorService2, OpenRouter, Kakao Local/Mobility/Maps |
| 패키지 관리 | pnpm 11 workspaces |

## 요구 환경

- Node.js 24.16.0 권장 (`.nvmrc`), 지원 범위 `>=20.19.4 <25`
- pnpm 11.8.0 (`corepack` 사용)
- 프로젝트 루트의 `GOAT.env`

`GOAT.env`는 Git에서 제외됩니다. 팀 전달 시에는 보안 채널로 별도 공유하고, 배포 전에 개발용 키를 교체하세요. 값 이름과 선택/필수 여부는 `.env.example`에서 확인할 수 있습니다.

## 빠른 웹 시연

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm run dev:web
```

`dev:web`은 백엔드를 먼저 빌드·실행한 뒤 Expo Web을 연결합니다. 기본 주소는 다음과 같습니다.

- 웹: `http://localhost:8081`
- API: `http://127.0.0.1:3000`

물리 기기에서 Expo Go로 확인하려면 같은 네트워크에서 다음 명령을 실행합니다.

```bash
corepack pnpm --filter @workspace/goat-mobile run dev:device
```

LAN 주소 자동 감지가 맞지 않으면 모바일 패키지에서 `node scripts/dev-full.js --lan --host 192.168.x.x`처럼 호스트를 지정합니다.

## 개별 실행

```bash
# 백엔드: GOAT.env 자동 탐색, 기본 포트는 GOAT.env의 PORT
corepack pnpm --filter @workspace/api-server run dev

# Expo Web UI만 실행할 때는 API URL을 별도로 설정
corepack pnpm --filter @workspace/goat-mobile run dev:web:ui
```

## 검증

```bash
corepack pnpm run typecheck
corepack pnpm run build
corepack pnpm run test:unit
corepack pnpm run test:integration
corepack pnpm run test:e2e
corepack pnpm run test:place-coverage
corepack pnpm run test:condition-sensitivity
corepack pnpm run test:external-api
corepack pnpm run test:all
corepack pnpm run verify
```

`test:external-api`는 실제 외부 API를 호출하므로 네트워크와 유효한 키가 필요하고 호출 비용·쿼터가 발생할 수 있습니다. 전체 명령과 기대 결과는 [GOAT_TEST_COMMANDS.md](GOAT_TEST_COMMANDS.md), 팀 인수인계 절차는 [GOAT_TEAM_HANDOFF.md](GOAT_TEAM_HANDOFF.md), 최종 판정과 알려진 제한은 [GOAT_SERVICE_AUDIT_REPORT.md](GOAT_SERVICE_AUDIT_REPORT.md)를 확인하세요.

## 주요 구조

```text
artifacts/api-server/       Express API
artifacts/goat-mobile/      Expo 앱
artifacts/mockup-sandbox/   브랜드 시안용 Vite 앱
lib/travel-domain/          추천·KTO·LLM·코스 도메인
lib/api-spec/               OpenAPI 원본
lib/api-client-react/       생성된 프런트 API 클라이언트
lib/api-zod/                생성된 요청/응답 Zod 스키마
scripts/                    데이터·추천 회귀 및 전수 검사
reports/                    자동 생성된 검증 결과
문서/산출물/                기획·기능·ERD·아키텍처 문서
```

## 운영 전 확인

- 개발용 API 및 OAuth 비밀값을 모두 교체합니다.
- 실제 배포 도메인을 Kakao JavaScript SDK 허용 도메인과 OAuth redirect URI에 등록합니다.
- 배포용 정적 산출물은 `EXPO_PUBLIC_API_BASE_URL`을 실제 HTTPS API 주소로 설정한 뒤 새로 생성합니다.
- 추천 노출 이력은 현재 프로세스 메모리에만 저장됩니다. 다중 인스턴스·재시작 환경에서는 Redis나 데이터베이스 저장소로 교체해야 합니다.
- 데이터에 명시적 `accessibility.walk`가 없어 도보 접근성은 보수적으로 추정합니다. 운영 검증값을 수집해 61곳에 추가하는 것이 좋습니다.
- 장소 데이터의 직접 `imageUrl`은 비어 있습니다. 화면은 KTO 동적 사진, 로컬 이미지, 최종 placeholder 순으로 대체합니다.
