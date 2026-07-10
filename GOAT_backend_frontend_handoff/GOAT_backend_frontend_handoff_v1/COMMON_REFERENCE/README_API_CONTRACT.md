# GOAT 백엔드·프론트 API 계약서

> 프론트와 백엔드가 서로 맞춰야 하는 최소 요청/응답 형식입니다.

---

## 1. 추천 요청 API 예시

```http
POST /api/recommendations/goat
Content-Type: application/json
```

### Request Body

```json
{
  "referenceCardId": "REF_SEA_02",
  "travelPurpose": "사진·포토스팟",
  "transportType": "자차",
}
```

| 필드 | 필수 | 설명 |
|---|---:|---|
| `referenceCardId` | O | 사용자가 선택한 레퍼런스 카드 ID |
| `travelPurpose` | 권장 | 여행 목적 7가지 중 1개 |
| `transportType` | 권장 | 자차/대중교통/도보중심 |
| `visitTime` | 제외 | 점수 계산에서 사용하지 않음. 보내도 엔진에서 무시 |

---

## 2. 백엔드 내부에서 추가하는 값

| 필드 | 설명 |
|---|---|
| `currentMonth` | 서버 날짜 기준 현재 월. 계절 계산에 사용 |
| `totalExposureByPlaceId` | 선택 사항. 전체 누적 노출 수 |
| `recentExposureByPlaceId` | 선택 사항. 최근 노출 수 |
| `routeDistanceKmByPlaceId` | 선택 사항. 1번 카드 기준 거리값 |

---

## 3. 추천 응답 예시

```json
{
  "status": "DONE",
  "resultType": "RECOMMEND",
  "score": 83,
  "message": "추천 카드 3개 생성 완료",
  "resultData": {
    "cards": [
      {
        "rank": 1,
        "role": "BEST_SCENE",
        "roleLabel": "최적 장면 카드",
        "placeId": "GOAT-048",
        "placeName": "아야진해수욕장",
        "city": "고성군",
        "primaryTheme": "바다·해안 무드",
        "placeType": "해변",
        "photoPoint": "에메랄드빛 바다, 백사장, 갯바위",
        "score": {
          "baseScore": 86,
          "routeDistanceBonus": 0,
          "displayScore": 86
        },
        "reasons": ["선택한 테마와 장소 테마가 일치합니다."],
        "cautions": ["좌표 또는 길찾기 거리값이 없으면 연계 거리 보너스는 0점 처리됩니다."],
        "imageUrl": null,
        "address": null
      }
    ],
    "alternatives": [],
    "warnings": [
      {
        "code": "CARD3_PURPOSE_FALLBACK",
        "message": "카드3 조건맞춤 후보 중 travelPurpose와 purpose_tags가 일치하는 장소가 없어 전체 후보로 fallback했습니다.",
        "details": {
          "travelPurpose": "먹거리·야간탐방"
        }
      }
    ]
  },
  "failReason": null
}
```


`warnings`가 있으면 엔진이 기본적으로 `[GOAT_RECOMMENDATION_WARNING]` 서버 로그를 자동 출력합니다. 동일 payload는 기본 `logs/goat-recommendation-warnings.jsonl` JSONL 파일에도 자동 저장됩니다. `warningLogFilePath` 요청값 또는 `GOAT_RECOMMENDATION_LOG_FILE` 환경변수로 파일 경로를 바꿀 수 있습니다.

---

## 4. 프론트가 반드시 쓰는 응답값

| 경로 | UI 사용 |
|---|---|
| `status` | 성공/실패 상태 분기 |
| `message` | 처리 결과 메시지 |
| `resultData.cards` | 추천 카드 3개 렌더링 |
| `cards[].rank` | 카드 번호 |
| `cards[].roleLabel` | 카드 역할 라벨 |
| `cards[].placeName` | 장소명 |
| `cards[].city` | 지역명 |
| `cards[].photoPoint` | 사진 포인트 |
| `cards[].score.displayScore` | 화면 표시 점수 |
| `cards[].reasons` | 추천 이유 |
| `cards[].cautions` | 주의사항 |
| `cards[].imageUrl` | 대표 이미지. 없으면 placeholder |
| `cards[].address` | 주소. 없으면 장소명 검색 |

---

## 5. 실패 응답

```json
{
  "status": "FAILED",
  "resultType": "UNKNOWN",
  "score": null,
  "message": "추천 로직 실행 중 오류가 발생했습니다.",
  "resultData": null,
  "failReason": "UNKNOWN_ERROR"
}
```

프론트는 이 경우 재시도 화면을 보여주면 됩니다.

---

## 6. 프론트/백엔드 역할 분리

| 역할 | 하지 않아도 되는 것 | 해야 하는 것 |
|---|---|---|
| 프론트 | 점수 계산, 후보 선별 | 카드 선택 UI, 조건 선택 UI, 결과 카드 표시 |
| 백엔드 | 카드 UI 렌더링 | 요청값 검증, 추천 엔진 실행, 결과 저장/응답 |

---

## 7. 지도앱 연결 규칙

현재 `address`, `latitude`, `longitude`가 없을 수 있습니다.

| 데이터 상태 | 지도 연결 방식 |
|---|---|
| `latitude/longitude` 있음 | 좌표 기반 지도앱 연결 |
| `address` 있음 | 주소 기반 검색 연결 |
| 둘 다 없음 | `placeName + city` 문자열 검색 연결 |

현재는 마지막 방식으로도 MVP 시연은 가능합니다.

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


## 2026-07-02 추가: 다시 추천 요청값

다시 추천 버튼을 누를 때는 프론트가 직전 추천 결과의 `requestId`를 `rerollOfRequestId`로 넘긴다.

```json
{
  "referenceCardId": "REF_SEA_02",
  "travelPurpose": "사진·포토스팟",
  "transportType": "자차",
  "rerollOfRequestId": "REQ_SERVICE_FIRST"
}
```

백엔드는 `rerollOfRequestId`에 연결된 직전 카드 3개의 `placeId`를 조회해 `excludePlaceIds`로 엔진에 전달한다. 따라서 방금 본 카드 3개는 다시 추천 결과에서 강제로 제외된다.

추천 결과 생성 후에는 카드 3개를 `recommendation_exposures`에 저장한다. 이후 다음 추천 요청에서 `recentExposureByPlaceId`, `totalExposureByPlaceId`, `themeAverageExposure`를 계산해 엔진에 넘기면 재노출 방지 보정이 실제로 작동한다.

응답의 `resultData.requestId`는 다음 `다시 추천` 요청에서 `rerollOfRequestId`로 사용한다.

```json
{
  "status": "DONE",
  "resultType": "RECOMMEND",
  "resultData": {
    "requestId": "REQ_SERVICE_FIRST",
    "cards": []
  }
}
```
