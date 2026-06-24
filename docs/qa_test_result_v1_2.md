# GOAT 추천 엔진 QA 결과 v1.2

## 실행 명령

```bash
npm install
npm run test:recommend
```

## 테스트 결과

총 13개 추천 케이스 기준으로 기대 Top3, pool 정책, candidatePoolSize, adaptive retry 여부를 검증한다.

| 케이스 | 기대 Top3 | pool | retry | 결과 |
|---|---|---|---|---|
| sea-road-sunset | GOAT-031, GOAT-044, GOAT-040 | ALL58 / 58 | false | PASS |
| japan-small-town | GOAT-029, GOAT-037, GOAT-032 | PRIMARY43 / 43 | false | PASS |
| alps-meadow | GOAT-017, GOAT-018, GOAT-019 | PRIMARY43 / 43 | false | PASS |
| ryokan-lodging | GOAT-007, GOAT-008, GOAT-033 | ALL58 / 58 | false | PASS |
| rainy-canyon | GOAT-058, GOAT-010, GOAT-057 | ALL58 / 58 | false | PASS |
| nordic-winter-forest | GOAT-012, GOAT-020, GOAT-024 | PRIMARY43 / 43 | false | PASS |
| retro-night-market | GOAT-043, GOAT-038, GOAT-035 | PRIMARY43 / 43 | false | PASS |
| plateau-stars | GOAT-030, GOAT-016, GOAT-023 | PRIMARY43 / 43 | false | PASS |
| bali-surf-beach | GOAT-044, GOAT-045, GOAT-047 | PRIMARY43 / 43 | false | PASS |
| europe-garden-church | GOAT-001, GOAT-013, GOAT-050 | PRIMARY43 / 43 | false | PASS |
| lake-reflection-sns | GOAT-014, GOAT-036, GOAT-040 | PRIMARY43 / 43 | false | PASS |
| japanese-retro-cafe | GOAT-042, GOAT-054, GOAT-006 | PRIMARY43 / 43 | false | PASS |
| abstract-mood-only | GOAT-044, GOAT-031, GOAT-012 | ALL58 / 58 | true | PASS |

## 핵심 확인 사항

- 기존 데모 케이스 5개는 유지했다.
- 태그 조합 커버리지를 13개 케이스로 확장했다.
- `청량함 + 이국적`처럼 추상 무드만 들어온 케이스도 fallback으로 떨어지지 않고 moodExpansion과 ALL58 재시도로 추천된다.
- `candidatePoolSize`가 43 또는 58로 달라지는 것은 정상이다.
