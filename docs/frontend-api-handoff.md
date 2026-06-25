# GOAT 프론트엔드 연동 API 명세

> 버전: 0.4.0
> 기준일: 2026-06-24  
> OpenAPI 원본: `lib/api-spec/openapi.yaml`  
> 생성 TypeScript 클라이언트: `lib/api-client-react/src/generated/`

## 1. 연결 기본값

로컬 백엔드 주소:

```text
http://localhost:3000
```

모든 앱 API의 공통 경로:

```text
/api
```

프론트 환경변수에는 `/api`를 붙이지 않은 서버 주소를 설정한다.

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

호출 구조:

```text
프론트 → {EXPO_PUBLIC_API_BASE_URL}/api/... → Express 백엔드
```

관광공사 인증키는 프론트에 넣지 않는다. 백엔드의 `KTO_SERVICE_KEY`만 사용한다.

## 2. API 목록

| 기능 | Method | Path | 프론트 사용 위치 |
|---|---|---|---|
| 서버 상태 | GET | `/api/healthz` | 서버 연결 확인 |
| 감성 목록 | GET | `/api/moods` | 감성 선택 화면 |
| 장소 추천 | POST | `/api/recommend-from-tags` | 여행 조건 완료·다시 추천 |
| 장소 상세 | GET | `/api/places/{id}` | 상세 화면 |
| 관광공사 프록시 | GET | `/api/kto` | 사진·주소·상세정보·방문 집중도 |

## 3. 공통 성공·오류 형식

여행 도메인 API의 성공 응답:

```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "처리 결과 메시지",
  "data": {}
}
```

오류 응답:

```json
{
  "success": false,
  "code": "INVALID_REQUEST",
  "message": "요청값이 올바르지 않습니다.",
  "data": null
}
```

주요 오류 코드:

| HTTP | code | 의미 |
|---:|---|---|
| 400 | `INVALID_REQUEST` | 필수값·enum·JSON 형식 오류 |
| 400 | `INVALID_MOOD_ID` | 지원하지 않는 moodId |
| 404 | `PLACE_NOT_FOUND` | 존재하지 않는 장소 ID |
| 404 | `NOT_FOUND` | 존재하지 않는 API 경로 |
| 500 | `INTERNAL_SERVER_ERROR` | 처리 중 서버 오류 |

## 4. GET /api/healthz

서버 프로세스가 요청을 받을 수 있는지 확인한다.

응답:

```json
{
  "status": "ok"
}
```

이 API만 공통 `success/code/message/data` 형식을 사용하지 않는다.

## 5. GET /api/moods

사용자가 선택할 검증된 감성 조합 12개를 반환한다.

응답 예시:

```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "감성 카테고리를 조회했습니다.",
  "data": {
    "moods": [
      {
        "id": "alps-meadow",
        "name": "알프스 고원 목장",
        "description": "초원과 목장이 펼쳐진 탁 트인 고원",
        "keywords": ["초원", "목장", "알프스"]
      }
    ]
  }
}
```

지원하는 moodId:

| moodId | 화면 이름 |
|---|---|
| `california-coast` | 캘리포니아 해안도로 |
| `japan-small-town` | 일본 소도시 철길 |
| `alps-meadow` | 알프스 고원 목장 |
| `ryokan-lodging` | 교토 료칸 숙소 |
| `rainy-canyon` | 흐린 날 협곡 |
| `nordic-winter` | 북유럽 겨울 숲 |
| `retro-night-market` | 레트로 야간 시장 |
| `plateau-stars` | 몽골 고원 별보기 |
| `bali-surf` | 발리 서핑 해변 |
| `europe-garden` | 유럽 정원·성당 |
| `lake-reflection` | 호수 반영 SNS |
| `japan-retro-cafe` | 일본 레트로 카페 |

프론트는 이 목록을 하드코딩하지 않고 응답의 `moods` 배열을 렌더링한다.

## 6. POST /api/recommend-from-tags

선택한 감성과 여행 조건을 기준으로 중복 없는 장소 3개를 반환한다.

### 요청 타입

```ts
type RecommendFromTagsRequest = {
  moodId: string;
  preferences?: {
    companion: "혼자" | "연인" | "친구" | "가족";
    transport: "자차" | "대중교통";
    visitTime?: "오전" | "오후" | "일몰" | "저녁" | "밤/새벽" | null;
    purpose: "가볍게 산책" | "사진 위주" | "액티비티" | "조용한 휴식";
  };
  origin?: {
    type: "current" | "region" | "skip";
    latitude?: number;
    longitude?: number;
    regionName?: string;
  };
  excludeIds?: string[];
};
```

- `moodId`만 필수다.
- `excludeIds`는 중복 없이 최대 58개이며 다시 추천할 때 현재 카드 ID를 전달한다.
- `origin`은 이전 프론트 호환을 위해 받지만 현재 추천 점수와 거리 표시에 사용하지 않는다.
- 사용자가 선택한 `visitTime`은 감성 조합의 기본 시간보다 우선한다.

요청 예시:

```json
{
  "moodId": "alps-meadow",
  "preferences": {
    "companion": "가족",
    "transport": "자차",
    "visitTime": "오전",
    "purpose": "사진 위주"
  },
  "origin": {
    "type": "skip"
  }
}
```

### 성공 응답

```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "추천 장소를 조회했습니다.",
  "data": {
    "moodId": "alps-meadow",
    "appliedTags": [
      "초원", "목장", "알프스", "가족여행", "동물", "자연친화", "탁트임",
      "고원", "설경", "유럽감성", "숲", "호수", "정원", "자작나무",
      "해안도로", "오션뷰", "전망대", "풍력발전기"
    ],
    "seedPoolSize": 58,
    "candidatePoolSize": 43,
    "poolPolicy": "PRIMARY43",
    "poolReason": "기본 방문지 추천이므로 검증 완료 비숙박 1차 pool로 좁혔습니다.",
    "fallbackUsed": false,
    "adaptivePoolRetryUsed": false,
    "recommendations": [
      {
        "place": {
          "place_id": "GOAT-017",
          "city": "평창군",
          "region_group": "고원권",
          "place_name": "대관령양떼목장",
          "place_type": "목장/초원",
          "primary_mood": "스위스 알프스 목장",
          "mood_tags": ["양떼목장", "알프스", "초원", "설경", "가족여행"],
          "photo_point": "울타리 초원, 양떼, 능선 조망",
          "best_time": "오전",
          "best_season": "여름,겨울",
          "accessibility": "대중 중 / 자차 상",
          "data_status": "confirmed",
          "recommendation_use": "목장 코스 추천",
          "note": "목장권역 중 개별 장소"
        },
        "role": "장면 최적",
        "score": 92.8,
        "reason": "선택한 분위기와 알프스, 초원, 설경 태그가 맞고, 울타리 초원, 양떼, 능선 조망에서 사진 결과물이 기대돼요.",
        "matchedTags": ["초원", "목장", "알프스", "가족여행", "능선", "설경"],
        "scoreBreakdown": {
          "tag": 146.7,
          "sceneSpecific": 23,
          "region": 26,
          "lodgingIntent": 0,
          "season": 5,
          "time": 4,
          "weather": 0,
          "companion": 6,
          "travelPurpose": 3,
          "transport": 6,
          "dataStatus": 3,
          "directMatchCount": 4
        },
        "safetyNotes": [],
        "weatherFit": "보통",
        "parkingInfo": "자차 접근성 좋음"
      }
    ]
  }
}
```

### 응답 필드 설명

| 필드 | 설명 |
|---|---|
| `appliedTags` | 정규화·확장을 포함해 엔진이 적용한 태그 |
| `seedPoolSize` | 전체 관리 후보 수, 항상 58 |
| `candidatePoolSize` | 실제 계산한 후보 수, 일반적으로 43 또는 58 |
| `poolPolicy` | `PRIMARY43` 또는 `ALL58` |
| `fallbackUsed` | 점수가 약해 고정 fallback을 사용했는지 |
| `adaptivePoolRetryUsed` | 43개 결과가 약해 58개로 재계산했는지 |
| `role` | `장면 최적`, `같은 분위기 대안`, `조건 맞춤` |
| `score` | v1.3+ 표시 점수, 0~98 |
| `matchedTags` | 해당 장소 점수에 실제로 기여한 태그 |
| `scoreBreakdown` | QA용 세부 점수, 일반 사용자 화면에는 표시하지 않음 |
| `safetyNotes` | 운영·통제·도로·해안 관련 안내 |
| `parkingInfo` | 실제 주차 가능 여부가 아니라 seed의 자차 접근성 요약 |

현재 추천에는 `distanceKm`이 없다.

## 7. GET /api/places/{id}

58개 seed 장소 중 하나를 ID로 조회한다.

요청 예시:

```text
GET /api/places/GOAT-017
```

성공 응답:

```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "장소를 조회했습니다.",
  "data": {
    "place": {
      "place_id": "GOAT-017",
      "place_name": "대관령양떼목장"
    }
  }
}
```

없는 ID:

```json
{
  "success": false,
  "code": "PLACE_NOT_FOUND",
  "message": "장소를 찾을 수 없습니다.",
  "data": null
}
```

## 8. GET /api/kto

관광공사 API를 서버에서 대신 호출하는 프록시다.

```text
GET /api/kto?path={관광공사 경로}&{관광공사 파라미터}
```

프론트는 `serviceKey`를 보내지 않는다. Express가 서버 환경변수 `KTO_SERVICE_KEY`를 추가한다.

예시:

```text
GET /api/kto
  ?path=KorService2/searchKeyword2
  &keyword=대관령양떼목장
  &MobileOS=ETC
  &MobileApp=GOAT
  &_type=json
```

현재 사용하는 경로:

| 목적 | path |
|---|---|
| 관광지 검색 | `KorService2/searchKeyword2` |
| 공통 상세 | `KorService2/detailCommon2` |
| 소개 상세 | `KorService2/detailIntro2` |
| 장소명 관광사진 검색 | `PhotoGalleryService1/gallerySearchList1` |
| 방문 집중도 | `TatsCnctrRateService/tatsCnctrRatedList` |

KTO 프록시 응답은 관광공사 원본 JSON이며 공통 성공 응답으로 감싸지 않는다.

실패 예시:

```json
{
  "error": "KTO service key not configured on server"
}
```

관광공사 호출 실패는 추천 API 실패로 이어지지 않는다. 프론트는 seed 정보·기본 이미지·`unknown` 상태로 대체한다.

### 8.1 사진 조회

`POST /api/recommend-from-tags`와 `GET /api/places/{id}` 응답에는 관광공사 사진 URL이 포함되지 않는다. 카드와 상세 화면이 장소 정보를 받은 뒤 기존 `usePlacePhoto` Hook으로 사진을 별도 조회한다.

```ts
const { photo, loading } = usePlacePhoto(
  place.place_name,
  place.primary_mood,
  place.mood_tags,
  place.city,
);
```

사진 조회 순서:

```text
PhotoGalleryService1/gallerySearchList1
→ 장소명·공식 검색 별칭으로 검색
→ 촬영 지역과 place.city 검증
→ 없으면 KorService2/searchKeyword2의 firstimage
→ 모두 없으면 imageUrl: null
```

관광사진 요청 예시:

```text
GET /api/kto
  ?path=PhotoGalleryService1/gallerySearchList1
  &keyword=헌화로
  &numOfRows=5
  &pageNo=1
  &MobileOS=ETC
  &MobileApp=GOAT
  &_type=json
```

관광사진 원본 응답의 주요 필드:

```json
{
  "response": {
    "header": {
      "resultCode": "0000",
      "resultMsg": "OK"
    },
    "body": {
      "items": {
        "item": [
          {
            "galContentId": "사진 ID",
            "galTitle": "헌화로",
            "galWebImageUrl": "http://...jpg",
            "galPhotographyLocation": "강원도 강릉",
            "galSearchKeyword": "검색 키워드"
          }
        ]
      }
    }
  }
}
```

프론트에서 사용하는 정규화 결과:

```ts
type KTOPhotoResult = {
  imageUrl: string | null;
  title?: string;
  location?: string;
  keywords?: string[];
  source: "KTO_PHOTO_API" | "KTO_AWARD_PHOTO_API" | "fallback";
};
```

주의사항:

- 관광정보의 `contentId`를 `galleryList1`에 전달하지 않는다. 두 API의 ID는 사진 검색용으로 호환되지 않는다.
- 촬영 지역이 장소의 `city`와 다르면 사진을 사용하지 않는다.
- `금진해변·헌화로 드라이브 코스`는 `헌화로`, `금진해변` 순으로 별칭 검색한다.
- `두둥실`처럼 다른 지역의 동명 장소만 검색되면 fallback 처리한다.

### 8.2 방문 집중도 조회

```ts
const { concentration, loading } = useVisitConcentration(
  place.place_name,
  place.city,
);
```

요청 예시:

```text
GET /api/kto
  ?path=TatsCnctrRateService/tatsCnctrRatedList
  &pageNo=1
  &numOfRows=30
  &MobileOS=ETC
  &MobileApp=GOAT
  &areaCd=51
  &signguCd=51110
  &tAtsNm=레고랜드 코리아 리조트
  &_type=json
```

- `areaCd=51`은 강원특별자치도다.
- `signguCd`는 장소의 `city`를 관광지 시군구 코드로 변환한 값이다.
- `cnctrRate`는 가장 붐비는 시기를 100으로 본 상대 집중률이다.
- 현재 화면 구간은 `0~39.99: low`, `40~69.99: medium`, `70 이상: high`다.
- 관광공사에 없는 장소나 호출 실패는 `unknown`이다.
- 추천 점수와 순위에는 반영하지 않고 카드·상세 안내에만 사용한다.

프론트 정규화 타입:

```ts
type KTOVisitConcentration = {
  concentrationLevel: "low" | "medium" | "high" | "unknown";
  trendLabel?: string;
  concentrationRate?: number;
  baseDate?: string;
  source: "KTO_VISIT_CONCENTRATION" | "fallback";
};
```

### 8.3 현재 관광사진 연결 범위

2026-06-24 실제 API 조회 기준이다. 관광공사 데이터 변경에 따라 달라질 수 있다.

사진 연결 34개:

```text
GOAT-001 제이드가든
GOAT-003 춘천 산토리니
GOAT-004 해피초원목장
GOAT-005 아웃오브파크
GOAT-010 소금산 그랜드밸리
GOAT-011 알파카월드
GOAT-012 원대리 자작나무숲
GOAT-013 인제성당
GOAT-014 한반도섬
GOAT-015 알펜시아 리조트
GOAT-016 육백마지기
GOAT-017 대관령양떼목장
GOAT-018 하늘목장
GOAT-019 삼양라운드힐
GOAT-021 삼탄아트마인
GOAT-022 민둥산
GOAT-023 매봉산 바람의 언덕
GOAT-024 태기산
GOAT-025 안목해변 카페거리
GOAT-026 하슬라아트월드
GOAT-027 정동진 썬크루즈 리조트
GOAT-028 BTS 버스정류장
GOAT-030 안반데기
GOAT-031 금진해변·헌화로 드라이브 코스
GOAT-035 월화거리
GOAT-036 무릉별유천지
GOAT-040 외옹치 바다향기로
GOAT-044 서피비치
GOAT-048 아야진해수욕장
GOAT-050 하늬라벤더팜
GOAT-051 능파대
GOAT-055 장호항
GOAT-056 용화해변
GOAT-058 한탄강 주상절리길
```

사진 미연결 24개:

```text
GOAT-002 레고랜드 코리아 리조트
GOAT-006 교토정원
GOAT-007 스테이 조각밤
GOAT-008 이와림
GOAT-009 뮤지엄 SAN
GOAT-020 발왕산 천년주목숲길·애니포레
GOAT-029 정동진 철길 건널목
GOAT-032 교동 소품샵 거리
GOAT-033 휴식 료칸 풀빌라
GOAT-034 유메모리 리조트
GOAT-037 어달삼거리
GOAT-038 묵호항 일대
GOAT-039 묵호등대·논골담길
GOAT-041 속초 서점 투어 골목
GOAT-042 카페 흰다정
GOAT-043 속초 관광수산시장·대포항
GOAT-045 죽도해변·인구해변·양리단길
GOAT-046 두둥실
GOAT-047 에이프레임(A-Frame)
GOAT-049 켄싱턴리조트 설악밸리
GOAT-052 사유의 숲
GOAT-053 쏠비치 삼척·산토리니 광장
GOAT-054 라메종드마리
GOAT-057 초곡용굴촛대바위길
```

## 9. 생성 클라이언트 사용

생성 파일은 직접 수정하지 않는다.

주요 함수:

```ts
import {
  getMoods,
  useGetMoods,
  recommendFromTags,
  getPlace,
  proxyKto,
} from "@workspace/api-client-react";
```

예:

```ts
const moods = await getMoods();

const result = await recommendFromTags({
  moodId: "alps-meadow",
  preferences: {
    companion: "가족",
    transport: "자차",
    visitTime: "오전",
    purpose: "사진 위주",
  },
});

const place = await getPlace(result.data.recommendations[0].place.place_id);
```

OpenAPI 변경 후 재생성:

```powershell
corepack pnpm --filter @workspace/api-spec run codegen
```

## 10. 로컬 실행

백엔드:

```powershell
corepack pnpm --filter @workspace/api-server run build
$env:PORT = "3000"
$env:KTO_SERVICE_KEY = "공공데이터포털에서 발급받은 키"
corepack pnpm --filter @workspace/api-server run start
```

프론트:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL = "http://localhost:3000"
corepack pnpm --filter @workspace/goat-mobile exec expo start --web --port 8081
```

Android 실기기는 `localhost` 대신 같은 Wi-Fi의 PC 내부 IP를 사용한다.

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:3000
```
