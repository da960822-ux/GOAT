# GOAT 개발 환경 메모

이 파일은 과거 Replit 설정 문서를 대체하는 호환성 메모입니다. 현재 프로젝트의 기준 문서는 루트 [README.md](README.md), [GOAT_TEAM_HANDOFF.md](GOAT_TEAM_HANDOFF.md), [GOAT_TEST_COMMANDS.md](GOAT_TEST_COMMANDS.md)입니다.

## 현재 기준

- 운영 추천 데이터: 61곳
- 기본 API 포트: `GOAT.env`의 `PORT` (샘플과 통합 실행 기본값 `3000`)
- 기본 Expo Web 포트: `8081`
- KTO 키: 서버 전용 `KTO_SERVICE_KEY`; 클라이언트용 `EXPO_PUBLIC_KTO_SERVICE_KEY`를 사용하지 않음
- 패키지 관리자: `corepack pnpm` 11.8.0

## 실행

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm run dev:web
```

백엔드만 실행하려면 다음을 사용합니다.

```bash
corepack pnpm --filter @workspace/api-server run dev
```

비밀값은 프로젝트 루트의 `GOAT.env`에만 두며 저장소·빌드 산출물·로그에 포함하지 않습니다. 실제 배포 시에는 개발용 키 교체, Kakao 허용 도메인 등록, HTTPS API 주소 설정이 필요합니다.
