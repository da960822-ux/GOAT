# GOAT FINAL AI/API RECOMMENDATION — Git Safe Edition

이 패키지는 GitHub push용으로 정리된 버전입니다. 실제 API 키가 들어간 `.env`, 빌드 결과물 `dist/`, 실행 로그 `logs/`, 임시 파일 `tmp/`는 제외했습니다.

먼저 `README_GIT_PUSH_RECORD.md`와 `SECURITY_API_KEYS.md`를 확인하세요.

---

# GOAT 백엔드·프론트엔드 전달 패키지 v1

> 목적: 지금까지 만든 GOAT 추천 엔진과 JSON 데이터를 **백엔드/프론트엔드가 바로 이해하고 사용할 수 있게** 폴더별로 정리한 핸드오프 문서입니다.

![백엔드 프론트 데이터 흐름](./assets/01_backend_frontend_flow.png)

---

## 0. 이 패키지에서 바로 보내면 되는 폴더

| 보낼 대상 | 폴더 | 보내는 이유 |
|---|---|---|
| 백엔드 | `SEND_TO_BACKEND/` | 추천 점수 계산 엔진, 장소 데이터, 레퍼런스 카드 데이터, 테스트 코드 포함 |
| 프론트엔드 | `SEND_TO_FRONTEND/` | 레퍼런스 카드 UI 데이터, 추천 결과 타입, 샘플 응답 포함 |
| 공통 참고 | `COMMON_REFERENCE/` | 태그/필드 뜻, 점수 기준, API 계약, 원본 기준 파일 정리 |

---

## 1. 최종 파일 구조

```txt
GOAT_FINAL_AI_API_RECOMMENDATION/
├─ README.md
├─ assets/
│  ├─ 01_backend_frontend_flow.png
│  ├─ 02_card_role_logic.png
│  └─ 03_data_field_map.png
├─ SEND_TO_BACKEND/
│  ├─ README_BACKEND_HANDOFF.md
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ src/
│  │  ├─ goatRecommendationEngine.ts
│  │  ├─ goatRecommendationTypes.ts
│  │  └─ index.ts
│  ├─ data/
│  │  ├─ goat_simplified_scoring_tags_v10_accessibility_merged.json
│  │  └─ goat_reference_cards_v2_balanced.json
│  ├─ examples/
│  │  ├─ demo.ts
│  │  └─ sampleRequests.json
│  └─ tests/
│     └─ recommendationEngine.spec.ts
├─ SEND_TO_FRONTEND/
│  ├─ README_FRONTEND_HANDOFF.md
│  ├─ data/
│  │  └─ goat_reference_cards_v2_balanced.json
│  ├─ types/
│  │  └─ goatFrontendRecommendationTypes.ts
│  └─ examples/
│     ├─ recommendation_result_sample.json
│     └─ reference_card_ui_sample.json
└─ COMMON_REFERENCE/
   ├─ README_DATA_DICTIONARY.md
   ├─ README_SCORE_AND_CARD_POLICY.md
   ├─ README_API_CONTRACT.md
   └─ source_files/
      └─ 원본 기준 파일들
```

---

## 2. 핵심 요약

GOAT GOAT 추천은 사용자가 고른 **테마 + 무드/장면 태그 3개 + 이동수단**을 기준으로 강원 장소 58개 중 1차 추천 카드 3개를 뽑고, 사용자가 카드 1개를 선택하면 **한국관광콘텐츠랩 OpenAPI 주변 후보 + OpenRouter LLM**으로 하루 코스를 만듭니다.

![추천 카드 역할](./assets/02_card_role_logic.png)

| 카드 | 역할 | 핵심 기준 |
|---|---|---|
| 1번 카드 | 최적 장면 카드 | 사용자가 고른 무드/장면에 가장 정직하게 맞는 장소 |
| 2번 카드 | 같은 무드 대안 카드 | 1번과 같은 무드 안에서 다른 대안 |
| 3번 카드 | 조건 맞춤 카드 | 이동수단, 계절, 1번 카드와의 연계거리가 좋은 장소 |


### 한국관광콘텐츠랩 OpenAPI 적용

2차 주변 후보 조회는 아무 관광 사이트 데이터를 붙이는 방식이 아니라, `https://api.visitkorea.or.kr` 기준 한국관광콘텐츠랩 OpenAPI를 사용한다. 코드에서는 국문 관광정보 서비스_GW의 위치기반 관광정보 조회(`locationBasedList2`)를 호출하도록 `SEND_TO_BACKEND/src/tourApiClient.ts`에 구현했다.


---

## 3. 현재 진짜 필요한 추가 데이터

현재 추천 점수 계산 자체는 이미 가능합니다. 다만 실제 화면과 거리 보정을 위해 아래 4개만 추가하면 됩니다.

| 우선순위 | 필드 | 지금 필요한 이유 |
|---:|---|---|
| 1 | `imageUrl` | 추천 카드 대표 이미지 표시 |
| 2 | `address` | 상세 카드 주소 표시, 지도앱 검색 연결 |
| 3 | `latitude` | 나중에 2번/3번 카드 거리 보정 |
| 4 | `longitude` | 나중에 2번/3번 카드 거리 보정 |

> 지금 당장 채울 값은 `imageUrl`, `address`입니다.  
> 거리 보정까지 할 때 `latitude`, `longitude`를 나중에 채우면 됩니다.

---

## 4. 백엔드가 봐야 할 문서

백엔드는 아래 순서대로 보면 됩니다.

1. `SEND_TO_BACKEND/README_BACKEND_HANDOFF.md`
2. `COMMON_REFERENCE/README_API_CONTRACT.md`
3. `COMMON_REFERENCE/README_SCORE_AND_CARD_POLICY.md`
4. `COMMON_REFERENCE/README_DATA_DICTIONARY.md`

백엔드 핵심 작업은 **프론트 요청값을 받아 `recommendGoatPlaces()`를 실행하고 결과를 그대로 API 응답으로 내려주는 것**입니다.

---

## 5. 프론트엔드가 봐야 할 문서

프론트엔드는 아래 순서대로 보면 됩니다.

1. `SEND_TO_FRONTEND/README_FRONTEND_HANDOFF.md`
2. `SEND_TO_FRONTEND/examples/reference_card_ui_sample.json`
3. `SEND_TO_FRONTEND/examples/recommendation_result_sample.json`
4. `COMMON_REFERENCE/README_DATA_DICTIONARY.md`

프론트 핵심 작업은 **레퍼런스 카드 21개를 화면에 보여주고, 사용자가 고른 `referenceCardId`와 조건값을 백엔드로 보내는 것**입니다.

---

## 6. 근거 파일

이 패키지는 아래 파일 기준으로 정리했습니다.

| 기준 파일 | 사용 목적 |
|---|---|
| `goat_simplified_scoring_tags_v10_accessibility_merged.json` | 58개 장소와 점수 계산용 태그 기준 |
| `goat_reference_cards_v2_balanced.json` | 프론트 레퍼런스 카드 21개와 후보 연결 기준 |
| `점수 산정 방식(기준).txt` | 90점 baseScore + 10점 거리 보정 기준 |
| `goatRecommendationEngine.ts` | 실제 추천 엔진 구현 코드 |
| `README_GOAT_RECOMMENDATION_ENGINE.md` | 기존 추천 엔진 설명서 |


## 2026-07-02 추천 엔진 정리 사항

- 실제 서비스 기준 추천 엔진은 `SEND_TO_BACKEND/src/goatRecommendationEngine.ts` 하나로 고정했습니다.
- 사용하지 않는 legacy 엔진(`v13Engine.ts`)은 패키지에 포함하지 않고, `index.ts`에서도 export하지 않습니다.
- 카드3 조건맞춤에서 `travelPurpose`와 `purpose_tags`가 일치하는 후보가 0개면 카드 3개 보장을 위해 fallback하되, `CARD3_PURPOSE_FALLBACK` warning을 응답에 포함하고, 추천 엔진이 기본적으로 `[GOAT_RECOMMENDATION_WARNING]` 서버 로그를 자동 출력하도록 했습니다. JSONL 로그 파일은 기본 `logs/goat-recommendation-warnings.jsonl`에 자동 기록됩니다. `warningLogFilePath` 또는 `GOAT_RECOMMENDATION_LOG_FILE`로 경로를 바꿀 수 있습니다.

## 2026-07-02 추가 수정: warning 로그 상세 추적

`CARD3_PURPOSE_FALLBACK` 발생 시 로그에는 이제 단순 warning 코드만 남기지 않고, 아래 정보를 함께 기록한다.

- `warnings[].details.reason`: fallback이 발생한 직접 이유
- `warnings[].details.strictPurposePoolSize`: 카드3에서 여행 목적과 일치한 후보 수
- `warnings[].details.fallbackPoolSize`: fallback 후 사용한 후보 수
- `decisionAudit.fallback`: fallback 사용 여부, 이유, 목적값, 후보 수
- `decisionAudit.cardSelections[]`: 1번/2번/3번 카드 각각의 선택 이유
- `decisionAudit.cardSelections[].scoreSummary`: moodScore, conditionScore, baseScore, routeDistanceBonus, duplicatePenalty, exposurePenalty, coverageBoost, lowExposureBoost, selectionScore, displayScore
- `decisionAudit.cardSelections[].scoreDetails`: 테마, mood_tags, sceneTags, purpose_tags, accessibility, season_tags 세부 매칭 결과와 점수
- `decisionAudit.cardSelections[].reasons`: 프론트 카드에 표시 가능한 추천 이유 문장

따라서 서버 로그 또는 `logs/goat-recommendation-warnings.jsonl`만 확인해도 “왜 fallback이 발생했는지”와 “각 카드가 왜 뽑혔는지”를 추적할 수 있다.


## 2026-07-02 추가 수정: 재노출 방지 서비스 레이어 연결

이번 버전은 엔진 내부에만 있던 재노출 방지 보정을 실제 서비스 흐름에 연결했다.

- `src/recommendationService.ts` 추가
- `src/recommendationExposureRepository.ts` 추가
- `rerollOfRequestId` 기반 직전 카드 3개 강제 제외
- `recentExposureByPlaceId`, `totalExposureByPlaceId`, `themeAverageExposure`를 엔진에 자동 전달
- 추천 결과 카드 3개를 노출 로그로 저장
- 테스트에서 다시 추천 제외와 exposurePenalty 반영 확인

최종 ZIP 기준 테스트 명령:

```bash
cd SEND_TO_BACKEND
npm test
```

결과:

```txt
All GOAT recommendation engine tests passed.
```
