# GOAT 보조 사진 소스 전환 검토

검토일: 2026-09-13  
범위: 재검증 대상 31곳 중 BORDERLINE 5곳 + FAIL 대표 8곳, COMMERCIAL 12곳

## 결론

- `GOOD 0 / 후보 139`의 주원인은 판정 기준보다 **KTO 후보의 장면·계절·피사체 불일치**다. 레고랜드 사진에 테마파크 핵심 시설이 없고, 알파카월드 사진에 알파카가 없으며, PARENT 사진이 GOAT의 세부 장면을 보여주지 않는 사례가 반복됐다.
- 다만 `아웃오브파크`처럼 82점인데 photo_point의 일부가 빠졌다는 이유로 탈락한 사례는 기준이 과도하다. 운영 기준에서는 `해외감성 ≥30/40`, `photo_point ≥15/25`, 총점 `≥78`, 치명적 배제 사유 없음이면 GOOD으로 승격하는 보정이 적절하다.
- 이 보정을 적용해도 표본 13곳 중 명확한 승격 대상은 아웃오브파크 1곳뿐이다. 따라서 0이라는 숫자는 다소 경직됐지만, 보조 소스로 전환해야 한다는 결론은 유지된다.
- COMMERCIAL 12곳은 모두 고유 상호·주소 또는 공식/공공 근거가 있어 Google Places 매칭 대상으로 투입 가능하다. 현재 Places API 키가 없어 `place_id`와 `photos[]`를 실제 호출한 확정치는 0곳이며, 사전 매칭 가능성은 고신뢰 11곳·중신뢰 1곳이다.

## 사람이 확인할 표본 contact sheet

### BORDERLINE 5곳

| 장소 | contact sheet | 최상 후보 URL | 판정 사유 |
|---|---|---|---|
| 아웃오브파크 | [GOAT-005](./photo_source_review_samples/GOAT-005.jpg) | [KTO 후보](http://tong.visitkorea.or.kr/cms/resource/68/2727068_image2_1.jpg) | 에어스트림과 산악 배경은 미국 로드트립 감성이 강하다. 버스·영문 사인이 없다는 이유로 탈락시킨 것은 다소 엄격하며, 보정 기준에서는 조건부 GOOD이다. |
| 안목해변 카페거리 | [GOAT-024 A](./photo_source_review_samples/GOAT-024-a.jpg) / [B](./photo_source_review_samples/GOAT-024-b.jpg) | [2825585](https://tong.visitkorea.or.kr/cms2/website/85/2825585.jpg) | 사진 매력은 있으나 항공 해변 전경 또는 카페 내부가 대부분이다. 보드워크·카페 파사드가 한눈에 보이지 않는다. |
| 하슬라아트월드 | [GOAT-025](./photo_source_review_samples/GOAT-025.jpg) | [3020986](https://tong.visitkorea.or.kr/cms2/website/86/3020986.jpg) | 바다와 조각공원은 보이지만 지중해 절벽 미술관과 오션뷰 테라스라는 장면은 약하다. BORDERLINE 유지가 타당하다. |
| 죽도해변·인구해변·양리단길 | [GOAT-041](./photo_source_review_samples/GOAT-041.jpg) | [3041737](https://tong.visitkorea.or.kr/cms/resource/37/3041737_image2_1.jpg) | 일부 사진은 캘리포니아 서프타운 인상이 있다. 다만 죽도정·서핑숍 거리·노을 중 핵심 장면이 빠져 있어 보조 후보가 더 필요하다. |
| 허브나라농원 | [GOAT-056](./photo_source_review_samples/GOAT-056.jpg) | [2921409](https://tong.visitkorea.or.kr/cms/resource/09/2921409_image2_1.jpg) | 정원 사진은 충분하지만 평범한 국내 수목원으로 읽힌다. 셰익스피어·팔레트 가든의 구조가 보이는 사진이 필요하다. |

### FAIL 대표 8곳

| 장소 | contact sheet | 최상 후보 URL | 판정 사유 |
|---|---|---|---|
| 레고랜드 코리아 리조트 | [GOAT-002](./photo_source_review_samples/GOAT-002.jpg) | [3590383](https://tong.visitkorea.or.kr/cms2/website/83/3590383.jpg) | 정원과 일반 조형물뿐이다. 레고 호텔·미니랜드·컬러풀한 테마파크 정체성이 없다. 명백한 소스 문제다. |
| 해피초원목장 | [GOAT-004](./photo_source_review_samples/GOAT-004.jpg) | [4067681](https://tong.visitkorea.or.kr/cms/resource/81/4067681_image2_1.jpg) | 건조한 빈 운동장 중심이며 초원 능선·동물 방목·목장길이 없다. |
| 알파카월드 | [GOAT-011](./photo_source_review_samples/GOAT-011.jpg) | [3407993](http://tong.visitkorea.or.kr/cms/resource/93/3407993_image2_1.png) | 알파카 없이 숲속 데크만 보여 장소의 핵심 피사체가 사라졌다. |
| 발왕산 천년주목숲길·애니포레 | [GOAT-019](./photo_source_review_samples/GOAT-019.jpg) | [3302528](https://tong.visitkorea.or.kr/cms/resource/28/3302528_image2_1.jpg) | 전망 건물이 중심이고 천년주목·침엽수 숲길이 없다. 복합 장소를 한 엔티티 사진으로 해결하기 어렵다. |
| 태기산 | [GOAT-023](./photo_source_review_samples/GOAT-023.jpg) | [4068575](https://tong.visitkorea.or.kr/cms/resource/75/4068575_image2_1.jpg) | 여름 풍력발전기 사진이다. 요구 장면인 설산·상고대·눈꽃과 계절부터 다르다. |
| 어달삼거리 | [GOAT-035](./photo_source_review_samples/GOAT-035.jpg) | [3517368](https://tong.visitkorea.or.kr/cms/resource/68/3517368_image2_1.jpg) | 상위 POI인 어달항 보트 사진으로, 바다를 향해 뻗은 삼거리 도로 장면이 아니다. |
| 묵호항 일대 | [GOAT-036 A](./photo_source_review_samples/GOAT-036-a.jpg) / [B](./photo_source_review_samples/GOAT-036-b.jpg) | [2504256](https://tong.visitkorea.or.kr/cms2/website/56/2504256.jpg) | 항구 전경은 많지만 GOAT가 요구하는 저녁 야외 해산물 거리·야타이 분위기가 없다. |
| 켄싱턴호텔 평창 프렌치가든 | [GOAT-060](./photo_source_review_samples/GOAT-060.jpg) | [3440118](http://tong.visitkorea.or.kr/cms/resource/18/3440118_image2_1.jpg) | 연못·분수만 보이고 빌랑드리 모티브 자수정원과 허브가든 구조가 식별되지 않는다. |

## 사진 소스 우선순위 설계

### 1. KTO 적합 사진

- 장소와 장면이 모두 맞는 Photo Korea 사진을 최우선으로 유지한다.
- Photo Korea 관광사진 정보는 공공누리 제1유형으로 안내되므로 출처와 촬영자를 표시하고 상업적 이용·변형 시 해당 유형 조건을 준수한다.
- 일반 TourAPI `firstimage/detailImage`는 사진별 권리 정보가 동일하다고 가정하지 않는다. Photo Korea ID·촬영자·공공누리 표시가 확인되지 않으면 권리 확인 상태를 `REVIEW_REQUIRED`로 둔다.
- HTTP 429는 검색 실패일 뿐 `NO_ASSET` 근거로 사용하지 않는다.

### 2. Google Places Photos

- COMMERCIAL은 `GOAT명 + 주소`로 Text Search 후 `place_id`, `displayName`, `formattedAddress`를 대조한다.
- PARENT/COMPOSITE는 displayName 전체가 아니라 canonical POI로 조회한다. 예: `안목해변`, `어달항`, `묵호항`, `양리단길`, `발왕산 천년주목숲길`, `켄싱턴 프렌치 가든`.
- 사진은 `photos[]`의 resource name을 받은 뒤 Place Photos에서 런타임 조회한다. 사진 resource name은 저장·캐시하지 않고, 영구 저장은 `place_id`와 내부 선정 규칙만 허용하는 구조가 안전하다.
- 카드에는 Google Maps 출처를 명확히 표시하고, 확대 보기에서 사진 작성자 이름·프로필 링크와 개별 Google Maps 원본 링크를 제공한다.
- GOAT 앱은 카카오맵 링크를 제공하므로, Places 사진과 비Google 지도 기능이 약관상 “함께 사용”으로 해석될 위험을 출시 전 검토해야 한다. 사진 카드와 지도 기능을 명확히 분리하더라도 법무/Google 지원 확인 없이 확정 적용하지 않는다.

### 3. 공식 관광지·시설 이미지

- 공식 홈페이지에 사진이 보인다는 사실만으로 재사용하지 않는다.
- 사용 가능한 경우는 `(a)` 명시적 미디어키트/프레스 라이선스, `(b)` 공공누리·CC 등 사진별 라이선스, `(c)` 시설의 서면 사용 허가 중 하나가 확보된 때로 제한한다.
- 허가 기록에는 원본 URL, 권리자, 허용 매체, 상업 이용·크롭·리사이즈 가능 여부, 표기 문구, 만료일을 저장한다.
- 춘천 산토리니처럼 지자체 관광 포털에 좋은 사진이 있어도 사진전 수상작·외부 촬영자 사진일 수 있으므로 별도 이용 허락을 확인한다.

### 4. 최종 fallback

- 자체 촬영 또는 시설 제공 원본을 우선한다.
- 다음 선택지는 상업용 스톡 라이선스 또는 지역 관광기관의 명시적 사용허가 이미지다.
- 그래도 없으면 엉뚱한 상위 POI 사진 대신 브랜드형 장소 카드/그래픽 fallback을 사용한다. fallback은 실제 사진처럼 오인되지 않게 표시한다.

## COMMERCIAL 12곳 Google Places 준비도

| 장소 | 매칭 준비도 | 근거/주의 |
|---|---|---|
| 춘천 산토리니 | HIGH | 고유 상호와 주소, 춘천 관광 포털 등 공공 관광 근거 확인 |
| 교토정원 | HIGH | 고유 상호·춘천 주소·춘천 로케이션 DB 확인 |
| 스테이 조각밤 | HIGH | 춘천 관광 숙박 DB와 주소 확인 |
| 이와림 | HIGH | 공식 홈페이지·사업장 주소 확인 |
| 휴식 료칸 풀빌라 | MEDIUM | 외부 예약 페이지 근거는 있으나 명칭 변형과 최신 영업 상태를 API 주소로 재확인해야 함 |
| 유메모리 리조트 | HIGH | 공식 링크 허브와 `YUMEMORI Resort&Wellness` 명칭 확인 |
| 카페 흰다정 | HIGH | 고유 상호·속초 위치·다수 장소 데이터 근거 확인 |
| 두둥실 | HIGH | 양양 주소와 발리풍 수영장 카페라는 장면 근거 확인 |
| 켄싱턴리조트 설악밸리 | HIGH | 공식 사이트·고유 주소·Google 호텔 엔티티 확인 |
| 하늬라벤더팜 | HIGH | 법인 상호와 고성 주소 확인 |
| 사유의 숲 | HIGH | 삼척 민간 스테이와 설계사례 근거 확인 |
| 라메종드마리 | HIGH | 고유 상호·삼척 주소·유럽풍 외관 근거 확인 |

따라서 현재 보고 가능한 수치는 다음과 같다.

- Google Places 매칭 투입 가능: **12/12**
- 사전 근거상 고신뢰: **11곳**, 중신뢰: **1곳**
- 실제 API `place_id + photos[]` 확인: **0/12** — Places API 키와 결제 연결이 없어 미실행
- API 키 확보 후 예상 검증 호출: 장소당 Text Search 1회, 후보 확정 후 Place Details 또는 Photos 조회

## 여전히 사진 확보가 어려운 장소

- `육백마지기`: 현재 공식 KTO 자산이 확인되지 않은 유일한 NO_ASSET. Google/지자체/직접 촬영로 별도 확보 필요.
- `어달삼거리`: 상위 POI 사진이 아닌 특정 도로 축 장면이 필요하다.
- `묵호항 일대`: 일반 항구 전경이 아니라 야간 야외 해산물 거리라는 시간·피사체 조건이 강하다.
- `발왕산 천년주목숲길·애니포레`: 복합 장소를 한 장으로 만족시키기 어렵다. 대표 장면을 하나로 재정의하거나 두 카드/갤러리 구성이 필요하다.
- `안목해변 카페거리`: 해변과 카페 파사드를 동시에 담는 구도가 드물다.
- `켄싱턴호텔 평창 프렌치가든`: canonical POI는 맞지만 프랑스식 자수정원의 구조가 드러나는 공식 사진이 부족하다.
- `태기산`: 겨울 상고대라는 계절 제약 때문에 상시 API 사진만으로 안정적으로 확보하기 어렵다.

## 적용 전에 필요한 조건

1. Google Cloud 프로젝트의 결제 계정 연결과 Places API (New) 활성화.
2. 서버 전용 API 키 또는 지원되는 OAuth 구성. 키는 앱 번들에 넣지 않고 서버 프록시에서 사용하며 API 제한과 서버 IP 제한을 적용.
3. Text Search/Place Details는 최소 field mask만 요청. `photos`는 Text Search Pro 등 별도 과금 tier를 유발할 수 있다.
4. Place Photos는 성공 요청 기준 월 1,000건 무료 사용 한도 후 1,000건당 미화 7달러 구간부터 시작한다. 최신 가격표는 적용 직전 재확인.
5. 사진 resource name/URL 영구 저장 금지, 작성자 attribution과 Google Maps 원본 링크 제공, Google Maps 로고 표시.
6. 카카오/네이버 지도 링크와 Places 콘텐츠의 동시 사용 방식에 대한 약관 검토.
7. 공식 시설 이미지용 서면 허가 템플릿과 권리 메타데이터 저장 필드 마련.

## 공식 근거

- [Google Place Photos (New)](https://developers.google.com/maps/documentation/places/web-service/place-photos)
- [Google Places 정책·표시 조건](https://developers.google.com/maps/documentation/places/web-service/policies)
- [Google Maps Platform 서비스별 약관](https://cloud.google.com/maps-platform/terms/maps-service-terms)
- [Google Maps Platform 가격표](https://developers.google.com/maps/billing-and-pricing/pricing)
- [Places API 키 설정](https://developers.google.com/maps/documentation/places/web-service/get-api-key)
- [Google API 키 보안 권고](https://developers.google.com/maps/api-security-best-practices)
- [공공데이터포털의 Photo Korea 활용 사례·공공누리 안내](https://www.data.go.kr/tcs/puc/selectPublicUseCaseView.do?bindCndCtgry=&bindCndCtgry=&prcuseCaseSn=1056408&prcuseType=&searchCondition1=&searchCondition2=&searchKeyword1=&sort-post=all)

