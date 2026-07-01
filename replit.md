# GOAT (Gangwon Of All Time)

강원도 안에서 해외여행 같은 이색 장면을 빠르게 고를 수 있도록, 감성 무드·관광사진·날씨·방문 집중률·동선·안전 정보를 결합해 추천 카드 3개를 제공하는 강원 특화 관광 의사결정 서비스.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/src/routes/kto.ts` — KTO API 프록시 라우트
- `artifacts/api-server/src/routes/health.ts` — 헬스체크 엔드포인트
- `lib/api-client-react/src/generated/` — Orval 자동 생성 파일 (직접 수정 금지)
- `artifacts/mockup-sandbox/` — React 컴포넌트 목업 프리뷰 서버

## Architecture decisions

- **KTO API 서버사이드 프록시**: 브라우저 Expo 웹 빌드에서 CORS 문제 발생 + serviceKey 노출 방지 → Express 서버가 중계. 클라이언트는 `/api/kto?path=<endpoint>&<params>` 형태로 호출
- **Orval 코드젠**: OpenAPI spec을 소스 오브 트루스로 두고, React Query hooks + Zod 스키마를 자동 생성. 프론트-백엔드 타입 드리프트 방지
- **방문 집중률 실시간 아님**: 한국관광공사 방문 집중률 예측 데이터를 상대 지표로 활용. 실시간 인파 의존도 낮춤

## Product

- **레퍼런스 카드 선택** → 장면 태그 변환 → 공공데이터 6종 결합 → 추천 카드 3개(장면 최적 / 같은 장면 대안 / 날씨 맞춤 대안) → 지도앱 연결
- 강원 이색 장면 후보 58개 자체 정리, 1차 추천 풀 43개

## Gotchas

- `EXPO_PUBLIC_KTO_SERVICE_KEY` 환경변수 없으면 `/api/kto` 500 반환
- Orval 코드젠 후 생성 파일 직접 수정 금지 — `pnpm --filter @workspace/api-spec run codegen` 재실행하면 덮어씀

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
