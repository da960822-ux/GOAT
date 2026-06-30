# GOAT 점수 추천 로직 / 추천 카드 엔진 v1

업로드된 `goat_simplified_scoring_tags_v10_accessibility_merged.json`, `goat_reference_cards_v2_balanced.json`, `점수 산정 방식(기준).txt` 기준으로 구현한 실제 서비스용 TypeScript 추천 엔진입니다.

## 1. 구현 범위

이 엔진은 사용자의 레퍼런스 카드 선택값 또는 AI 분석 태그를 받아 강원 장소 추천 카드 3개를 반환합니다.

- 1번 카드: **최적 장면 카드**
- 2번 카드: **같은 무드 대안 카드**
- 3번 카드: **조건 맞춤 카드**

반환값은 가이드북의 핵심 모듈 반환 표준에 맞춰 `status`, `resultType`, `score`, `message`, `resultData`, `failReason` 구조를 사용합니다.

## 2. 입력 데이터

### 필수 데이터

```ts
recommendGoatPlaces(request, placesDataset, referenceDataset)
```

- `placesDataset`: `goat_simplified_scoring_tags_v10_accessibility_merged.json`
- `referenceDataset`: `goat_reference_cards_v2_balanced.json`
- `request`: 사용자 선택값 또는 AI 분석 결과

### request 예시

```ts
{
  referenceCardId: "REF_SEA_02",
  travelPurpose: "사진·포토스팟",
  transportType: "자차",
  visitTime: "오후",
  currentMonth: 7,
  debug: true
}
```

레퍼런스 카드가 없으면 아래처럼 직접 태그를 넣어도 됩니다.

```ts
{
  primaryTheme: "알프스·고원·목장 무드",
  userMoodTags: ["몽골감성", "신비로움", "탁트임"],
  userSceneTags: ["고원", "별", "은하수"],
  travelPurpose: "사진·포토스팟",
  transportType: "자차",
  visitTime: "야간",
  currentMonth: 8
}
```

## 3. 점수 산정 방식

### baseScore = 90점

#### A. 방문 무드 매칭 45점

| 항목 | 점수 |
|---|---:|
| primaryTheme 일치 | 18점 |
| mood_tags 1개 일치 | 6점 |
| mood_tags 2개 일치 | 12점 |
| mood_tags 3개 이상 일치 | 17점 |
| sceneTags 1개 일치 | 5점 |
| sceneTags 2개 이상 일치 | 10점 |

`place_type`은 점수에 직접 더하지 않고, txt 기준대로 sceneTags가 부족하거나 동률일 때 보조 비교값으로만 사용합니다.

#### B. 방문 조건 적합도 45점

| 항목 | 점수 |
|---|---:|
| travelPurpose가 purpose_tags에 있음 | 16점 |
| 이동수단 접근성 상 | 12점 |
| 이동수단 접근성 중 | 7점 |
| 이동수단 접근성 하 | 1점 |
| 방문 시간대 정확히 일치 | 8점 |
| 방문 시간대 인접 | 4점 |
| 현재 계절 포함 | 9점 |
| 사계절 포함 | 7점 |

### routeDistanceBonus = 10점

1번 카드에는 적용하지 않습니다. 2번/3번 카드에서만 1번 카드 기준 연계 거리 보너스를 적용합니다.

우선순위:

1. `routeDistanceKmByPlaceId`가 있으면 이 값을 사용
2. 없으면 장소의 `latitude/longitude` 또는 `lat/lng`로 직선거리 계산
3. 둘 다 없으면 0점

현재 업로드된 장소 JSON에는 좌표가 없어서, 별도 거리값을 넘기지 않으면 모든 routeDistanceBonus는 0점입니다.

거리 보너스 기본값:

| 1번 카드 기준 거리 | 보너스 |
|---|---:|
| 5km 이하 | 10점 |
| 10km 이하 | 8점 |
| 20km 이하 | 6점 |
| 40km 이하 | 4점 |
| 70km 이하 | 2점 |
| 그 외 | 0점 |

## 4. 추천 카드 선별 방식

### 1번 카드: 최적 장면 카드

- primaryTheme 일치 후보 중 baseScore 1위
- 거리 보정 미적용
- 노출 보정 미적용
- 사용자가 고른 무드와 장면에 가장 정직하게 맞는 장소

### 2번 카드: 같은 무드 대안 카드

- 1번과 같은 primaryTheme 후보 우선
- 1번 장소 제외
- 같은 city 허용
- sceneTags/place_type이 너무 비슷하면 중복 페널티 적용
- routeDistanceBonus 적용
- 최근 노출 페널티, coverageBoost, lowExposureBoost 적용
- 1위 후보와 8점 이내면 더 가까운 후보 또는 덜 노출된 후보로 교체 가능

### 3번 카드: 조건 맞춤 카드

- travelPurpose, season_tags, best_time, accessibility 점수가 높은 후보 우선
- primaryTheme이 달라도 가능
- travelPurpose가 있으면 purpose_tags가 아예 안 맞는 후보는 제외
- routeDistanceBonus 적용
- 최근 노출 페널티, coverageBoost, lowExposureBoost 적용

## 5. 노출 보정 방식

레퍼런스 카드 JSON의 balanced coverage 정책을 서비스에서 사용할 수 있도록 구현했습니다.

| 보정 | 적용 대상 | 내용 |
|---|---|---|
| exposurePenalty | 2번/3번 | 최근 노출 1회당 -1점, 최대 -5점 |
| coverageBoost | 2번/3번 | 선택 reference card의 coveragePlaceIds 포함 시 +3점 |
| lowExposureBoost | 2번/3번 | 전체 노출이 평균보다 낮으면 +1~3점 |

1번 카드에는 노출 보정을 적용하지 않습니다.

## 6. 도보중심 처리

현재 장소 JSON의 accessibility에는 `car`, `public_transport`만 있고 `walk` 필드가 없습니다.

그래서 `transportType: "도보중심"`이 들어오면 다음 값을 기반으로 추정합니다.

- sceneTags
- place_type
- photo_point

예: 산책로, 골목, 시장, 항구, 해안산책로, 해변, 정원, 호수 등은 도보중심 상으로 추정합니다.

운영 데이터에 `accessibility.walk` 필드를 추가하면 그 값을 우선 사용하도록 확장하면 됩니다.

## 7. 실행 방법

```bash
cd goat_recommendation_engine_v1
npm run build
npm run test
npm run demo
```

테스트 결과:

```txt
All GOAT recommendation engine tests passed.
```

## 8. 백엔드 연결 예시

```ts
import { recommendGoatPlaces } from "./src";
import placesDataset from "./data/goat_simplified_scoring_tags_v10_accessibility_merged.json";
import referenceDataset from "./data/goat_reference_cards_v2_balanced.json";

const result = recommendGoatPlaces(
  {
    referenceCardId: body.referenceCardId,
    travelPurpose: body.travelPurpose,
    transportType: body.transportType,
    visitTime: body.visitTime,
    currentMonth: new Date().getMonth() + 1,
    totalExposureByPlaceId: exposureStats.total,
    recentExposureByPlaceId: exposureStats.recent,
    routeDistanceKmByPlaceId: routeDistances
  },
  placesDataset,
  referenceDataset
);

return result;
```

## 9. 프론트에서 바로 쓰는 필드

추천 카드 UI에는 아래 필드를 쓰면 됩니다.

- `card.rank`
- `card.roleLabel`
- `card.placeName`
- `card.city`
- `card.primaryTheme`
- `card.placeType`
- `card.photoPoint`
- `card.score.displayScore`
- `card.reasons`
- `card.cautions`
- `card.bestTime`
- `card.seasonTags`
- `card.purposeTags`
- `card.accessibility`
- `card.imageUrl`
- `card.address`

## 10. 실서비스 보강 권장

현재 로직은 업로드된 JSON만으로 돌아가도록 만들었습니다. 실제 서비스 정확도를 더 올리려면 다음 데이터만 추가하면 됩니다.

1. `latitude`, `longitude`: routeDistanceBonus 활성화
2. `address`: 상세 카드/지도 연결 품질 개선
3. `imageUrl`: 추천 카드 대표 이미지 표시
4. `accessibility.walk`: 도보중심 추정값 제거
5. 장소별 누적 노출 로그: 58개 장소 균등 노출 보정 강화
