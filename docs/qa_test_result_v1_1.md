# 추천 엔진 QA 결과 v1.1_pool58_to_43

테스트 실행 기준: `recommendation_test_cases.json` 5개 케이스를 `poolMode: auto`로 실행.

| 케이스 | 기대 pool | 실제 pool | 기대 Top3 | 실제 Top3 | 결과 |
|---|---|---|---|---|---|
| 바다/해안도로 | ALL58 / 58 | ALL58 / 58 | GOAT-031, GOAT-044, GOAT-040 | GOAT-031, GOAT-044, GOAT-040 | PASS |
| 일본 소도시 | PRIMARY43 / 43 | PRIMARY43 / 43 | GOAT-029, GOAT-037, GOAT-032 | GOAT-029, GOAT-037, GOAT-032 | PASS |
| 알프스 목장 | PRIMARY43 / 43 | PRIMARY43 / 43 | GOAT-017, GOAT-018, GOAT-019 | GOAT-017, GOAT-018, GOAT-019 | PASS |
| 료칸 숙소 | ALL58 / 58 | ALL58 / 58 | GOAT-007, GOAT-008, GOAT-033 | GOAT-007, GOAT-008, GOAT-033 | PASS |
| 흐린 날 협곡 | ALL58 / 58 | ALL58 / 58 | GOAT-058, GOAT-010, GOAT-057 | GOAT-058, GOAT-010, GOAT-057 | PASS |

## 반영된 수정

- regionGroup 가중치를 강화해 고원권 요청에서 영서권 목장이 먼저 튀어나오던 문제를 수정했다.
- 숙소/료칸 의도 감지 시 비숙박 43개 pool로 좁히지 않고 58개 전체 pool을 사용하도록 수정했다.
- 같은 도시 최대 1개 제한을 제거해 GOAT-007/GOAT-008처럼 같은 도시의 같은 장면 대안도 노출될 수 있게 했다.
- 해안도로, 가마쿠라/철길, 목장/고원, 협곡/주상절리 장면별 보정 점수를 추가했다.
- `1번`, `6월`, `오는` 노이즈 태그를 검색 태그/태그 사전에서 제거했다.
- `seedPoolSize`와 `candidatePoolSize`를 분리해 58개 seed 보존과 조건별 43개 필터를 동시에 검증할 수 있게 했다.
