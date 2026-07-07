# API / 빌드 / 테스트 점검 결과

## 확인 완료

- OpenRouter API 키 파일 존재: `SEND_TO_BACKEND/.env`
- 키 변수명: `OPENROUTER_API_KEY`
- 키 값은 최종 답변과 문서에 노출하지 않음
- API 호출 코드는 `openRouterCourseLlm.ts`에서 `.env`를 자동 로드하도록 구현
- 사용 모델 기본값: `openai/gpt-4o-mini`
- OpenRouter baseURL: `https://openrouter.ai/api/v1`

## 실행 결과

```bash
cd SEND_TO_BACKEND
npm run build
# 성공

npm test
# All GOAT recommendation engine tests passed.

node dist/examples/finalServiceFlow.demo.js
# 1차 추천 카드 + 선택 장소 기반 하루 코스 생성 성공
```

## 라이브 API 점검 결과

샌드박스에서 OpenRouter healthcheck를 시도했지만, 외부 네트워크 요청이 `fetch failed`로 실패했다.
따라서 현재 환경에서는 실제 OpenRouter 응답까지는 검증하지 못했다.

해석:

- 코드 컴파일, 키 로드, 프롬프트 생성, JSON 파싱 경로는 확인됨
- 라이브 API 응답 성공 여부는 로컬 PC 또는 배포 서버에서 다시 확인 필요
- 로컬에서 확인할 때는 `forceRuleBasedFallback`을 끄고 `createGoatDayCourse()`를 실행하면 됨

## 실제 서버에서 필요한 환경변수

```env
OPENROUTER_API_KEY=사용자 OpenRouter 키
VISITKOREA_SERVICE_KEY=한국관광콘텐츠랩 OpenAPI 서비스키
KAKAO_REST_API_KEY=카카오 REST API 키 또는 정적 지도용 앱 키
```
