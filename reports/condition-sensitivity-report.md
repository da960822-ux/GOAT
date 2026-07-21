# 조건 변경 민감도 보고서

- 상태: PASS
- 방식: 한 번에 한 조건만 바꾸는 OFAT
- 후보: 운영 61개 전체
- 기준 입력: 바다·해안 무드 / 청량함 / 바다 / 사진·포토스팟 / 자차 / 혼자 / 여름 / 강릉
- 동행자 정책: 1차 추천 점수 미반영

| 변경 요인 | 추적 장소 | 관련 점수 전 → 후 | 순위 전 → 후 | 카드 전 | 카드 후 | 판정 |
|---|---|---:|---:|---|---|---|
| primaryTheme | GOAT-024 | theme 18 → 0 | 2 → 8 | GOAT-044 → GOAT-047 → GOAT-040 | GOAT-018 → GOAT-017 → GOAT-061 | PASS |
| mood_tags | GOAT-024 | mood 6 → 0 | 2 → 1 | GOAT-044 → GOAT-047 → GOAT-040 | GOAT-037 → GOAT-030 → GOAT-053 | PASS |
| sceneTags | GOAT-024 | scene 5 → 0 | 2 → 3 | GOAT-044 → GOAT-047 → GOAT-040 | GOAT-053 → GOAT-037 → GOAT-044 | PASS |
| travelPurpose | GOAT-024 | purpose 20 → 0 | 2 → 2 | GOAT-044 → GOAT-047 → GOAT-040 | GOAT-044 → GOAT-047 → GOAT-061 | PASS |
| transportType | GOAT-024 | accessibility 7 → 12 | 2 → 1 | GOAT-044 → GOAT-047 → GOAT-040 | GOAT-024 → GOAT-027 → GOAT-038 | PASS |
| companionType | 전체 | 점수 변경 false | 동일 | GOAT-044 → GOAT-047 → GOAT-040 | GOAT-044 → GOAT-047 → GOAT-040 | PASS(정책대로 미반영) |
| season | GOAT-041 | season 13 → 0 | 20 → 41 | GOAT-044 → GOAT-047 → GOAT-040 | GOAT-053 → GOAT-037 → GOAT-024 | PASS |
| departure | GOAT-024 | originDistanceBonus 8 → 2 | 2 → 6 | GOAT-044 → GOAT-047 → GOAT-040 | GOAT-044 → GOAT-047 → GOAT-038 | PASS |
| exposure history | GOAT-044 | exposurePenalty 0 → 1 | 6 → 8 | GOAT-044 → GOAT-047 → GOAT-040 | GOAT-044 → GOAT-047 → GOAT-053 | PASS |
| retry | 전체 | 직전 카드 중복 0 | - | GOAT-044 → GOAT-047 → GOAT-040 | GOAT-053 → GOAT-037 → GOAT-024 | PASS |

출발지는 카드 1 점수에는 적용하지 않고 카드 2·3의 originDistanceBonus에만 반영합니다. 카드 1 기준 연계 거리는 별도 routeDistanceBonus로 유지됩니다. 모든 계산은 결정적이며 random 점수를 사용하지 않습니다.
