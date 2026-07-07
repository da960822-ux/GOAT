# API 키 관리 기준

## 절대 Git에 올리지 않는 파일

```txt
.env
.env.local
.env.development
.env.production
```

## Git에 올려도 되는 파일

```txt
.env.example
```

`.env.example`에는 변수 이름만 넣고 실제 키는 비워둡니다.

## 실제 키를 넣는 위치

로컬 개발자는 각자 `SEND_TO_BACKEND/.env`를 만들고 아래 값을 직접 입력합니다.

```env
OPENROUTER_API_KEY=실제 OpenRouter 키
VISITKOREA_SERVICE_KEY=실제 한국관광콘텐츠랩 OpenAPI 키
KAKAO_JAVASCRIPT_KEY=실제 Kakao JavaScript 키
KAKAO_REST_API_KEY=실제 Kakao REST 키
```

배포 서버에서는 GitHub가 아니라 배포 서비스의 Environment Variables 또는 Secrets 메뉴에 등록합니다.

## 프론트엔드에 넣으면 안 되는 키

- `OPENROUTER_API_KEY`
- `VISITKOREA_SERVICE_KEY`
- `KAKAO_REST_API_KEY`

위 키들은 백엔드에서만 사용합니다. 프론트는 백엔드 API를 호출하고, 백엔드가 외부 API를 호출한 뒤 결과만 반환해야 합니다.

## 노출되었을 때 조치

1. 해당 API 키를 즉시 폐기하거나 재발급합니다.
2. `.env`를 Git 추적에서 제거합니다.
3. GitHub push 이력이 있다면 키는 이미 노출된 것으로 보고 재발급을 우선합니다.

```bash
git rm --cached .env
git commit -m "chore: remove env file from git"
git push
```
