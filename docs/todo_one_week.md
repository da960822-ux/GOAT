# 일주일 긴급 작업표 v1.3_api_first_fallback

## D-7 ~ D-6

- 58개 전체 후보 DB seed 반영.
- `seedPoolSize: 58` 유지 확인.
- 백엔드 추천 로직에 `poolMode: auto | all58 | primary43` 연결.
- 태그 사전 노이즈 제거 확인: `1번`, `6월`, `오는`은 표시/계산 태그에서 제외.
- 프론트 mock 응답을 v1.3 구조로 교체. `dataSourceRequested`, `dataSourceUsed`, `apiQuality` 포함 확인.

## D-5

- 추천 테스트 케이스 13개 실행.
- 각 케이스의 Top3 결과, poolPolicy, candidatePoolSize, adaptivePoolRetryUsed 확인.
- `candidatePoolSize` 확인:
  - 바다/해안도로: 58 / `ALL58`
  - 일본 소도시: 43 / `PRIMARY43`
  - 알프스 목장: 43 / `PRIMARY43`
  - 료칸 숙소: 58 / `ALL58`
  - 흐린 날 협곡: 58 / `ALL58`
  - 북유럽 숲, 레트로 시장, 고원 별보기, 발리 서핑, 유럽 정원, 호수 반영, 일본 레트로 카페 케이스 추가 확인
  - 추상 무드-only 케이스: 58 / `ALL58`, `adaptivePoolRetryUsed: true`

## D-4

- 프론트 카드 화면에서 `dataStatusLabel`, `imageUrl: null`, `mapSearchQuery` 처리 확인.
- `poolPolicy`, `candidatePoolSize`, `adaptivePoolRetryUsed`, `dataSourceUsed`, `apiQuality.fallbackReason`을 QA용으로 확인할 수 있게 처리.

## D-3

- 실제 API 연동.
- OpenAPI 후보 품질 통과 시 API 후보 카드가 실제 `recommendations`에 들어오는지 확인.
- OpenAPI 후보 품질 실패 시 `dataSourceUsed: "seed-fallback"`과 `apiQuality.fallbackReason`이 내려오는지 확인.
- API 실패 시 mock fallback 연결.
- 추천 카드 3개 렌더링, 상세 이동, 지도 검색 연결 확인.

## D-2 ~ D-1

- 시연 케이스 3개 + 실패/애매한 케이스 + 추상 무드-only 케이스 확인.
- 같은 도시 장소가 함께 나와도 이상 동작으로 보지 않도록 QA 기준 공유.
- 발표 문구에서 “58개 seed pool, 조건별 43개 1차 pool”로 정리.
