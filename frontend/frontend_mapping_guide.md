# 프론트 추천 카드 매핑 가이드 v1.3_api_first_fallback

## 기준

- 장소 후보는 삭제하지 않고 58개 전체를 seed pool로 유지한다.
- 실제 추천 계산 후보 수는 조건에 따라 58개 또는 43개가 될 수 있다.
- 프론트는 `resultData.recommendations` 배열만 우선 믿고 카드 3개를 렌더링한다.
- 자유 태그 조합보다 검증된 레퍼런스 카드 조합을 우선 노출한다.
- `imageUrl`이 null이면 기본 이미지 또는 그라데이션 플레이스홀더를 사용한다.
- `latitude/longitude`가 없으므로 지도 연결은 `mapSearchQuery` 검색어 기반으로 처리한다.


## v1.3 dataSource QA 필드

- `dataSourceRequested`: 요청한 데이터 소스 모드. `api-first`, `seed-first`, `seed-only` 중 하나.
- `dataSourceUsed`: 실제 사용된 데이터. `api`, `seed-fallback`, `seed`, `mock-fallback` 중 하나.
- `apiQuality`: OpenAPI 후보 품질 평가 결과. 사용자 화면보다는 QA/디버그 화면에서만 표시한다.
- `dataSourceUsed === "api"`: API 후보가 실제 추천 카드로 변환되어 내려온 상태다.
- `dataSourceUsed === "seed-fallback"`: API 후보가 부족하거나 점수/표시 데이터가 약해서 seed 추천으로 대체된 정상 fallback 상태다.

## pool 관련 필드

- `seedPoolSize`: 전체 후보 수. 정상 데이터라면 58.
- `candidatePoolSize`: 실제 추천 계산에 사용한 후보 수. 58 또는 43 가능.
- `poolPolicy`: `ALL58` 또는 `PRIMARY43`.
- `poolReason`: 해당 pool이 선택된 이유.
- `adaptivePoolRetryUsed`: PRIMARY43 결과가 약해서 ALL58로 재시도했는지 여부.

프론트에서는 이 값들을 사용자에게 크게 보여줄 필요는 없다. 다만 개발/QA 화면에서 작게 확인 가능하게 두면 좋다. `adaptivePoolRetryUsed`가 true여도 오류가 아니라 후보 보강이 정상 동작한 것이다.

## 카드 화면 필드

- 라벨: `cardLabel`
- 장소명: `name`
- 지역: `city`, `regionGroup`
- 점수: `score`
- 추천 이유: `reason`
- 포토포인트: `photoPoint`
- 태그: `matchedTags`
- 상태 라벨: `dataStatusLabel`
- 계절/시간: `bestSeason`, `bestTime`
- 안전: `safetyNotes`
- 지도 검색: `mapSearchQuery`

## dataStatus 표시 기준

- `confirmed`: 별도 강조 없음 또는 “검증 완료”
- `future_candidate`: “후보 장소 · 방문 전 확인 권장” 작은 배지
- `needs_verification`: “운영 확인 필요” 작은 배지

## API 실패 처리

- `status === "FAILED"`: 재시도 화면.
- `resultData.fallbackUsed === true`: “일치도가 낮아 기본 추천을 보여드려요” 안내.
- `resultData.dataSourceUsed === "seed-fallback"`: API-first 요청이었지만 OpenAPI 후보 품질이 낮아 seed 추천으로 대체된 정상 상태.
- `resultData.apiQuality?.fallbackReason`: QA 화면에서 API fallback 원인 확인.
- `resultData.candidatePoolSize === 43`: 정상이다. 일반 방문지 추천에서는 조건부 43개 pool이 사용될 수 있다.
- `resultData.seedPoolSize !== 58`: 데이터 반영 문제로 보고 백엔드/DB 담당에게 확인 요청.


## 태그 선택 UI 기준

프론트에서 사용자에게 태그를 전부 자유 조합하게 만들면 후보가 부족한 조합이 생긴다. MVP에서는 아래처럼 검증된 레퍼런스 카드 중심으로 노출한다.

- 캘리포니아 해안도로 컷
- 일본 소도시 철길 컷
- 알프스 목장 컷
- 교토 료칸 숙소 컷
- 흐린 날 협곡·주상절리 컷
- 북유럽 겨울 숲 컷
- 레트로 야간 시장 컷
- 몽골 고원 별보기 컷
- 발리 서핑 해변 컷
- 유럽 정원·성당 컷
- 호수 반영 SNS 컷
- 일본 레트로 카페 컷

단독 선택을 피할 태그는 `꽃밭`, `폐광`, `산`, `호수`, `발리`, `산토리니`, `이국적`, `청량함`, `낭만적`, `탁트임`, `도시적`이다. 이 태그들은 반드시 다른 장면 태그와 묶어서 사용한다.
