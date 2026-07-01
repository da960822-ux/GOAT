# 프론트엔드 전달 README — GOAT 카드 UI 데이터 사용법

> 이 폴더는 프론트엔드가 레퍼런스 카드 화면과 추천 결과 화면을 만들 때 사용하는 파일입니다.

![데이터 사용 지도](../assets/03_data_field_map.png)

---

## 1. 프론트가 받아야 하는 파일

| 파일 | 프론트 사용 여부 | 설명 |
|---|---:|---|
| `data/goat_reference_cards_v2_balanced.json` | 필수 | 사용자가 처음 고르는 21개 레퍼런스 카드 UI 데이터 |
| `types/goatFrontendRecommendationTypes.ts` | 권장 | 프론트 요청/응답 타입 정의 |
| `examples/reference_card_ui_sample.json` | 참고 | 레퍼런스 카드 UI에 어떤 값만 보여줄지 예시 |
| `examples/recommendation_result_sample.json` | 참고 | 백엔드 추천 결과 응답 예시 |

프론트는 장소 전체 JSON을 직접 들고 있을 필요가 없습니다.  
장소 점수 계산은 백엔드가 하고, 프론트는 **카드 선택값 전송 + 결과 표시**만 담당하면 됩니다.

---

## 2. 프론트 전체 흐름

```txt
1. goat_reference_cards_v2_balanced.json 로드
2. isActive === true 인 카드만 화면에 표시
3. 사용자가 레퍼런스 카드 1개 선택
4. 사용자가 여행 목적/이동수단/시간대 선택
5. 백엔드에 referenceCardId + 조건값 전송
6. 백엔드 응답 resultData.cards 3개 표시
```

---

## 3. 레퍼런스 카드 UI에서 보여줄 값

`goat_reference_cards_v2_balanced.json` 안의 `reference_cards` 배열을 사용합니다.

| 필드 | UI 표시 여부 | 의미 |
|---|---:|---|
| `referenceCardId` | 숨김/전송용 | 백엔드에 보내는 카드 ID |
| `displayOrder` | 정렬용 | 카드 표시 순서 |
| `title` | 표시 | 카드 제목 |
| `subtitle` | 표시 | 카드 설명 한 줄 |
| `uiKeywords` | 표시 | 카드 밑에 보여줄 짧은 키워드 |
| `primaryTheme` | 숨김/전송 가능 | 카드가 대표하는 7개 테마 중 1개 |
| `sceneTags` | 숨김 | 백엔드 점수 계산용 장면 태그 |
| `mood_tags` | 숨김 | 백엔드 점수 계산용 감성 태그 |
| `recommendedPurpose` | 숨김/초기값 | 카드에 어울리는 여행 목적 |
| `recommendedBestTime` | 숨김/초기값 | 카드에 어울리는 시간대 |
| `recommendedTransport` | 숨김/초기값 | 카드에 어울리는 이동수단 |
| `candidatePlaceIds` | 프론트 표시 X | 백엔드 후보 제한용 |
| `coveragePlaceIds` | 프론트 표시 X | 58개 장소 균등 노출 보정용 |

### UI 카드 예시

```tsx
<Card>
  <h3>{card.title}</h3>
  <p>{card.subtitle}</p>
  {card.uiKeywords.map(keyword => <Chip>{keyword}</Chip>)}
</Card>
```

---

## 4. 프론트가 백엔드에 보내는 요청값

```ts
{
  referenceCardId: "REF_SEA_02",
  travelPurpose: "사진·포토스팟",
  transportType: "자차",
  visitTime: "오후"
}
```

| 요청값 | 화면에서 받는 방식 |
|---|---|
| `referenceCardId` | 사용자가 누른 레퍼런스 카드에서 가져옴 |
| `travelPurpose` | 목적 선택 버튼/셀렉트 |
| `transportType` | 자차/대중교통/도보중심 선택 |
| `visitTime` | 새벽/오전/한낮/오후/저녁/야간 선택 |

`currentMonth`는 백엔드가 서버 시간으로 계산해도 됩니다.

---

## 5. 추천 결과 화면에서 쓰는 값

백엔드 응답의 `resultData.cards` 배열을 사용합니다.

| 응답 필드 | UI 사용 방법 |
|---|---|
| `rank` | 1, 2, 3 카드 번호 |
| `roleLabel` | “최적 장면 카드”, “같은 무드 대안 카드”, “조건 맞춤 카드” 표시 |
| `placeName` | 장소명 |
| `city` | 지역명 |
| `primaryTheme` | 카드 배지 또는 상세 정보 |
| `placeType` | 장소 유형 |
| `photoPoint` | 사진 포인트 설명 |
| `recommendationUse` | 추천 용도 문구 |
| `score.displayScore` | 화면에 보여줄 점수 |
| `reasons` | 추천 이유 리스트 |
| `cautions` | 주의사항 리스트 |
| `bestTime` | 추천 방문 시간 |
| `seasonTags` | 추천 계절 |
| `purposeTags` | 어울리는 여행 목적 |
| `accessibility` | 자차/대중교통 접근성 표시 |
| `imageUrl` | 대표 이미지. 현재 없으면 placeholder 사용 |
| `address` | 주소. 현재 없으면 지도 검색은 placeName 중심으로 처리 |

---

## 6. 추천 카드 UI 구성 예시

```tsx
<RecommendationCard>
  <img src={card.imageUrl ?? DEFAULT_PLACE_IMAGE} />
  <Badge>{card.roleLabel}</Badge>
  <h2>{card.placeName}</h2>
  <p>{card.city} · {card.placeType}</p>
  <strong>{card.score.displayScore}점</strong>
  <p>{card.photoPoint}</p>

  <section>
    {card.reasons.map(reason => <li>{reason}</li>)}
  </section>

  {card.cautions.length > 0 && (
    <section>
      {card.cautions.map(caution => <li>{caution}</li>)}
    </section>
  )}
</RecommendationCard>
```

---

## 7. 프론트에서 조심할 점

| 상황 | 처리 방법 |
|---|---|
| `imageUrl`이 없음 | 기본 placeholder 이미지 사용 |
| `address`가 없음 | 지도앱 연결 시 장소명 + city로 검색 |
| `status === FAILED` | “추천을 만들지 못했어요. 다시 시도해주세요.” 표시 |
| `warnings`가 있음 | 개발 중에는 console 표시, 운영 화면에는 숨겨도 됨 |
| `score.displayScore`와 `selectionScore`가 다름 | 화면에는 `displayScore`만 표시 |

---

## 8. 지금 프론트가 바로 만들 수 있는 화면

| 화면 | 가능 여부 | 필요한 파일 |
|---|---:|---|
| 레퍼런스 카드 선택 화면 | 가능 | `goat_reference_cards_v2_balanced.json` |
| 조건 선택 화면 | 가능 | 타입 파일의 `PurposeTag`, `TransportType`, `BestTime` |
| 추천 결과 카드 3개 화면 | 가능 | `recommendation_result_sample.json`로 Mock 가능 |
| 지도앱 연결 | 일부 가능 | 지금은 `placeName + city` 검색. `address` 채우면 더 정확해짐 |

---

## 9. 프론트가 백엔드에 요청할 것

백엔드 API 응답은 최소 아래 구조로 내려오면 됩니다.

```ts
{
  status: "DONE",
  resultType: "RECOMMEND",
  score: number,
  resultData: {
    cards: RecommendationCardForUI[]
  }
}
```

프론트는 `cards.length === 3`이면 결과 화면을 보여주고, 아니면 빈 상태/재시도 화면을 보여주면 됩니다.
