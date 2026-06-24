# GOAT API-first + DB/Seed Fallback 전략 v1.3

## 1. 결론

초기 개발에서는 한국관광공사 OpenAPI를 직접 호출해 장소 정보·사진·방문 집중률을 받아보고, 결과 품질이 낮을 때만 GOAT 58개 seed DB 또는 로컬 seed JSON으로 fallback한다.

단, OpenAPI만으로 “캘리포니아 해안도로”, “일본 소도시”, “알프스 목장” 같은 해외감성 장면을 바로 이해해 추천하기는 어렵다. API는 장소명·주소·좌표·이미지·개요를 보강하는 데 강하고, 장면/무드 추천 기준은 GOAT 태그 로직이 더 강하다.

따라서 MVP 권장 구조는 아래와 같다.

```txt
레퍼런스 카드/태그 선택
→ API keyword 검색
→ API 후보 정규화
→ 태그 기반 점수 계산
→ API 품질 게이트 통과 시 API 결과 사용
→ 품질 낮으면 GOAT seed 58개 추천 로직으로 fallback
```

## 2. 현재 코드 기준 점검

기존 `Korean-Travel-Guide.zip`에는 이미 API 호출 기반 코드가 일부 있다.

| 위치 | 현재 역할 | 판단 |
|---|---|---|
| `artifacts/api-server/src/routes/kto.ts` | `/api/kto` 프록시. KTO serviceKey를 서버에서 붙임 | 웹에서는 이 방식 권장 |
| `artifacts/goat-mobile/src/services/ktoApi.ts` | Web은 proxy, Native는 직접 KTO 호출 | Native 직접 호출은 가능하지만 키 노출 주의 |
| `ktoTourInfoApi.ts` | `searchKeyword2`, `detailCommon2`, `detailIntro2` 호출 | 장소 정보 보강용으로 좋음 |
| `ktoPhotoApi.ts` | 관광사진 API 이미지 조회 | 카드 이미지 보강용 |
| `ktoVisitApi.ts` | 방문 집중률 API 시도 | 실제 endpoint/파라미터 확인 필요 |
| `recommendationService.ts` | 구버전 43개 로컬 추천 | v1.3 추천 로직/API-first adapter로 교체 필요 |

## 3. API-first에서 API를 쓰는 위치

API를 “추천 후보 생성”에만 쓰면 결과가 불안정할 수 있다. 아래처럼 역할을 나눠야 한다.

| API 용도 | 권장 사용 방식 |
|---|---|
| 장소 검색 | 태그에서 만든 keyword로 후보 수집 |
| 주소/좌표 | 검색 결과 또는 상세 정보에서 보강 |
| 대표 이미지 | `firstimage` 우선, 없으면 관광사진 API 보조 |
| 방문 집중률 | 실시간 혼잡도가 아니라 향후 집중 가능성 참고 지표 |
| 주변 동선 | MVP 이후. 초기에는 선택 사항 |

## 4. API 품질 게이트

API 호출 결과가 아래 조건을 만족하면 API 결과를 사용한다.

| 항목 | 통과 기준 |
|---|---|
| 후보 수 | 정규화 후 3개 이상 |
| 강원 지역성 | 강원 지역 후보가 3개 이상 |
| 태그 일치도 | Top1 점수 35점 이상 |
| Top3 평균 | 25점 이상 |
| 카드 표시 품질 | Top3 중 2개 이상이 주소 또는 이미지 보유 |
| 제목 적합성 | 검색어와 무관한 축제/음식점/숙박만 나오지 않을 것 |
| API 안정성 | timeout/error 없음 |

하나라도 크게 깨지면 GOAT seed fallback을 사용한다.

## 5. fallback 기준

아래 상황이면 DB 또는 로컬 seed fallback이 정상이다.

```txt
- API 응답 자체가 실패했다.
- API 후보가 3개 미만이다.
- Top1 점수가 35점 미만이다.
- Top3 평균 점수가 25점 미만이다.
- 강원 외 지역이 섞인다.
- 이미지/주소가 거의 없다.
- 태그와 무관한 일반 검색 결과가 상위에 뜬다.
```

fallback 사용은 실패가 아니라 “추천 품질 보호 장치”로 설명한다.

## 6. API-first 요청/응답 권장 필드

요청에는 `dataSourceMode`를 추가한다.

```json
{
  "requestId": "demo-sea-road-001",
  "dataSourceMode": "api-first",
  "source": "reference-card",
  "extractedTags": ["바다", "해안도로", "캘리포니아", "로드트립", "일몰"],
  "moodTags": ["청량함", "이국적"],
  "sceneTags": ["드라이브", "오션뷰"],
  "regionGroup": "동해안권",
  "limit": 3,
  "poolMode": "auto"
}
```

응답에는 `dataSourceUsed`와 `apiQuality`를 추가한다.

```json
{
  "resultData": {
    "dataSourceRequested": "api-first",
    "dataSourceUsed": "api",
    "apiQuality": {
      "passed": true,
      "reason": "API 후보 3개 이상, Top3 평균 점수 기준 통과",
      "candidateCount": 7,
      "topScore": 52,
      "top3AverageScore": 39,
      "fallbackReason": null
    },
    "fallbackUsed": false,
    "recommendations": []
  }
}
```

fallback이면 아래처럼 표시한다.

```json
{
  "resultData": {
    "dataSourceRequested": "api-first",
    "dataSourceUsed": "seed-fallback",
    "apiQuality": {
      "passed": false,
      "reason": "API 후보가 3개 미만이라 seed fallback 사용",
      "candidateCount": 1,
      "topScore": 18,
      "top3AverageScore": 0,
      "fallbackReason": "API_CANDIDATES_TOO_FEW"
    },
    "fallbackUsed": true,
    "recommendations": []
  }
}
```

## 7. 프론트 표시 기준

프론트는 `dataSourceUsed`를 디버그/QA용으로만 확인한다.

| 값 | 의미 | 사용자 표시 |
|---|---|---|
| `api` | 실제 API 결과 사용 | 별도 표시 안 해도 됨 |
| `seed-fallback` | API 품질 부족으로 seed 추천 사용 | “일치도 높은 후보로 추천했어요” 정도 |
| `mock-fallback` | API/seed 둘 다 실패한 데모 fallback | 시연용에서만 사용 |

사용자에게 “API 실패”라고 직접 보여주지 않는다.

## 8. 백엔드 처리 순서

```txt
1. 프론트 요청 수신
2. dataSourceMode 확인
3. api-first면 태그에서 API 검색 keyword 생성
4. KTO API 호출
5. 후보 정규화
6. API 후보 품질 평가
7. 통과하면 API 후보를 카드로 변환
8. 실패하면 GOAT seed 58개 추천 로직 실행
9. 응답에 dataSourceUsed, apiQuality, fallbackUsed 포함
```

## 9. 중요한 주의사항

- API key를 프론트 코드에 직접 넣는 방식은 빠른 테스트에는 가능하지만 최종 앱/웹에서는 권장하지 않는다.
- 웹은 반드시 서버 proxy 또는 Edge Function을 통해 호출한다.
- Native 앱도 빌드에 포함된 `EXPO_PUBLIC_*` 값은 완전한 비밀값으로 보기 어렵다.
- 실제 공모전/배포 기준에서는 서버 환경변수 `KTO_SERVICE_KEY`처럼 비공개 이름으로 관리하는 편이 안전하다.
- API 결과가 나쁘다고 해서 추천 로직이 실패한 것은 아니다. GOAT는 API를 후보 보강/검증 데이터로 쓰고, 장면 감성 추천은 태그 로직으로 보정한다.
