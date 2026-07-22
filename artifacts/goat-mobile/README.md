# GOAT mobile

## 실행

API 서버:

```powershell
corepack pnpm@10.15.1 --filter @workspace/api-server run build
$env:PORT = "3000"
corepack pnpm@10.15.1 --filter @workspace/api-server run start
```

모바일 웹:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL = "http://localhost:3000"
corepack pnpm@10.15.1 --filter @workspace/goat-mobile exec expo start --web --port 8081
```

## 검증

```powershell
pnpm typecheck
pnpm --filter @workspace/goat-mobile verify:v2-ui
pnpm --filter @workspace/goat-mobile verify:recommendation-flow
pnpm --filter @workspace/api-server verify
pnpm --filter @workspace/goat-mobile verify:api-client
```

## 화면 캡처

`output/playwright/current/`에 모든 라우트의 최신 웹 캡처를 저장한다. 파일 목록은 `SCREENSHOT_MANIFEST.md`에서 확인한다.
