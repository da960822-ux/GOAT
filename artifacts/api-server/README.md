# API server

배포 전 보안, DB, 북마크, 이미지 분석 API 체크는 [`../../docs/deployment-security-data-design.md`](../../docs/deployment-security-data-design.md)를 확인하세요.

기존 Express + TypeScript 백엔드입니다.

추천 API는 팀원 v1.3+의 58개 장소와 검증된 12개 감성 조합을 사용합니다.
일반 추천은 PRIMARY43, 숙소·확장 장면은 ALL58로 계산하며 추천 결과는 총점 Top 3입니다.
한국관광공사 API는 추천 후보를 만들지 않고 추천된 장소의 사진·주소·상세정보를 보강합니다.

프론트 전달용 요청·응답 명세는 `docs/frontend-api-handoff.md`를 확인하세요.

## 환경 변수

- `PORT`: 서버 포트
- `CORS_ORIGINS`: 허용할 Origin의 쉼표 구분 목록. production에서는 필수이며 `*`는 허용하지 않습니다.
- `RECOMMEND_RATE_LIMIT_WINDOW_SECONDS`: `POST /recommend-from-tags` rate-limit 윈도우(기본값: `60`).
- `RECOMMEND_RATE_LIMIT_MAX`: 윈도우 안에서 client IP별 허용할 추천 요청 수(기본값: `30`).
- `KTO_SERVICE_KEY`: 한국관광공사 API 서버 전용 키

비밀키 값은 저장소에 기록하지 않습니다.

## 실행

```sh
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/api-server run build
PORT=3000 pnpm --filter @workspace/api-server run start
```

Windows PowerShell에서는 실행 전에 `$env:PORT = "3000"`을 설정하세요.

## 검증

```powershell
corepack pnpm --filter @workspace/api-server run typecheck
corepack pnpm --filter @workspace/api-server run build
corepack pnpm --filter @workspace/api-server run verify
```

`verify`는 58개 장소, 12개 감성, 감성별 기대 Top 3, 조건 점수, 제외 재추천,
400/404 응답을 확인합니다.
