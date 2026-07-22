# GOAT 사진 분석값 → 추천 엔진 연결 로직

## 0. 결론

사진으로 찾기는 추천 엔진을 새로 만들지 않는다.

AI Vision이 사진에서 `primaryThemeCandidates`, `mood_tags`, `sceneTags`를 만들고, 사용자가 추천된 메인 테마 3개 중 1개를 선택하면, `photoRecommendationAdapter.ts`가 그 값을 기존 추천 엔진 입력값으로 변환한다.

```txt
사진 업로드
→ AI Vision 분석 JSON 생성
→ 프론트가 primaryTheme 후보 3개 표시
→ 사용자가 primaryTheme 1개 선택
→ photoRecommendationAdapter가 RecommendRequest로 변환
→ recommendGoatPlaces 실행
→ 추천 카드 3개 반환
```

`best_time`/방문시간대는 점수 계산에서 제외한다. 기존 장소 데이터의 `bestTime` 출력값은 카드 표시 호환용으로만 남고, 점수에는 반영하지 않는다.

---

## 1. 이번에 추가한 파일

```txt
SEND_TO_BACKEND/src/photoRecommendationAdapter.ts
SEND_TO_BACKEND/prompts/photoVisionAnalysisPrompt.md
SEND_TO_BACKEND/examples/photoAnalysisRequest.sample.json
SEND_TO_BACKEND/examples/photoAnalysisToRecommendation.demo.ts
SEND_TO_BACKEND/README_PHOTO_AI_TO_RECOMMENDATION_HANDOFF.md
```

수정한 파일은 아래와 같다.

```txt
SEND_TO_BACKEND/src/index.ts
SEND_TO_BACKEND/src/goatRecommendationTypes.ts
SEND_TO_BACKEND/tests/recommendationEngine.spec.ts
SEND_TO_BACKEND/package.json
```

---

## 2. 역할 분리

| 단계 | 담당 | 해야 하는 일 | 산출물 |
|---|---|---|---|
| 1 | AI/API 추천 로직 | 사진 분석 프롬프트 작성 | AI 분석 JSON |
| 2 | 프론트 | AI가 추천한 메인 테마 3개 노출 | 테마 선택 UI |
| 3 | 프론트 | 사용자가 선택한 테마 + 여행 조건 전달 | photo recommendation request |
| 4 | 백엔드 | `recommendGoatPlacesFromPhotoAnalysis()` 호출 | 추천 결과 JSON |
| 5 | 추천 엔진 | 기존 점수 계산식으로 3카드 산정 | cards[3] |
| 6 | QA | 사진 10장 기준 예상 태그/추천 결과 비교 | QA 표 |

---

## 3. AI Vision 분석 JSON 형식

AI는 아래 형식으로만 반환한다.

```json
{
  "status": "DONE",
  "confidence": 0.86,
  "summary": "바다, 해안도로, 노을 분위기가 강한 사진입니다.",
  "mood_tags": ["캘리포니아감성", "로드트립감성", "청량함", "탁트임"],
  "sceneTags": ["바다", "해안도로", "해변", "노을"],
  "primaryThemeCandidates": [
    {
      "primaryTheme": "바다·해안 무드",
      "confidence": 0.91,
      "reason": "사진 안에 바다와 해안도로 장면이 뚜렷합니다.",
      "mood_tags": ["로드트립감성", "청량함"],
      "sceneTags": ["해안도로", "바다"]
    },
    {
      "primaryTheme": "휴양·카페·이국공간 무드",
      "confidence": 0.63,
      "reason": "밝은 색감과 휴양지 분위기가 있습니다."
    },
    {
      "primaryTheme": "레트로·시장·항구 무드",
      "confidence": 0.42,
      "reason": "항구나 로컬 해안 풍경으로도 해석될 수 있습니다."
    }
  ],
  "failReason": null
}
```

### 필수 필드

| 필드 | 필수 여부 | 설명 |
|---|---:|---|
| `status` | 필수 | `DONE`, `LOW_CONFIDENCE`, `NEEDS_REVIEW`, `FAILED` |
| `confidence` | 권장 | 전체 사진 분석 확신도. 0~1 |
| `mood_tags` | 필수 | 점수 계산용 무드 태그 |
| `sceneTags` | 필수 | 점수 계산용 장면 태그 |
| `primaryThemeCandidates` | 필수 | 프론트에 보여줄 메인 테마 후보 3개 |
| `summary` | 선택 | 화면 표시용. 점수 계산에는 사용하지 않음 |
| `failReason` | 선택 | 실패/낮은 확신도 이유 |

---

## 4. 사진 분석 로직

사진을 넣었을 때 AI는 실제 관광지명을 맞히려고 하지 않는다. 대신 사진 안의 시각 요소를 GOAT 표준 태그로 바꾼다.

```txt
1. 장면 객체 확인
   바다, 해변, 해안도로, 골목, 목장, 숲, 정원, 카페, 시장, 항구, 건축물 등을 본다.

2. 분위기 확인
   청량함, 탁트임, 조용함, 레트로, 휴양감, 이국적, 알프스감성, 일본소도시감성 등을 본다.

3. sceneTags 생성
   사진 안에 실제로 보이는 장소 장면을 2~5개로 정한다.

4. mood_tags 생성
   장면에서 느껴지는 감성 태그를 2~5개로 정한다.

5. primaryTheme 후보 3개 생성
   sceneTags + mood_tags 조합이 가장 가까운 GOAT 메인 테마를 1~3개 추천한다.

6. confidence 산정
   장면이 명확하면 높게, 인물/음식/텍스트/흐림/실내 일부만 보이면 낮게 준다.
```

예를 들어 사진에 바다, 해안도로, 노을이 보이면 다음처럼 분석된다.

```txt
sceneTags: 바다, 해안도로, 해변, 노을
mood_tags: 캘리포니아감성, 로드트립감성, 청량함, 탁트임
primaryThemeCandidates: 바다·해안 무드, 휴양·카페·이국공간 무드, 레트로·시장·항구 무드
```

---

## 5. 프론트가 백엔드에 보내는 값

사용자가 AI 추천 테마 3개 중 `바다·해안 무드`를 선택했다면 백엔드는 아래 값으로 호출한다.

```ts
recommendGoatPlacesFromPhotoAnalysis(
  {
    aiAnalysis,
    selectedPrimaryTheme: "바다·해안 무드",
    travelPurpose: "사진·포토스팟",
    transportType: "자차",
    currentMonth: 7,
    debug: true
  },
  placesDataset,
  referenceDataset
);
```

---

## 6. 추천 엔진에 실제로 들어가는 값

`photoRecommendationAdapter.ts`가 사진 분석 요청을 기존 추천 엔진 입력값으로 변환한다.

| 사진 분석/선택값 | 추천 엔진 입력값 | 점수 계산 사용 여부 |
|---|---|---:|
| 사용자가 선택한 AI 추천 테마 | `primaryTheme` | O |
| AI 공통 `mood_tags` | `userMoodTags` | O |
| 선택 테마 후보 내부 `mood_tags` | `userMoodTags`에 병합 | O |
| AI 공통 `sceneTags` | `userSceneTags` | O |
| 선택 테마 후보 내부 `sceneTags` | `userSceneTags`에 병합 | O |
| 여행목적 | `travelPurpose` | O |
| 이동수단 | `transportType` | O |
| 현재 월/계절 | `currentMonth` 또는 `currentSeason` | O |
| AI `summary` | debug/화면 표시용 | X |
| AI `reason` | 화면 표시용 | X |
| 방문시간대/best_time | 전달하지 않음 | X |

---

## 7. 점수 계산 흐름

기존 추천 엔진의 점수 계산식을 그대로 쓴다.

```txt
baseScore = 방문 무드 매칭 45점 + 방문 조건 적합도 45점
routeDistanceBonus = 1번 카드 기준 연계 거리 보너스 최대 10점
```

### 방문 무드 매칭 45점

```txt
primaryTheme 일치: 18점
mood_tags 일치: 최대 17점
sceneTags 일치: 최대 10점
```

### 방문 조건 적합도 45점

```txt
travelPurpose ↔ purpose_tags 일치: 18점
transportType ↔ accessibility 적합도: 최대 15점
currentMonth/currentSeason ↔ season_tags 적합도: 최대 12점
```

### 카드 역할

```txt
1번 카드: primaryTheme 일치 후보 중 baseScore 1위. 거리/노출 보정 없음.
2번 카드: 1번과 같은 primaryTheme 후보 우선. 1번 카드 기준 routeDistanceBonus 반영.
3번 카드: travelPurpose, season_tags, accessibility 점수가 높은 후보. 1번 카드 기준 routeDistanceBonus 반영.
```

---

## 8. fallback 기준

| 상황 | 처리 |
|---|---|
| AI `status`가 `FAILED` | warning을 남긴다. usable theme/tags가 있으면 추천은 계속 시도한다. |
| AI `status`가 `NEEDS_REVIEW` | warning을 남긴다. 프론트는 재업로드 안내 가능. |
| `confidence < 0.5` 또는 `LOW_CONFIDENCE` | `PHOTO_ANALYSIS_LOW_CONFIDENCE` warning을 남기고, 사용자가 선택한 테마와 여행 조건 중심으로 추천한다. |
| AI 테마 후보가 없음 | `PHOTO_ANALYSIS_NO_THEME_CANDIDATE` warning을 남기고, 전체 후보 fallback 가능. |
| 사용자가 선택한 테마가 AI 후보 3개 안에 없음 | AI 1순위 테마로 fallback한다. |
| mood_tags + sceneTags가 2개 미만 | `PHOTO_ANALYSIS_INSUFFICIENT_TAGS` warning을 남긴다. |
| 카드3 목적 일치 후보가 0개 | 기존 엔진의 `CARD3_PURPOSE_FALLBACK` warning을 남기고 전체 후보로 fallback한다. |

---

## 9. 백엔드 적용 위치

감성으로 찾기는 그대로 사용한다.

```ts
recommendGoatPlaces(request, placesDataset, referenceDataset)
```

사진으로 찾기만 아래 어댑터를 사용한다.

```ts
recommendGoatPlacesFromPhotoAnalysis(photoRequest, placesDataset, referenceDataset)
```

---

## 10. 테스트 완료 기준

아래 명령어가 통과하면 된다.

```bash
cd SEND_TO_BACKEND
npm test
npm run demo:photo
```

이번 수정본에서는 다음을 검증한다.

```txt
- 감성으로 찾기 기존 테스트 통과
- 사진으로 찾기: AI 분석값 → primaryTheme/userMoodTags/userSceneTags 변환 확인
- 사진으로 찾기: 추천 카드 3개 생성 확인
- LOW_CONFIDENCE 사진 분석 warning 확인
- 선택 테마가 후보 3개에 없을 때 fallback warning 확인
- 카드3 purpose fallback warning/log 확인
- 노출 보정 service 테스트 통과
```
