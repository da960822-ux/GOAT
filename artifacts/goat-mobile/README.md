# GOAT mobile

프론트는 `EXPO_PUBLIC_API_BASE_URL`에 지정된 Express 서버를 호출합니다. 이 값은 공개 서버 주소이며 비밀키가 아닙니다.

백엔드 API 요청·응답과 오류 코드는 `docs/frontend-api-handoff.md`에 정리되어 있습니다.

## 웹에서 실행

저장소 루트에서 PowerShell 창 두 개를 엽니다.

첫 번째 창:

```powershell
corepack pnpm@10.15.1 --filter @workspace/api-server run build
$env:PORT = "3000"
corepack pnpm@10.15.1 --filter @workspace/api-server run start
```

두 번째 창:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL = "http://localhost:3000"
corepack pnpm@10.15.1 --filter @workspace/goat-mobile exec expo start --web --port 8081
```

브라우저에서 `http://localhost:8081`을 열고 감성 선택 → 여행 조건 → 추천 결과 → 장소 상세 흐름을 확인합니다.

감성 선택 화면은 백엔드의 `GET /api/moods`에서 팀원 검증 조합 12개를 받아 표시합니다.
동행자·교통수단·방문시간·여행목적은 v1.3+ 추천 점수에 반영되며 위치는 현재 추천 점수에 사용하지 않습니다.

## Android에서 실행

실제 휴대폰에서는 `localhost`가 휴대폰 자체를 의미하므로 PC의 같은 Wi-Fi 내부 IP를 사용합니다.

```powershell
$env:EXPO_PUBLIC_API_BASE_URL = "http://192.168.x.x:3000"
corepack pnpm@10.15.1 --filter @workspace/goat-mobile exec expo start
```

Android 에뮬레이터에서는 일반적으로 `http://10.0.2.2:3000`을 사용합니다. 배포 앱은 HTTPS API 주소를 사용해야 합니다.

## 검증

백엔드를 먼저 빌드한 후 프론트가 사용하는 실제 생성 클라이언트로 API 연결을 확인합니다.

```powershell
corepack pnpm@10.15.1 --filter @workspace/api-server run build
corepack pnpm@10.15.1 --filter @workspace/goat-mobile run verify:api-client
```

관광공사 키는 프론트에 넣지 않습니다. 서버의 `KTO_SERVICE_KEY`만 사용합니다.
