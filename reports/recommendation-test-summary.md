# 추천 엔진 테스트 요약

- 생성 시각: 2026-07-21T07:28:15.722Z
- 실행 프로필: ACTUAL_UI_7_MOOD_ENTRYPOINTS
- 실제 UI 진입 레퍼런스: REF_SEA_02, REF_JP_02, REF_ALPS_01, REF_NATURE_01, REF_RETRO_01, REF_ARCH_01, REF_RESORT_02
- 전체 Cartesian 조합: 65,856건
- 외부 API 호출: 0건 (순수 1차 추천 엔진 단위 테스트)
- 무작위 점수/무작위 순환: 사용하지 않음

## 도달성

- 운영 장소: 61
- REACHABLE: 60
- CONDITIONALLY_REACHABLE: 1
- UNREACHABLE: 0
- 카드 1/2/3 고유 장소: 38 / 58 / 60
- 최초 추천만 고유 장소: 60
- 다시 추천 포함 고유 장소: 61
- 다시 추천으로 새롭게 노출(콜드 스타트 기준): 1개 (GOAT-008)
- 최근 노출 상태에서 다시 추천으로 새롭게 노출: 1개 (GOAT-022)
- 신규 7개 도달: 7/7
- 좌표 보유: 61/61

GOAT-058 고석정 꽃밭은 확인된 2026-05-15~2026-06-14 운영일에만 자격을 얻으므로 CONDITIONALLY_REACHABLE입니다. 최초 재현 조건의 currentDate는 2026-05-20입니다.

## 노출 분포

- 최소: 208회 (GOAT-022 매봉산 바람의 언덕)
- 최대: 8,468회 (GOAT-036 묵호항 일대)
- 평균: 3238.82회
- 중앙값: 2,912회
- 모집단 표준편차: 2044.50회
- Top 5 점유율: 19.4809%
- 신규 7개 총 추천 횟수: 20,172회
- 변동계수: 0.6312
- Gini: 0.3524
- 최대/최소: 40.71배

## 조건 축별 고유 추천 장소 수

- 테마별: 건축·전시·랜드마크 무드=49, 레트로·시장·항구 무드=49, 바다·해안 무드=42, 숲·정원·자연휴식 무드=38, 알프스·고원·목장 무드=49, 일본 소도시·골목 무드=45, 휴양·카페·이국공간 무드=45
- 목적별: 사진·포토스팟=51, 산책·힐링=50, 카페·실내휴식=50, 전시·건축관람=52, 체험·액티비티=51, 먹거리·야간탐방=53, 숙소·리조트=52
- 이동수단별: 자차=61, 대중교통=61, 도보중심=60
- 계절별: 봄=59, 여름=60, 가을=55, 겨울=57
- 출발지별: none=61, seoul=61, chuncheon=61, wonju=61, gangneung=61, sokcho=60, pyeongchang=61

## 대규모 자동 테스트 집계

| 항목 | 실제 집계 |
|---|---:|
| 전체 테스트 수 | 65,856 |
| 성공 / 실패 | 65,856 / 0 |
| 카드 3개 반환 실패 | 0 |
| 장소 중복 결과 | 0 |
| NaN / Infinity / undefined 필수 점수 값 | 0 / 0 / 0 |
| 정의 범위 초과 점수 값 | 0 |
| CARD3_PURPOSE_FALLBACK | 1408 |
| 카드 1 테마 불일치(허용 fallback 포함) | 4640 |
| 같은 테마 후보가 있는데 카드 1 불일치 | 0 |
| 목적 일치 후보가 있는데 fallback | 0 |
| 좌표 누락 카드 appearance / 고유 장소 | 0 / 0 |
| 이미지 누락 카드 appearance / 고유 장소 | 197,568 / 61 |
| 추천 / 미추천 장소 | 61 / 0 |
| 신규 7개 추천 장소 | 7 |
| 카드 1 고유 / 총 appearance | 38 / 65,856 |
| 카드 2 고유 / 총 appearance | 58 / 65,856 |
| 카드 3 고유 / 총 appearance | 60 / 65,856 |

카운터는 각 실제 recommendGoatPlaces 반환을 검사해 누적했습니다. NaN/Infinity/undefined/범위 초과는 반환 카드의 필수 numeric score leaf 값 단위이며, 누락 좌표·이미지는 반환 카드 appearance 단위입니다. 이미지 필드는 현재 61개 scoring 데이터 모두 비어 있어 모든 appearance에서 누락으로 집계되며, 추천 성공 여부와는 분리된 전달/UI 자산 이슈입니다.

## CSV 컬럼 의미

- first_trigger_condition: Cartesian 순회 중 해당 장소를 처음 관측한 조건입니다. 최초 추천 상태만을 뜻하지 않으므로 retry=true일 수 있습니다.
- best_trigger_condition: 해당 장소가 최대 selectionScore를 기록한 조건입니다.
- best_rank: 모든 appearance에서 관측한 최소 카드 순위(1이 최상)이며, best_trigger_condition의 순위와는 독립입니다.
- max_score: best_trigger_condition에서의 최대 selectionScore입니다.

## 실제 점수식

| 항목 | 점수/정책 |
|---|---|
| primaryTheme | 일치 +18 |
| mood_tags | 1/2/3개 이상 +6/+12/+17 |
| sceneTags | 1/2개 이상 +5/+10 |
| place_type | baseScore 가산 없음, 동률 보조만 사용 |
| purpose_tags | 일치 +20 |
| accessibility | 상/중/하 +12/+7/+1 |
| season_tags | 현재 계절 +13, 사계절 +10 |
| 출발지 근접 | 카드 2·3, 최대 +10 |
| 카드 1 연계 거리 | 카드 2·3, 최대 +10 |
| 장면 중복 | 카드 2, 최대 -6 |
| 최근 노출 | 카드 2·3, 최대 -5 |
| coverageBoost | 카드 2·3, +3 |
| lowExposureBoost | 카드 2·3, 최대 +3; 빈 이력 0 |
| best_time / companionType | 1차 점수 0 |

## 분류 메모

- 수정 전/후 모두 합산 61/61 도달이었으며, 도달성을 만들기 위한 random 점수는 추가하지 않았습니다.
- 수정은 출발지 민감도, explicit walk 우선, 고원·목장·산악 도보 추정 보수화, 빈 노출 이력 보정 오류, legacy breakdown 일치에 한정했습니다.
- 실서비스 /api/recommend-from-tags 라우트는 노출 repository 서비스와 연결되어 다시 추천 제외·누적 노출을 적용합니다. 현재 구현은 프로세스 메모리 저장소이므로 서버 재시작 시 기록이 유실됩니다.
