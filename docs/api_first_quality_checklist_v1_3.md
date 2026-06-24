# API-first 품질 점검 체크리스트 v1.3

## 1. API-first 테스트 케이스

초기 API 직접 호출 방식은 아래 케이스로 점검한다.

| 케이스 | 검색 태그 | 기대 동작 |
|---|---|---|
| 바다/해안도로 | 바다, 해안도로, 캘리포니아, 로드트립 | API 후보가 부족하면 GOAT-031/044/040 fallback |
| 일본 소도시 | 일본감성, 철길, 바다, 골목 | API 후보가 약하면 GOAT-029/037/032 fallback |
| 알프스 목장 | 알프스, 목장, 초원 | API 후보가 약하면 GOAT-017/018/019 fallback |
| 료칸 숙소 | 료칸, 숙소, 자쿠지 | API 후보가 숙소로 잘 잡히면 API, 아니면 GOAT-007/008/033 fallback |
| 협곡/주상절리 | 협곡, 주상절리, 잔도 | API 후보가 부족하면 GOAT-058/010/057 fallback |
| 추상 무드 | 청량함, 이국적 | moodExpansion 후 API 검색, 약하면 seed fallback |

## 2. API 결과를 그대로 쓰면 안 되는 경우

아래 결과는 API 호출 성공이어도 품질 실패로 본다.

```txt
- 음식점/숙박/축제/행사가 의도와 무관하게 상위에 뜬다.
- 강원 지역이 아닌 장소가 섞인다.
- 주소나 이미지가 거의 없다.
- 검색어와 제목/개요가 거의 맞지 않는다.
- 후보가 3개 미만이다.
- 추천 이유를 만들 수 없을 정도로 개요/키워드가 비어 있다.
```

## 3. 점수화 기준

간단 MVP 기준:

```txt
직접 태그/제목 일치: +15
개요/키워드 일치: +8
강원 지역 확인: +10
이미지 있음: +5
주소/좌표 있음: +5
무관 카테고리 감점: -15
```

통과 기준:

```txt
Top1 >= 35
Top3 평균 >= 25
후보 3개 이상
Top3 중 2개 이상 주소/이미지 보유
```

## 4. QA 로그에 남길 값

```txt
requestId
inputTags
dataSourceRequested
dataSourceUsed
apiCandidateCount
apiTopScore
apiTop3AverageScore
fallbackReason
recommendedPlaceIds 또는 apiCandidateTitles
```

이 로그가 있어야 “API 결과가 왜 나빠서 DB/seed를 썼는지” 설명할 수 있다.
