# Backend Quickstart

## 1. 환경변수 설정

```bash
cp .env.example .env
```

`.env`에 실제 키를 입력합니다. `.env`는 `.gitignore`에 의해 Git에 올라가지 않습니다.

```env
OPENROUTER_API_KEY=
VISITKOREA_SERVICE_KEY=
KAKAO_JAVASCRIPT_KEY=
KAKAO_REST_API_KEY=
```

## 2. 빌드와 테스트

```bash
npm run build
npm test
npm run demo:final
```

## 3. 주요 파일

| 파일 | 역할 |
|---|---|
| `src/goatRecommendationEngine.ts` | 1차 추천카드 3개 점수 산정 |
| `src/courseRecommendationService.ts` | 선택 카드 기반 2차 하루 코스 생성 통합 |
| `src/tourApiClient.ts` | 한국관광콘텐츠랩 OpenAPI 위치기반 후보 조회 |
| `src/openRouterCourseLlm.ts` | OpenRouter GPT-4o mini LLM 프롬프트/호출 |
| `src/kakaoStaticMap.ts` | Kakao StaticMap 렌더링 config 생성 |
| `data/goat_simplified_scoring_tags_v10_accessibility_merged.json` | 실제 GOAT 58개 장소 DB/태그 |
| `examples/finalServiceFlow.demo.ts` | 최종 서비스 흐름 데모 |
