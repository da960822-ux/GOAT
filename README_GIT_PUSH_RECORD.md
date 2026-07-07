# GOAT Git Push 기록용 패키지

이 폴더는 백엔드/프론트엔드 전달과 GitHub push 기록을 위한 **Git-safe 완성본**입니다.

## 포함된 것

- `SEND_TO_BACKEND/` : 태그 기반 추천 점수 산정 로직, 한국관광콘텐츠랩 OpenAPI 연동 클라이언트, OpenRouter LLM 코스 추천 프롬프트/호출 로직
- `SEND_TO_FRONTEND/` : 프론트 전달용 응답 타입, 샘플 JSON, UI 연동 참고 문서
- `COMMON_REFERENCE/` : 공통 API 계약, 데이터 사전, 점수/카드 정책, 최종 서비스 흐름 문서
- `assets/` : 백엔드/프론트 설명용 흐름 이미지
- `.gitignore` : API 키, `.env`, build 결과물, 로그 파일 제외 규칙
- `SEND_TO_BACKEND/.env.example` : 팀원이 직접 `.env`를 만들 때 참고하는 템플릿

## 포함하지 않은 것

- 실제 API 키가 들어간 `.env`
- `dist/` 빌드 결과물
- `logs/`, `tmp/` 실행 로그
- `node_modules/`

## 핵심 서비스 흐름

1. 사용자가 테마와 태그 3개를 선택한다.
2. 여행 조건에서 이동수단을 선택한다.
3. 태그 기반 점수 산정 로직이 추천카드 3개를 반환한다.
4. 사용자가 추천카드 1개를 선택한다.
5. 선택 장소 좌표 기준으로 한국관광콘텐츠랩 OpenAPI 국문 관광정보 서비스_GW 위치기반 관광정보를 조회한다.
6. 주변 후보를 OpenRouter `openai/gpt-4o-mini` LLM 프롬프트에 전달한다.
7. LLM이 동행자, 테마, 목적, 이동수단에 맞는 하루 코스를 JSON으로 반환한다.
8. 프론트는 Kakao StaticMap config와 하루 코스 데이터를 화면에 표시한다.

## GitHub에 올리기 전 확인

```bash
git status
```

아래 파일이 staged 목록에 있으면 안 됩니다.

```txt
.env
dist/
logs/
tmp/
node_modules/
```

## 로컬 실행

```bash
cd SEND_TO_BACKEND
cp .env.example .env
# .env에 실제 키 입력
npm run build
npm test
npm run demo:final
```

## Git push 예시

```bash
git init
git checkout -b ai-api-recommendation-final
git add .
git status
git commit -m "feat: complete GOAT AI API recommendation flow"
git remote add origin https://github.com/깃허브아이디/레포지토리명.git
git push -u origin ai-api-recommendation-final
```

이미 팀 레포에서 작업 중이면 `git init`과 `git remote add origin`은 생략하고, 브랜치 생성 후 push하면 됩니다.
