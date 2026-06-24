# GOAT 점수 추천 로직 README

> 대상: 백엔드 담당자, 프론트엔드 담당자, DB 담당자, AI 추천 로직 담당자  
> 버전: `v1.3_plus_simple_conditions`  
> 핵심 파일: `backend/recommendationEngine.ts`  
> 목적: 누가 읽어도 “어떤 입력을 받아서, 어떤 점수를 더하고, 어떤 추천 카드 3개를 반환하는지” 이해할 수 있게 정리한다.

---

## 0. 한 줄 요약

GOAT 추천 로직은 사용자가 선택하거나 AI가 추출한 **장면/무드 태그**를 강원 장소 DB 58개와 비교해서 점수를 계산하고, 최종적으로 **추천 카드 3개**를 반환하는 규칙 기반 추천 로직이다.

이번 버전에서는 기존 태그 중심 추천에 아래 4가지를 추가했다.

1. 동행 유형: 혼자 / 연인 / 친구 / 가족
2. 여행 목적: 사진 / 산책 / 액티비티 / 휴식 / 먹거리
3. 이동수단: 자차 / 대중교통 / 도보
4. 방문 적합도: 날씨 태그 기반 보정

즉, 이제는 단순히 “분위기가 비슷한 장소”만 뽑는 것이 아니라, **누구랑 가는지, 왜 가는지, 어떻게 가는지, 오늘 날씨에 괜찮은지**까지 일부 반영한다.

---

## 1. 추천 로직 전체 흐름

```text
사용자 입력 또는 AI 분석 결과
        ↓
장면 태그 / 무드 태그 / 조건값 정리
        ↓
추천 후보 pool 결정
        ↓
각 장소별 점수 계산
        ↓
점수 높은 순서로 정렬
        ↓
추천 카드 3개 생성
        ↓
프론트에 응답
```

조금 더 개발자 관점으로 보면 다음 순서다.

```text
1. 프론트가 추천 요청값을 보낸다.
2. 백엔드는 RecommendationInput 형태로 값을 받는다.
3. 추천 엔진은 58개 seed pool 또는 43개 primary pool 중 하나를 고른다.
4. 각 장소마다 scorePlace()를 실행한다.
5. scorePlace() 안에서 점수 항목을 각각 계산한다.
6. rawScore를 displayScore로 변환한다.
7. 상위 후보를 RecommendationCard 형태로 바꾼다.
8. RecommendationApiResponse로 반환한다.
```

---

## 2. 핵심 파일 구조

| 파일 | 역할 |
|---|---|
| `backend/recommendationEngine.ts` | 실제 점수 계산 로직의 핵심 파일 |
| `backend/apiFirstRecommendationAdapter.ts` | API-first 후보와 seed fallback을 연결하는 어댑터 |
| `frontend/recommendationResponse.types.ts` | 프론트에서 사용할 요청/응답 타입 |
| `data/goat_places_all58.json` | 추천 후보 장소 58개 seed 데이터 |
| `data/tag_dictionary_v1_all58.json` | 태그 사전, 유사어, 연관 태그 기준 |
| `data/recommendation_test_cases.json` | 추천 로직 테스트 케이스 |
| `docs/api_contract_v1_all58.md` | 프론트/백엔드 API 계약 문서 |
| `docs/score_logic_update_simple_conditions_v1_3_plus.md` | 이번 점수 보완 내역 상세 문서 |

---

## 3. 현재 추천 후보 pool 정책

GOAT 장소 DB는 기본적으로 **58개 전체 후보**를 유지한다.

다만 모든 상황에서 58개를 그대로 쓰면 숙소, 리조트, 후보 장소까지 같이 섞여서 추천될 수 있다. 그래서 기본 방문지 추천에서는 **43개 1차 방문지 pool**로 좁힐 수 있다.

| pool | 의미 | 언제 사용 |
|---|---|---|
| `ALL58` | 58개 전체 후보 | 숙소/료칸/리조트 감성이 있거나, 확장 후보까지 봐야 할 때 |
| `PRIMARY43` | 검증 완료 + 비숙박/비리조트 중심 후보 | 일반적인 관광지 추천일 때 |

자동 판단 기준은 다음과 같다.

```text
숙소·료칸·리조트 감성이 있으면 → ALL58
확장 후보 성격 태그가 있으면 → ALL58
그 외 일반 방문지 추천이면 → PRIMARY43
PRIMARY43 결과가 약하면 → ALL58로 재시도 가능
```

중요한 점은 **58개에서 장소를 삭제한 것이 아니라**, 요청 조건에 따라 계산 대상만 잠시 좁히는 구조라는 것이다.

---

## 4. 추천 요청값

프론트 또는 백엔드에서 추천 엔진에 넘길 수 있는 요청값은 아래와 같다.

```ts
export type RecommendationInput = {
  requestId?: string;
  source?: "llm" | "manual-demo" | "reference-card" | string;

  extractedTags?: string[];
  moodTags?: string[];
  sceneTags?: string[];

  preferredSeason?: string | null;
  preferredTime?: string | null;
  regionGroup?: string | null;
  weatherTag?: string | null;

  companionType?: "solo" | "couple" | "friends" | "family" | string | null;
  travelPurpose?: "photo" | "walk" | "activity" | "healing" | "food" | string | string[] | null;
  transportType?: "car" | "public" | "walk" | string | null;

  limit?: number;
  poolMode?: "auto" | "all58" | "primary43";
};
```

---

## 5. 프론트에서 보내기 좋은 요청 예시

### 5-1. 레퍼런스 카드 선택 기반 추천

사용자가 앱에서 “바다/해안도로 감성” 같은 레퍼런스 카드를 선택한 경우다.

```json
{
  "requestId": "demo-sea-road-001",
  "source": "reference-card",
  "sceneTags": ["바다", "해안도로", "로드트립"],
  "moodTags": ["청량함", "이국적"],
  "preferredTime": "오후~일몰",
  "preferredSeason": "봄,가을",
  "weatherTag": "맑은 날",
  "companionType": "친구",
  "travelPurpose": "사진 위주",
  "transportType": "자차",
  "limit": 3,
  "poolMode": "auto"
}
```

### 5-2. AI 이미지 분석 기반 추천

사용자가 사진을 올리고, AI가 태그를 추출한 뒤 추천하는 경우다.

```json
{
  "requestId": "image-analysis-001",
  "source": "llm",
  "extractedTags": ["바다", "도로", "일몰", "오션뷰"],
  "sceneTags": ["해안도로", "바다"],
  "moodTags": ["청량함", "낭만적"],
  "weatherTag": "맑은 날",
  "companionType": "연인",
  "travelPurpose": ["사진", "산책"],
  "transportType": "자차",
  "limit": 3,
  "poolMode": "auto"
}
```

### 5-3. 조건값 없이 태그만 보내는 기본 추천

조건값이 아직 프론트에 없거나 MVP 초기에 간단히 붙일 때는 태그만 보내도 된다.

```json
{
  "requestId": "basic-tag-001",
  "source": "manual-demo",
  "sceneTags": ["일본소도시", "골목", "바다"],
  "moodTags": ["감성적", "조용함"],
  "limit": 3,
  "poolMode": "auto"
}
```

조건값이 없으면 `companion`, `travelPurpose`, `transport`, `weather` 점수는 0점으로 처리된다. 그래서 기존 추천 결과를 크게 흔들지 않는다.

---

## 6. 기존 점수 추천 방식

기존 추천 로직은 아래 점수들을 합산했다.

```text
기존 rawScore =
  tag
+ sceneSpecific
+ region
+ lodgingIntent
+ season
+ time
+ weather
+ dataStatus
```

| 점수 항목 | 쉬운 설명 | 예시 |
|---|---|---|
| `tag` | 입력 태그와 장소 태그가 얼마나 맞는지 | 바다 입력 → 해변/오션뷰 장소 가산 |
| `sceneSpecific` | 특정 대표 장면에 대한 보정 | 해안도로, 일본 소도시, 알프스 목장 등 |
| `region` | 사용자가 고른 권역과 맞는지 | 동해안권 선택 → 동해안권 가산 |
| `lodgingIntent` | 숙소 의도가 있으면 숙소형 장소를 올림 | 료칸 입력 → 료칸/숙소 가산 |
| `season` | 선호 계절과 장소 추천 계절이 맞는지 | 겨울 입력 → 설경 장소 가산 |
| `time` | 선호 시간과 장소 추천 시간이 맞는지 | 일몰 입력 → 일몰 명소 가산 |
| `weather` | 날씨 키워드가 맞는지 | 비오는 날 → 실내/카페/미술관 가산 |
| `dataStatus` | 검증 상태에 따른 보정 | confirmed 가산, needs_verification 감점 |

기존 최종 계산은 다음과 같다.

```ts
rawScore = tag
  + sceneSpecific
  + region
  + lodgingIntent
  + season
  + time
  + weather
  + dataStatus;

score = rawScore / 2.4;
score = 0 ~ 98 범위로 제한;
```

---

## 7. 이번 버전에서 추가된 점수 추천 방식

이번 버전에서는 현실적인 사용자 조건을 반영하기 위해 아래 4개를 추가했다.

```text
추가 rawScore =
  companion
+ travelPurpose
+ transport
+ weather 강화
```

최종 구조는 아래처럼 바뀌었다.

```ts
rawScore = tag
  + sceneSpecific
  + region
  + lodgingIntent
  + season
  + time
  + weather
  + companion
  + travelPurpose
  + transport
  + dataStatus;

score = rawScore / 2.4;
score = 0 ~ 98 범위로 제한;
```

---

## 8. 각 점수 항목 상세 설명

### 8-1. `tag` 점수

가장 기본이 되는 점수다.

사용자 입력 태그와 장소 데이터의 아래 필드를 비교한다.

- `searchTags`
- `moodTags`
- `primaryMood`
- `placeType`
- `photoPoint`
- `recommendationUse`
- `note`

예시:

```text
사용자 입력: 바다, 해안도로, 로드트립
장소 데이터: 금진해변·헌화로 드라이브 코스 / 해안도로 / 캘리포니아 / 로드트립
결과: 직접 일치가 많으므로 tag 점수 상승
```

### 8-2. `sceneSpecific` 점수

단순 태그 일치만으로는 부족한 대표 장면을 보정한다.

예를 들어 “해안도로”라고 입력했을 때 단순히 바다가 있는 카페보다 진짜 해안도로/로드트립 성격 장소가 위로 올라와야 한다.

대표 보정 장면은 다음과 같다.

| 입력 장면 | 우대되는 장소 성격 |
|---|---|
| 해안도로 / 로드트립 / 캘리포니아 | 해안도로, 서프비치, 오션뷰, 드라이브 코스 |
| 일본 소도시 / 가마쿠라 / 철길 | 철길, 바다도로, 일본감성 골목 |
| 목장 / 초원 / 알프스 | 고원권 목장, 초원, 양떼목장 |
| 협곡 / 절벽 / 아이슬란드 | 협곡, 주상절리, 잔도, 스카이워크 |
| 북유럽 / 숲 / 자작나무 / 겨울 | 자작나무숲, 침엽수림, 설경 |
| 레트로 / 시장 / 야간 | 시장, 항구, 야간거리, 구도심 |
| 고원 / 별 / 은하수 / 몽골 | 고원, 별보기, 풍력발전기 |
| 발리 / 서핑 / 서프비치 | 서프비치, 서프타운, 발리풍 카페 |
| 유럽 / 정원 / 성당 / 산토리니 | 정원, 수목원, 성당, 산토리니 |

### 8-3. `region` 점수

사용자가 특정 권역을 골랐을 때 반영한다.

```text
입력 regionGroup = 동해안권
장소 regionGroup = 동해안권 → 가산
장소 regionGroup = 고원권 → 감점
```

권역을 선택하지 않으면 0점이다.

### 8-4. `lodgingIntent` 점수

사용자가 숙소/료칸/자쿠지/풀빌라 같은 감성을 원할 때만 작동한다.

```text
사용자가 료칸 입력 → 료칸/숙소형 장소 가산
사용자가 료칸 입력 → 일반 관광지는 감점
```

숙소 의도가 없으면 0점이다.

### 8-5. `season` 점수

사용자가 선호 계절을 입력했을 때 장소의 `bestSeason`과 비교한다.

```text
입력 preferredSeason = 겨울
장소 bestSeason = 겨울 → 가산
장소 bestSeason = 사계절 → 가산
장소 bestSeason = 여름 → 소폭 감점
```

### 8-6. `time` 점수

사용자가 방문 시간을 입력했을 때 장소의 `bestTime`과 비교한다.

```text
입력 preferredTime = 일몰
장소 bestTime = 오후~일몰 → 가산
장소 bestTime = 오전 → 0점
```

시간 그룹은 대략 아래처럼 묶인다.

| 입력 그룹 | 유사 시간 |
|---|---|
| 오전 | 이른 아침, 일출 |
| 오후 | 늦은 오후, 정오 |
| 일몰 | 해질녘, 블루아워 |
| 밤 | 저녁, 새벽 |

### 8-7. `weather` 점수

방문 적합도에 가까운 점수다.

기존에는 날씨 키워드가 장소 텍스트에 들어있는지만 보는 성격이 강했지만, 이번 버전에서는 날씨별로 장소 유형을 가산/감점한다.

| 날씨 입력 | 올라가는 장소 | 내려가는 장소 |
|---|---|---|
| 맑은 날 | 해변, 해안, 오션뷰, 고원, 목장, 숲, 정원, 호수, 전망 | 거의 없음 |
| 비/우천 | 미술관, 카페, 서점, 시장, 폐광, 산업유산 | 해변, 해안, 산, 고원, 목장, 서핑, 도로, 별/은하수 |
| 흐린 날 | 폐광, 산업유산, 미술관, 카페, 서점, 시장, 항구 | 별, 은하수, 일출, 일몰, 전망 중심 장소 |
| 강풍/바람 | 미술관, 카페, 서점, 시장 | 해변, 해안, 절벽, 데크, 고원, 풍력발전기, 서핑 |
| 눈/겨울 | 설경, 설원, 눈꽃, 상고대, 스키, 북유럽, 자작나무 | 해안도로, 도로, 절벽, 데크 일부 |

날씨 점수 범위는 대략 `-8 ~ +10`이다.

### 8-8. `companion` 점수

동행 유형에 따라 장소 성격을 보정한다.

| 입력값 | 올라가는 장소 | 내려갈 수 있는 장소 |
|---|---|---|
| 혼자 / 혼행 / solo | 조용한 서점, 미술관, 숲길, 정원, 성당, 카페, 산책, 호수 | 가족 테마파크, 극혼잡 장소 |
| 연인 / 커플 / 데이트 / couple | 일몰, 블루아워, 카페, 정원, 오션뷰, 전망, 산토리니, 료칸, 해변 | 거의 없음 |
| 친구 / 우정 / friends | 서핑, 시장, 야간, 먹거리, 카페거리, 로드트립, 포토존, 액티비티 | 거의 없음 |
| 가족 / 아이 / 부모 / family | 가족여행, 동물, 목장, 수목원, 정원, 테마파크, 접근성 좋은 장소 | 차도 촬영, 급경사, 야간, 절벽, 통제 요소 |

동행 점수 범위는 대략 `-8 ~ +12`이다.

### 8-9. `travelPurpose` 점수

여행 목적에 따라 장소 성격을 보정한다.

| 입력값 | 올라가는 장소 | 내려갈 수 있는 장소 |
|---|---|---|
| 사진 / 포토 / 인스타 / SNS | 사진스팟, 포토존, 전망, 오션뷰, 반영, 일몰, 일출, 철길, 라벤더 | 거의 없음 |
| 산책 / 가볍게 / 걷기 / walk | 산책로, 데크길, 골목산책, 숲길, 정원, 호수, 카페거리, 서점 | 등산, 트레킹, 산악, 새벽, 밤, 절벽, 출렁다리 |
| 액티비티 / 체험 / activity | 서핑, 스카이워크, 출렁다리, 케이블카, 트레킹, 목장, 동물, 협곡 | 거의 없음 |
| 휴식 / 조용함 / healing | 조용함, 숲, 정원, 카페, 서점, 성당, 미술관, 호수, 료칸 | 시장, 야간, 서핑, 액티비티, 버스킹 |
| 먹거리 / 시장 / 야간 / food | 시장, 먹거리, 항구, 밤거리, 해산물, 버스킹, 오사카/후쿠오카 감성 | 거의 없음 |

여행 목적 점수 범위는 대략 `-10 ~ +15`이다.

### 8-10. `transport` 점수

이동수단과 장소 접근성을 비교한다.

장소 데이터의 `accessibility` 필드를 사용한다.

```json
{
  "accessibility": {
    "publicTransport": "중",
    "car": "상",
    "raw": "대중 중 / 자차 상"
  }
}
```

| 입력값 | 판단 방식 |
|---|---|
| 자차 / 자동차 / car | `accessibility.car`가 상이면 가산, 중이면 소폭 가산, 하이면 감점 |
| 대중교통 / 버스 / 기차 / 뚜벅이 / public | `accessibility.publicTransport`가 상이면 가산, 중이면 소폭 가산, 하이면 감점 |
| 도보 / 걷기 / walk | 대중교통 접근성 + 산책/데크길/골목/시장/카페거리 성격을 함께 봄 |

이동수단 점수 범위는 대략 `-8 ~ +8`이다.

### 8-11. `dataStatus` 점수

장소 검증 상태에 따라 소폭 보정한다.

| 상태 | 의미 | 점수 |
|---|---|---:|
| `confirmed` | 검증 완료 | +3 |
| `future_candidate` | 후보 장소 | +1 |
| `needs_verification` | 운영 확인 필요 | -2 |

`future_candidate`와 `needs_verification`은 무조건 제외가 아니다. 다만 카드에 주의 문구가 붙거나 점수에서 소폭 보정된다.

---

## 9. 점수 계산 예시

예를 들어 사용자가 아래처럼 입력했다고 하자.

```json
{
  "sceneTags": ["바다", "해안도로", "로드트립"],
  "moodTags": ["청량함", "이국적"],
  "weatherTag": "맑은 날",
  "companionType": "친구",
  "travelPurpose": "사진 위주",
  "transportType": "자차"
}
```

추천 엔진은 각 장소에 대해 이런 식으로 점수를 계산한다.

```json
{
  "tag": 80,
  "sceneSpecific": 28,
  "region": 0,
  "lodgingIntent": 0,
  "season": 0,
  "time": 0,
  "weather": 4,
  "companion": 5,
  "travelPurpose": 8,
  "transport": 6,
  "dataStatus": 3,
  "directMatchCount": 5
}
```

그리고 이 점수들을 더한다.

```text
rawScore = 80 + 28 + 0 + 0 + 0 + 0 + 4 + 5 + 8 + 6 + 3
rawScore = 134
```

화면에 보여줄 점수는 너무 커지지 않도록 나눈다.

```text
displayScore = rawScore / 2.4
              = 55.8점
```

최종 카드에는 `score: 55.8`처럼 들어간다.

---

## 10. 추천 응답 구조

추천 엔진은 성공 시 아래 구조를 반환한다.

```ts
export type RecommendationApiResponse = {
  status: "DONE" | "FAILED";
  resultType: "RECOMMEND" | "UNKNOWN";
  score: number | null;
  message: string;
  failReason: string | null;
  resultData: null | {
    requestId: string;
    inputTags: string[];
    seedPoolSize: number;
    candidatePoolSize: number;
    poolPolicy: "ALL58" | "PRIMARY43";
    poolReason: string;
    fallbackUsed: boolean;
    adaptivePoolRetryUsed: boolean;
    recommendations: RecommendationCard[];
  };
};
```

---

## 11. 추천 카드 구조

프론트에서 실제로 화면에 표시할 추천 카드 구조다.

```ts
export type RecommendationCard = {
  rank: number;
  cardType: "SCENE_BEST" | "SAME_MOOD_ALTERNATIVE" | "CONDITION_FIT";
  cardLabel: string;

  placeId: string;
  name: string;
  city: string;
  regionGroup: string;
  placeType: string;
  primaryMood: string;

  dataStatus: string;
  dataStatusLabel: string;

  score: number;
  matchedTags: string[];
  scoreBreakdown: Record<string, number>;
  reason: string;

  photoPoint: string | null;
  bestTime: string | null;
  bestSeason: string | null;
  weatherFit: string;
  crowdLevel: string;
  safetyNotes: string[];
  parkingInfo: string;
  accessibility: string | null;

  imageUrl: string | null;
  mapSearchQuery: string | null;
};
```

프론트에서 우선적으로 표시해야 하는 필드는 아래다.

| 화면 표시 필드 | 설명 |
|---|---|
| `cardLabel` | 장면 최적 / 같은 분위기 대안 / 조건 맞춤 |
| `name` | 장소명 |
| `city` | 시군명 |
| `regionGroup` | 권역 |
| `placeType` | 장소 유형 |
| `score` | 추천 점수 |
| `reason` | 추천 이유 |
| `matchedTags` | 맞은 태그 |
| `photoPoint` | 사진 포인트 |
| `weatherFit` | 날씨 적합도 |
| `safetyNotes` | 안전/운영 주의 문구 |
| `parkingInfo` | 자차 접근성 기반 주차/접근 안내 |
| `imageUrl` | 대표 이미지 |
| `mapSearchQuery` | 지도앱 검색어 |

---

## 12. 카드 3개 라벨의 현재 의미

현재 카드 3개는 아래 라벨을 가진다.

| rank | cardType | cardLabel |
|---:|---|---|
| 1 | `SCENE_BEST` | 장면 최적 |
| 2 | `SAME_MOOD_ALTERNATIVE` | 같은 분위기 대안 |
| 3 | `CONDITION_FIT` | 조건 맞춤 |

단, 현재 버전에서 중요한 주의점이 있다.

**아직 카드 3개를 역할별로 따로 선발하지는 않는다.**

현재는 점수순으로 뽑은 뒤 1번, 2번, 3번에 라벨을 붙이는 방식에 가깝다.

```text
현재 방식:
점수 계산 → 점수순 정렬 → 1/2/3위에 카드 라벨 부여
```

향후 더 고도화하려면 아래처럼 바꾸면 된다.

```text
개선 방식:
1번 카드 = 감성 일치도 + 사진 장면성 최우선
2번 카드 = 1번과 비슷하지만 다른 대안
3번 카드 = 날씨 + 이동수단 + 안전 + 접근성 최우선
```

이번 단계에서는 구현 부담을 줄이기 위해 역할별 별도 선발은 제외했다.

---

## 13. `weatherFit`, `parkingInfo`, `safetyNotes` 표시 기준

### 13-1. `weatherFit`

`weather` 점수에 따라 표시 문구가 달라진다.

| weather 점수 | 표시 문구 |
|---:|---|
| 6 이상 | 날씨 적합도 좋음 |
| 2 이상 | 날씨 적합도 보통 이상 |
| 0 미만 | 날씨 주의 필요 |
| 그 외 | 보통 |

### 13-2. `parkingInfo`

현재는 실시간 주차 API가 아니라 장소 데이터의 자차 접근성 기준으로 표시한다.

| `accessibility.car` | 표시 문구 |
|---|---|
| 상 | 자차 접근성 좋음 |
| 중 | 자차 접근성 보통 |
| 하 | 자차 접근성 낮음 |
| 없음 | 확인 필요 |

즉, 현재 `parkingInfo`는 “실시간 주차 가능 여부”가 아니라 **자차 접근성 안내**에 가깝다.

### 13-3. `safetyNotes`

장소의 `note`, `recommendationUse`, `placeType`, `bestTimeRaw`, `dataStatus`에서 아래 키워드를 찾아 안내 문구를 만든다.

| 감지 키워드 | 표시 문구 |
|---|---|
| `needs_verification` | 운영 상태 확인 필요 |
| `future_candidate` | 후보 장소로 방문 전 정보 확인 권장 |
| 도로 | 도로·기상 상태 확인 필요 |
| 통제 | 운영·통제 여부 확인 필요 |
| 안전 | 안전 공지 확인 필요 |
| 야간 | 야간 방문 주의 |
| 파도 | 해안 안전 주의 |
| 입산 | 입산 통제 확인 필요 |
| 운영 | 운영 여부 확인 필요 |

현재 `safetyNotes`는 주로 표시용이다. 가족 동행이나 날씨 점수 일부에서는 안전성 감점이 들어가지만, 전체적으로 강한 안전 감점 로직은 아직 단순한 편이다.

---

## 14. 백엔드 담당자가 알아야 할 것

### 14-1. 백엔드의 핵심 역할

백엔드는 추천 점수 기준을 새로 해석하지 말고, 정해진 입력값을 추천 엔진에 정확히 넘기고 응답을 프론트에 안정적으로 반환하면 된다.

```text
프론트 요청 수신
        ↓
이미지/태그/조건값 정리
        ↓
recommendationEngine 호출
        ↓
응답 JSON 반환
        ↓
필요하면 DB 저장
```

### 14-2. 백엔드에서 꼭 지킬 것

1. API 키를 프론트에 노출하지 않는다.
2. 프론트 요청값을 `RecommendationInput` 형태로 정리한다.
3. 값이 없으면 억지로 채우지 말고 `null` 또는 생략한다.
4. 추천 실패 시 앱이 멈추지 않게 fallback 또는 실패 응답을 반환한다.
5. `scoreBreakdown`은 프론트 일반 화면보다 디버그/QA 확인용으로 유지한다.

### 14-3. 백엔드 추천 호출 예시

```ts
import { recommendPlaces } from "./backend/recommendationEngine.ts";

const result = recommendPlaces({
  requestId: "demo-001",
  source: "reference-card",
  sceneTags: ["바다", "해안도로"],
  moodTags: ["청량함"],
  companionType: "친구",
  travelPurpose: "사진 위주",
  transportType: "자차",
  weatherTag: "맑은 날",
  limit: 3,
  poolMode: "auto"
});
```

### 14-4. 백엔드에서 저장하면 좋은 로그

MVP 필수는 아니지만, 추천 품질 검증에 도움이 된다.

| 필드 | 이유 |
|---|---|
| `requestId` | 요청 추적 |
| `inputTags` | 어떤 태그로 추천했는지 확인 |
| `companionType` | 동행 조건 영향 확인 |
| `travelPurpose` | 목적 조건 영향 확인 |
| `transportType` | 이동수단 조건 영향 확인 |
| `weatherTag` | 날씨 조건 영향 확인 |
| `recommendedPlaceIds` | 추천된 장소 확인 |
| `scoreBreakdown` | 왜 이 장소가 올라왔는지 디버깅 |
| `fallbackUsed` | API 실패/seed fallback 여부 확인 |

---

## 15. 프론트엔드 담당자가 알아야 할 것

### 15-1. 프론트의 핵심 역할

프론트는 추천 점수를 직접 계산하지 않는다.

프론트는 사용자가 선택한 값을 백엔드에 넘기고, 백엔드가 준 추천 카드 3개를 보기 좋게 표시한다.

```text
사용자 선택값 수집
        ↓
추천 요청 API 호출
        ↓
로딩 화면 표시
        ↓
추천 카드 3개 표시
        ↓
상세 화면 / 지도 연결
```

### 15-2. 프론트에서 받을 사용자 선택값

프론트 UI에서는 복잡한 값을 만들 필요 없이 아래 정도만 받으면 충분하다.

| UI 항목 | 백엔드로 보내는 필드 | 예시 |
|---|---|---|
| 감성 카드 | `sceneTags`, `moodTags` | 바다, 해안도로, 청량함 |
| 동행 유형 | `companionType` | 혼자, 연인, 친구, 가족 |
| 여행 목적 | `travelPurpose` | 사진, 산책, 액티비티, 휴식, 먹거리 |
| 이동수단 | `transportType` | 자차, 대중교통, 도보 |
| 날씨 조건 | `weatherTag` | 맑은 날, 비, 흐린 날, 강풍, 눈 |

### 15-3. 프론트에서 표시할 카드 우선순위

카드에 모든 정보를 다 넣으면 화면이 복잡해질 수 있다. MVP에서는 아래 순서를 추천한다.

1. `cardLabel`
2. `imageUrl`
3. `name`
4. `city` / `regionGroup`
5. `score`
6. `reason`
7. `matchedTags`
8. `photoPoint`
9. `weatherFit`
10. `parkingInfo`
11. `safetyNotes`
12. 상세보기 / 지도앱 연결 버튼

### 15-4. 프론트에서 주의할 것

1. 추천 카드가 정확히 3개인지 확인한다.
2. `imageUrl`이 없으면 기본 이미지를 보여준다.
3. `safetyNotes`가 비어 있으면 “방문 전 운영 정보 확인” 같은 기본 문구를 보여줘도 된다.
4. `mapSearchQuery`가 있으면 지도앱 검색어로 사용한다.
5. `scoreBreakdown`은 일반 사용자에게 그대로 보여주지 않는 것을 권장한다.
6. API 실패 시 결과 없음/재시도 화면으로 빠지게 한다.

---

## 16. DB 및 AI 추천 로직 담당자가 알아야 할 것

### 16-1. DB 담당자의 핵심 역할

DB 담당자는 추천 점수가 잘 나오도록 장소 데이터의 태그와 조건 필드를 정리해야 한다.

현재 로직은 DB의 아래 값에 크게 의존한다.

| DB 필드 | 추천에서 쓰이는 방식 |
|---|---|
| `placeId` | 장소 식별 |
| `name` | 장소명, 태그 검색 보조 |
| `city` | 시군명 |
| `regionGroup` | 권역 점수 계산 |
| `placeType` | 장소 유형 점수/태그 매칭 |
| `primaryMood` | 대표 감성 매칭 |
| `moodTags` | 무드 태그 매칭 |
| `searchTags` | 검색/장면 태그 매칭 |
| `photoPoint` | 사진 목적 점수, 추천 이유 생성 |
| `bestTimeRaw` | 시간 점수, 안전 문구 |
| `bestSeasonRaw` | 계절 점수 |
| `accessibility.publicTransport` | 대중교통/도보 점수 |
| `accessibility.car` | 자차 점수, parkingInfo 표시 |
| `dataStatus` | 검증 상태 점수/배지 |
| `recommendationUse` | 추천 이유, 안전/용도 판단 |
| `note` | 안전/운영 주의 문구 |
| `imageUrl` | 카드 이미지 |
| `mapSearchQuery` | 지도앱 연결 검색어 |

### 16-2. DB 담당자가 특히 잘 관리해야 하는 값

추천 품질에 가장 직접적으로 영향을 주는 것은 아래 5개다.

1. `moodTags`
2. `searchTags`
3. `photoPoint`
4. `accessibility`
5. `note`

예를 들어 어떤 장소가 실제로는 산책하기 좋은 곳인데 `searchTags`에 `산책`, `데크길`, `골목` 같은 단어가 없으면 산책 목적 점수를 받기 어렵다.

### 16-3. AI 추천 로직 담당자의 핵심 역할

AI 추천 로직 담당자는 AI가 뽑는 태그가 추천 엔진의 태그 체계와 맞게 나오도록 관리해야 한다.

AI 분석 결과는 가능하면 아래처럼 정리한다.

```json
{
  "sceneTags": ["바다", "해안도로", "일몰"],
  "moodTags": ["청량함", "낭만적"],
  "placeType": "해안도로",
  "weatherPreference": "맑은 날",
  "confidence": 0.82,
  "summary": "바다와 도로가 함께 보이는 청량한 일몰 사진"
}
```

그 다음 추천 요청으로 변환할 때는 아래처럼 넣는다.

```json
{
  "sceneTags": ["바다", "해안도로", "일몰"],
  "moodTags": ["청량함", "낭만적"],
  "weatherTag": "맑은 날"
}
```

### 16-4. AI 태그를 만들 때 주의할 것

1. 너무 추상적인 태그만 주면 추천이 약해진다.
   - 나쁜 예: `이국적`, `예쁨`, `감성`
   - 좋은 예: `바다`, `해안도로`, `일몰`, `오션뷰`
2. 장면 태그와 무드 태그를 분리한다.
   - 장면: 바다, 골목, 목장, 고원, 숲, 시장
   - 무드: 청량함, 조용함, 낭만적, 레트로, 이국적
3. 장소 유형을 가능하면 같이 뽑는다.
   - 예: 해변, 카페, 목장, 미술관, 시장, 산책로
4. confidence가 낮으면 기본 추천 또는 레퍼런스 카드 선택으로 fallback하는 것이 안전하다.

---

## 17. 실행 및 검증 방법

패키지 루트에서 실행한다.

```bash
npm install
npm run typecheck
npm run test:recommend
```

정상 결과는 아래와 비슷하다.

```text
Recommendation test result: 13 passed, 0 failed
```

`typecheck`가 실패하면 타입 정의나 import 경로가 깨진 것이다.  
`test:recommend`가 실패하면 추천 순위나 테스트 기대값이 달라진 것이다.

---

## 18. 테스트할 때 봐야 하는 것

테스트할 때 단순히 “결과가 나왔다”만 보면 안 된다. 아래를 같이 확인해야 한다.

| 확인 항목 | 봐야 하는 이유 |
|---|---|
| `seedPoolSize` | 전체 seed가 58개인지 확인 |
| `candidatePoolSize` | 실제 계산 pool이 43 또는 58인지 확인 |
| `poolPolicy` | 왜 43/58을 썼는지 확인 |
| `recommendations.length` | 카드가 3개 나오는지 확인 |
| `score` | 점수가 비정상적으로 낮거나 높지 않은지 확인 |
| `scoreBreakdown.tag` | 태그 점수가 실제로 매칭되는지 확인 |
| `scoreBreakdown.weather` | 날씨 조건이 반영됐는지 확인 |
| `scoreBreakdown.companion` | 동행 유형이 반영됐는지 확인 |
| `scoreBreakdown.travelPurpose` | 여행 목적이 반영됐는지 확인 |
| `scoreBreakdown.transport` | 이동수단이 반영됐는지 확인 |
| `weatherFit` | 날씨 문구가 점수와 맞는지 확인 |
| `parkingInfo` | 자차 접근성 문구가 맞는지 확인 |
| `safetyNotes` | 위험/운영 주의 문구가 필요한 곳에 붙는지 확인 |

---

## 19. 이번 버전에서 일부러 넣지 않은 것

이번 버전은 가능한 것부터 안정적으로 보완하는 방향이다. 그래서 아래 기능은 아직 넣지 않았다.

| 아직 넣지 않은 것 | 이유 |
|---|---|
| 카드 3개 역할별 별도 선발 | 로직이 커지므로 다음 단계로 분리하는 것이 안전함 |
| 동일 지역/유형 다양성 제한 | 점수 계산과 후처리 로직이 섞이므로 별도 단계 권장 |
| 실시간 혼잡도 | API 연동과 데이터 해석이 필요함 |
| 실시간 주차 | 현재 DB에는 실시간 주차 여부가 없음 |
| 현재 위치 기반 거리 점수 | 사용자 위치 권한과 좌표 계산이 필요함 |
| 강한 안전 감점 | 장소별 위험도 등급 데이터가 아직 부족함 |

---

## 20. 다음에 가볍게 추가하기 좋은 보완

복잡하지 않으면서 추천 품질을 올릴 수 있는 다음 후보는 아래 순서가 좋다.

### 20-1. `sameCityPenalty`

추천 카드 3개가 같은 시군으로 몰리는 것을 막는다.

```text
예: 강릉 장소가 1, 2, 3번 모두 나오면
3번째 강릉 후보를 다른 시군 후보로 교체하거나 감점
```

추천 이유: 구현은 비교적 간단하고, 카드 3개가 다양해 보이는 효과가 크다.

### 20-2. `missingDisplayDataPenalty`

이미지, 좌표, 지도 검색어가 없는 장소를 상위 카드에서 내린다.

```text
imageUrl 없음 → 감점
mapSearchQuery 없음 → 감점
좌표 없음 → 감점 또는 상세 화면에서 지도 버튼 비활성화
```

추천 이유: 프론트 화면 완성도가 바로 좋아진다.

### 20-3. `simpleSafetyPenalty`

안전 주의가 큰 장소를 조건 맞춤 카드에서 낮춘다.

```text
차도 촬영, 파도, 급경사, 통제, 야간 위험 키워드가 있으면 감점
가족/도보/비/강풍 조건에서는 더 크게 감점
```

추천 이유: GOAT가 “예쁜 장소”뿐 아니라 “방문 판단”을 도와준다는 컨셉과 잘 맞다.

### 20-4. `simpleCrowdPenalty`

주말/연휴 입력이 있을 때 유명 해변, 시장, 테마파크를 소폭 감점한다.

```text
visitTiming = 주말 오후
장소 = 유명 해변/시장/테마파크
→ 소폭 감점
```

추천 이유: 실시간 혼잡도 API 없이도 방문 적합도 느낌을 줄 수 있다.

---

## 21. 역할별 최종 체크리스트

### 백엔드 담당자

- [ ] `RecommendationInput` 요청값을 정확히 받는다.
- [ ] 새 필드 `companionType`, `travelPurpose`, `transportType`, `weatherTag`를 누락하지 않는다.
- [ ] 추천 엔진 응답을 그대로 프론트에 반환한다.
- [ ] 실패 시 `FAILED` 또는 fallback 응답을 반환한다.
- [ ] `scoreBreakdown`을 QA 확인용으로 유지한다.
- [ ] API 키를 프론트에 노출하지 않는다.

### 프론트엔드 담당자

- [ ] 동행 유형 선택 UI를 만든다.
- [ ] 여행 목적 선택 UI를 만든다.
- [ ] 이동수단 선택 UI를 만든다.
- [ ] 날씨 조건이 있으면 `weatherTag`로 보낸다.
- [ ] 추천 카드 3개를 표시한다.
- [ ] 이미지 없을 때 기본 이미지를 표시한다.
- [ ] `weatherFit`, `parkingInfo`, `safetyNotes`를 카드에 표시한다.
- [ ] 실패/결과 없음/재시도 화면을 준비한다.

### DB 및 AI 추천 로직 담당자

- [ ] 장소별 `searchTags`를 표준화한다.
- [ ] 장소별 `moodTags`를 표준화한다.
- [ ] 장소별 `photoPoint`를 비워두지 않는다.
- [ ] 장소별 `accessibility.publicTransport`, `accessibility.car`를 정리한다.
- [ ] 장소별 `note`에 안전/운영 주의 정보를 적는다.
- [ ] AI가 뽑는 태그와 DB 태그가 같은 체계를 쓰는지 확인한다.
- [ ] 테스트 케이스별 예상 추천 장소를 정리한다.
- [ ] 추천 결과가 이상하면 `scoreBreakdown`을 보고 어떤 점수 항목이 문제인지 확인한다.

---

## 22. 자주 헷갈리는 질문

### Q1. 프론트에서 점수를 계산해야 하나?

아니다. 프론트는 점수를 계산하지 않는다. 프론트는 입력값을 보내고 결과를 표시한다.

### Q2. DB에서 점수를 미리 저장해야 하나?

아니다. 점수는 요청 조건에 따라 달라지므로 실시간 계산한다. DB에는 장소 정보와 태그를 잘 저장하면 된다.

### Q3. AI가 추천 장소를 직접 고르나?

현재 구조에서는 AI가 직접 최종 장소를 고르는 것이 아니라, AI가 사진에서 태그를 뽑고 추천 엔진이 그 태그로 장소를 점수 계산한다.

### Q4. `parkingInfo`는 진짜 주차 가능 여부인가?

아니다. 현재는 장소 데이터의 `accessibility.car`를 기반으로 한 자차 접근성 안내다. 실시간 주차 가능 여부가 아니다.

### Q5. `crowdLevel`은 실제 혼잡도인가?

아니다. 현재는 대부분 `보통`으로 표시된다. 실시간 혼잡도 또는 방문 집중률 API 반영은 다음 단계다.

### Q6. 카드 3개는 진짜 역할별로 뽑히나?

현재는 완전한 역할별 선발은 아니다. 점수순 Top3에 `장면 최적`, `같은 분위기 대안`, `조건 맞춤` 라벨을 붙이는 구조다. 다음 단계에서 카드별 선발 기준을 분리하면 더 좋아진다.

### Q7. 이번에 추가된 동행/목적/이동수단/날씨 조건은 필수인가?

아니다. 선택값이다. 없으면 0점 처리되어 기존 태그 기반 추천으로 동작한다.

---

## 23. 최종 정리

현재 GOAT 추천 로직은 아래처럼 이해하면 된다.

```text
1. 사용자가 원하는 장면/무드 태그를 받는다.
2. 장소 DB의 태그, 무드, 사진 포인트와 비교한다.
3. 계절, 시간, 권역, 숙소 의도도 반영한다.
4. 추가로 동행 유형, 여행 목적, 이동수단, 날씨 조건을 반영한다.
5. 점수 높은 장소 3개를 추천 카드로 만든다.
6. 프론트는 카드 3개를 보여주고 지도앱 연결로 이어준다.
```

이번 버전의 목표는 고급 추천 알고리즘이 아니라, **팀원이 바로 이해하고 연결할 수 있는 안정적인 규칙 기반 추천 로직**이다.

가장 중요한 기준은 이것이다.

```text
태그가 맞는가?
사진 결과물이 기대되는가?
사용자 조건과 맞는가?
오늘 가기에 너무 불편하거나 위험하지 않은가?
```

이 네 가지를 현재 가능한 데이터 안에서 점수로 계산하는 것이 v1.3_plus_simple_conditions의 핵심이다.
