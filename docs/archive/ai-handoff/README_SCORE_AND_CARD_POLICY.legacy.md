# 공통 점수 기준과 추천 카드 정책

> 이 문서는 백엔드 추천 엔진이 어떤 기준으로 점수를 계산하고, 1번/2번/3번 카드를 어떻게 고르는지 설명합니다.

![추천 카드 역할](../assets/02_card_role_logic.png)

---

## 1. 전체 점수 구조

```txt
baseScore = 방문 무드 매칭 45점 + 방문 조건 적합도 45점
routeDistanceBonus = 1번 카드 기준 거리 보너스 최대 10점
```

1번 카드는 `baseScore`만 봅니다.  
2번/3번 카드는 `baseScore + routeDistanceBonus`와 노출/중복 보정을 함께 봅니다.

---

## 2. 방문 무드 매칭 45점

| 항목 | 점수 | 설명 |
|---|---:|---|
| `primaryTheme` 일치 | 18점 | 사용자가 고른 테마와 장소 테마가 같으면 부여 |
| `mood_tags` 1개 일치 | 6점 | 감성 태그 1개 일치 |
| `mood_tags` 2개 일치 | 12점 | 감성 태그 2개 일치 |
| `mood_tags` 3개 이상 일치 | 17점 | 감성 태그 3개 이상 일치 |
| `sceneTags` 1개 일치 | 5점 | 장면 태그 1개 일치 |
| `sceneTags` 2개 이상 일치 | 10점 | 장면 태그 2개 이상 일치 |

`place_type`은 직접 점수에 더하지 않습니다.  
동점이거나 장면 태그가 부족할 때 보조 힌트로만 씁니다.

---

## 3. 방문 조건 적합도 45점

`best_time`/`visitTime`은 점수 계산에서 제외합니다. 방문 조건 점수는 여행 목적, 이동수단 접근성, 계절 적합도만 사용합니다.

| 항목 | 점수 | 설명 |
|---|---:|---|
| `travelPurpose`가 장소 `purpose_tags`에 있음 | 18점 | 사용 목적과 장소 성격 일치 |
| 접근성 `상` | 15점 | 선택 이동수단 접근성 좋음 |
| 접근성 `중` | 9점 | 선택 이동수단 접근성 보통 |
| 접근성 `하` | 1점 | 선택 이동수단 접근성 낮음 |
| 현재 계절 포함 | 12점 | 현재 계절이 `season_tags`에 있음 |
| 사계절 포함 | 10점 | 특정 계절은 아니지만 사계절 가능 |

---

## 4. 거리 보정 10점

거리 보정은 지금 필수값이 아닙니다.  
현재 좌표가 없으면 0점으로 처리합니다.

| 1번 카드 기준 거리 | 보너스 |
|---|---:|
| 5km 이하 | 10점 |
| 10km 이하 | 8점 |
| 20km 이하 | 6점 |
| 40km 이하 | 4점 |
| 70km 이하 | 2점 |
| 그 외 | 0점 |

백엔드는 나중에 둘 중 하나를 넣으면 됩니다.

```ts
routeDistanceKmByPlaceId: {
  "GOAT-025": 0,
  "GOAT-028": 12.4
}
```

또는 장소 데이터에:

```json
{
  "latitude": 37.123,
  "longitude": 128.123
}
```

---

## 5. 1번 카드: 최적 장면 카드

| 기준 | 내용 |
|---|---|
| 후보 | `primaryTheme`이 사용자의 선택 테마와 같은 장소 우선 |
| 정렬 | `baseScore` 1위 |
| 거리 보정 | 적용하지 않음 |
| 노출 보정 | 적용하지 않음 |
| 목적 | 사용자가 고른 무드에 가장 정직하게 맞는 장소 |

---

## 6. 2번 카드: 같은 무드 대안 카드

| 기준 | 내용 |
|---|---|
| 후보 | 1번과 같은 `primaryTheme` 후보 우선 |
| 제외 | 1번과 같은 장소 제외 |
| 허용 | 같은 `city`는 허용 |
| 중복 방지 | `sceneTags`와 `place_type`이 너무 비슷하면 페널티 |
| 보정 | 거리 보너스, 최근 노출 페널티, coverageBoost, lowExposureBoost 적용 |
| 교체 규칙 | 1위 후보와 8점 이내면 더 가까운 후보/덜 노출된 후보로 교체 가능 |

---

## 7. 3번 카드: 조건 맞춤 카드

| 기준 | 내용 |
|---|---|
| 후보 | 전체 장소 가능 |
| 우선순위 | `travelPurpose`, `season_tags`, `accessibility` 점수가 높은 후보 |
| 테마 | `primaryTheme`이 달라도 가능 |
| 제외 | `travelPurpose`가 있으면 `purpose_tags` 일치 후보 우선. 단, 일치 후보가 0개면 카드 3개 보장을 위해 fallback |
| 보정 | 거리 보너스, 노출 보정 적용 |
| fallback 기록 | 카드3에서 목적 일치 후보가 0개면 `CARD3_PURPOSE_FALLBACK` warning을 응답에 포함하고, 엔진이 `[GOAT_RECOMMENDATION_WARNING]` 서버 로그를 자동 출력. JSONL 로그 파일은 기본 `logs/goat-recommendation-warnings.jsonl`에 자동 저장 |


---

## 8. 노출 보정

58개 장소가 고르게 추천되도록 2번/3번 카드에만 보정합니다.

| 보정 | 점수 | 설명 |
|---|---:|---|
| `recentExposurePenalty` | 최대 -5점 | 최근 많이 나온 장소는 살짝 낮춤 |
| `coverageBoost` | +3점 | 선택 reference card의 coveragePlaceIds에 포함된 장소 보정 |
| `lowExposureBoost` | +1~3점 | 전체 노출이 평균보다 낮은 장소 보정 |

1번 카드는 무조건 정직한 점수 1위여야 하므로 노출 보정을 넣지 않습니다.

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


## 2026-07-02 추가: 재노출 방지 정책 확정

재노출 방지는 두 단계로 처리한다.

| 단계 | 처리 방식 | 목적 |
|---|---|---|
| 강제 제외 | `rerollOfRequestId`의 직전 카드 3개를 `excludePlaceIds`로 전달 | 다시 추천 시 방금 본 카드 재등장 방지 |
| 점수 보정 | `recentExposureByPlaceId`, `totalExposureByPlaceId`, `themeAverageExposure` 전달 | 최근/전체 반복 노출을 줄이고 덜 나온 장소 보정 |

엔진 내부 점수식은 기존과 동일하다.

```txt
selectionScore = baseScore + routeDistanceBonus - duplicatePenalty - exposurePenalty + coverageBoost + lowExposureBoost
```

단, `recommendationService.ts`가 노출 통계를 실제로 조회해서 엔진에 넘기도록 추가되었으므로, 서비스 레이어를 사용하면 `다시 추천`과 반복 노출 보정이 실제 작동한다.
