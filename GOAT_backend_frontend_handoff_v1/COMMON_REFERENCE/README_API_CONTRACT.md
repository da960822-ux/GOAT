# GOAT 백엔드·프론트 API 계약서

> 프론트와 백엔드가 서로 맞춰야 하는 최소 요청/응답 형식입니다.

---

## 1. 추천 요청 API 예시

```http
POST /api/recommend-from-tags
Content-Type: application/json
```

### Request Body

```json
{
  "referenceCardId": "REF_SEA_02",
  "travelPurpose": "사진·포토스팟",
  "transportType": "자차",
  "visitTime": "오후"
}
```

| 필드 | 필수 | 설명 |
|---|---:|---|
| `referenceCardId` | O | 사용자가 선택한 레퍼런스 카드 ID |
| `travelPurpose` | 권장 | 여행 목적 7가지 중 1개 |
| `transportType` | 권장 | 자차/대중교통/도보중심 |
| `visitTime` | 권장 | 새벽/오전/한낮/오후/저녁/야간 |
| `excludeIds` | 선택 | 다시 추천 시 제외할 장소 ID 배열 |

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
  "success": true,
  "code": "SUCCESS",
  "message": "추천 장소를 조회했습니다.",
  "data": {
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
          "placeId": "GOAT-044",
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
          "cautions": [],
          "imageUrl": null,
          "address": "강원특별자치도 고성군 토성면 아야진해변길 157"
        }
      ],
      "alternatives": [],
      "warnings": []
    },
    "failReason": null
  }
}
```

---

## 4. 프론트가 반드시 쓰는 응답값

| 경로 | UI 사용 |
|---|---|
| `success` | API 성공/실패 상태 분기 |
| `message` | 처리 결과 메시지 |
| `data.resultData.cards` | 추천 카드 3개 렌더링 |
| `data.resultData.cards[].rank` | 카드 번호 |
| `data.resultData.cards[].roleLabel` | 카드 역할 라벨 |
| `data.resultData.cards[].placeName` | 장소명 |
| `data.resultData.cards[].city` | 지역명 |
| `data.resultData.cards[].photoPoint` | 사진 포인트 |
| `data.resultData.cards[].score.displayScore` | 화면 표시 점수 |
| `data.resultData.cards[].reasons` | 추천 이유 |
| `data.resultData.cards[].cautions` | 주의사항 |
| `data.resultData.cards[].imageUrl` | 대표 이미지. 없으면 placeholder |
| `data.resultData.cards[].address` | 주소. 없으면 장소명 검색 |

---

## 5. 실패 응답

```json
{
  "success": false,
  "code": "INVALID_REQUEST",
  "message": "요청값이 올바르지 않습니다.",
  "data": null
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

현재 61개 장소 데이터에는 `address`, `latitude`, `longitude`가 있습니다. 그래도 운영 중 누락이나 검증 전 데이터가 섞일 수 있으므로 fallback은 유지합니다.

| 데이터 상태 | 지도 연결 방식 |
|---|---|
| `latitude/longitude` 있음 | 좌표 기반 지도앱 연결 |
| `address` 있음 | 주소 기반 검색 연결 |
| 둘 다 없음 | `placeName + city` 문자열 검색 연결 |

현재는 좌표/주소 기반 연결을 우선 사용하고, 누락 시 마지막 방식으로도 MVP 시연이 가능합니다.
