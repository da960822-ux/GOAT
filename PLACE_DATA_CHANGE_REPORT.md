# 장소 데이터 변경 보고서

- 기준 압축파일: `C:\Users\smhrd\Downloads\GOAT-dev-jung.zip`
- 확인·수정일: 2026-07-14 (Asia/Seoul)
- 작업 원칙: 이번 압축파일을 유일한 구현·스키마·추천 로직 기준으로 사용

## 1. 작업 전 확인

- `git status --short --branch`를 먼저 실행했다. 상위 작업공간은 커밋이 없는 상태였고 기존 미추적 파일이 다수 있었으므로, 기존 폴더를 덮어쓰지 않고 `GOAT-dev-jung_place-tags-work/GOAT-dev-jung`에 새로 압축을 풀어 작업했다.
- `tar -tf C:\Users\smhrd\Downloads\GOAT-dev-jung.zip`으로 593개 항목을 끝까지 읽었고 종료 코드 0을 확인했다. 절대경로·상위경로 탈출 항목은 없었다.
- `pnpm-workspace.yaml`, 루트 `package.json`, `lib/travel-domain`의 추천 엔진·타입·canonical JSON이 모두 들어 있음을 확인했다.
- 별도의 깨끗한 재압축 해제본과 파일별 diff를 비교해 변경 범위를 검토했다.

## 2. 집계

| 구분 | 수 |
|---|---:|
| 기존 유지 장소 | 54 |
| 즉시 추가 활성 장소 | 4 |
| 활성 추천 장소 | 61 |
| 추천 제외 장소 | 0 |
| 전체 관리 장소 | 61 |

활성 장소의 테마별 수는 다음과 같다.

| primaryTheme | 활성 수 |
|---|---:|
| 바다·해안 무드 | 10 |
| 일본 소도시·골목 무드 | 8 |
| 알프스·고원·목장 무드 | 10 |
| 숲·정원·자연휴식 무드 | 11 |
| 레트로·도시·항구 무드 | 5 |
| 건축·전시·랜드마크 무드 | 8 |
| 휴양·카페·이국공간 무드 | 9 |

## 3. 이전 데이터에서 제외된 장소

아래 네 장소 자체는 데이터에서 제외된 상태를 유지한다. 이후 61개 장소를 `GOAT-001`~`GOAT-061`로 연속 재번호화했으므로, 아래 ID 번호는 현재 다른 장소에 다시 배정되어 있다.

- `GOAT-014` 한반도섬
- `GOAT-035` 월화거리
- `GOAT-041` 속초 서점 투어 골목
- `GOAT-043` 속초 관광수산시장·대포항

## 4. 즉시 활성 장소의 전체 태그

공통으로 공식 수치 좌표를 확인하지 못한 장소는 `latitude`, `longitude`, `coordinateSource`를 `null`로 유지했다. 대중교통 등급도 공식 근거가 부족하면 `null`로 두었다.

### GOAT-055 쏠비치 양양

- city / region_group: `양양군` / `동해안권`
- primaryTheme: `휴양·카페·이국공간 무드`
- mood_tags: `지중해감성`, `유럽감성`, `프리미엄`, `휴양감`, `이국적`, `낭만적`, `탁트임`
- sceneTags: `리조트`, `광장`, `바다`, `해안산책로`
- place_type / photo_point: `리조트/광장` / `스페인풍 백색 건물과 붉은 지붕, 베누스 광장, 동해 전망`
- purpose_tags: `숙소·리조트`, `사진·포토스팟`
- season_tags / best_time: `사계절` / `저녁`
- accessibility: `public_transport: 중`, `car: 상`
- recommendation_use: `리조트·사진스팟 추천`
- address: `강원특별자치도 양양군 손양면 선사유적로 678`
- 좌표: `null` / `null`, coordinateSource `null`

### GOAT-056 허브나라농원

- city / region_group: `평창군` / `고원권`
- primaryTheme: `숲·정원·자연휴식 무드`
- mood_tags: `유럽감성`, `자연친화`, `힐링`, `여유로움`, `조용함`, `컬러풀`, `아기자기함`
- sceneTags: `정원`, `꽃밭`, `산책로`, `카페`
- place_type / photo_point: `정원/농장` / `셰익스피어 가든, 팔레트 가든, 허브 온실과 계곡 산책로`
- purpose_tags: `산책·힐링`, `사진·포토스팟`, `카페·실내휴식`
- season_tags / best_time: `사계절` / `오전`
- accessibility: `public_transport: 중`, `car: 중`
- recommendation_use: `꽃밭·정원 코스 추천`
- address: `강원특별자치도 평창군 봉평면 흥정계곡길 225`
- 좌표: `null` / `null`, coordinateSource `null`

### GOAT-057 로미지안가든

- city / region_group: `정선군` / `고원권`
- primaryTheme: `숲·정원·자연휴식 무드`
- mood_tags: `알프스감성`, `유럽감성`, `자연친화`, `힐링`, `조용함`, `탁트임`, `웅장함`
- sceneTags: `정원`, `산`, `숲`, `산책로`, `전망대`
- place_type / photo_point: `수목원/정원` / `가시버시성, 삼합수 전망대, 산악 정원과 금강송 숲길`
- purpose_tags: `산책·힐링`, `사진·포토스팟`
- season_tags / best_time: `사계절` / `오전`
- accessibility: `public_transport: 하`, `car: 중`
- recommendation_use: `꽃밭·정원 코스 추천`
- address: `강원특별자치도 정선군 북평면 어도원길 12`
- 좌표: `null` / `null`, coordinateSource `null`

### GOAT-058 고석정 꽃밭

- city / region_group: `철원군` / `북부내륙권`
- primaryTheme: `숲·정원·자연휴식 무드`
- mood_tags: `유럽감성`, `자연친화`, `컬러풀`, `여유로움`, `힐링`, `탁트임`
- sceneTags: `꽃밭`, `산책로`, `포토존`
- place_type / photo_point: `정원/농장` / `계절 초화류가 펼쳐진 대형 꽃밭과 산책 동선`
- purpose_tags: `사진·포토스팟`, `산책·힐링`
- season_tags / best_time: `봄` / `오전`
- accessibility: `public_transport: 중`, `car: 상`
- recommendation_use: `꽃밭·정원 코스 추천`
- address: `강원특별자치도 철원군 동송읍 태봉로 1769`
- 좌표: `null` / `null`, coordinateSource `null`
- operatingCondition: `date_ranges`, `verified`, `Asia/Seoul`, `2026-05-15`~`2026-06-14`, `requiresExactDate: true`, `unknownDatePolicy: exclude`

계절 점수는 기존 구현에서 가산점이므로 강제 제외 기능이 아니었다. 기존 점수 함수·배점은 그대로 두고, 점수 계산 직전 `operatingCondition`이 있는 장소에만 적용되는 optional 자격 필터를 추가했다. 확인된 운영일 밖이거나 정확한 현재 날짜를 알 수 없으면 고석정 꽃밭은 후보에서 제외된다. 2026년 하반기 운영일은 확인일 현재 미공개이므로 임의의 월을 넣지 않았다.

## 5. 추천 활성화·추가 확인 장소

세 장소는 canonical 루트의 `places`에 편입되어 점수 계산과 일반 API 결과에 포함된다. `pending_places`는 빈 배열이며, 세 장소 모두 레퍼런스 카드의 `candidatePlaceIds`와 `coveragePlaceIds`에 연결했다. 기존 추가 확인 항목은 메타데이터로 유지한다.

### GOAT-059 파크로쉬 리조트 앤 웰니스

- primaryTheme: `휴양·카페·이국공간 무드`
- mood_tags: `프리미엄`, `휴양감`, `힐링`, `조용함`, `자연친화`, `알프스감성`, `아늑함`
- sceneTags: `리조트`, `산`, `숲`, `실내공간`, `전망대`
- place_type: `리조트/숙소`
- purpose_tags: `숙소·리조트`, `산책·힐링`, `카페·실내휴식`
- season_tags / best_time: `사계절` / `오후`
- accessibility: `public_transport: 중`, `car: 상`
- 검증 필요: 비투숙객 이용 가능 구역, 웰니스 프로그램·스파·라운지의 투숙객 전용 여부

### GOAT-060 켄싱턴호텔 평창 프렌치가든

- primaryTheme: `숲·정원·자연휴식 무드`
- mood_tags: `유럽감성`, `자연친화`, `컬러풀`, `여유로움`, `힐링`, `아기자기함`
- sceneTags: `정원`, `꽃밭`, `산책로`, `리조트`
- place_type: `수목원/정원`
- purpose_tags: `산책·힐링`, `사진·포토스팟`
- season_tags / best_time: `봄`, `여름`, `가을` / `오전`
- accessibility: `public_transport: 중`, `car: 상`
- 검증 필요: 비투숙객 무료 입장 범위, 계절별 조경·개화 상태, 유료 체험과 일반 정원 관람 범위

### GOAT-061 델피노·소노펠리체 델피노

- primaryTheme: `알프스·고원·목장 무드`
- mood_tags: `알프스감성`, `프리미엄`, `탁트임`, `자연친화`, `휴양감`, `웅장함`, `힐링`
- sceneTags: `리조트`, `산`, `전망대`, `카페`
- place_type: `리조트/숙소`
- purpose_tags: `숙소·리조트`, `카페·실내휴식`, `사진·포토스팟`
- season_tags / best_time: `사계절` / `오전`
- accessibility: `public_transport: 중`, `car: 상`
- 검증 필요: 더 엠브로시아 비투숙객 이용 여부, 전망 공간의 정확한 건물·층·운영시간, 두 리조트의 추천 단위 분리 필요성

## 6. 레퍼런스 카드 검증

- primaryTheme 7개와 레퍼런스 카드 21개를 유지했다.
- `candidateCount`, `coverageCount`는 실제 배열 길이로 다시 계산했다.
- 활성 61개 coverage 합계 61, 고유 ID 61, 누락 0, 중복 0, 존재하지 않는 ID 0이다.
- 현재 데이터에 존재하지 않는 장소 참조는 0이다.
- 신규 대표 coverage: GOAT-055 `REF_RESORT_01`, GOAT-056 `REF_NATURE_02`, GOAT-057 `REF_NATURE_01`, GOAT-058 `REF_NATURE_02`, GOAT-059 `REF_RESORT_03`, GOAT-060 `REF_NATURE_02`, GOAT-061 `REF_ALPS_03`.
- 7개 무드 모두 카드 3개를 반환하며 역할 순서는 `BEST_SCENE`, `SAME_MOOD_ALTERNATIVE`, `CONDITION_FIT_ALTERNATIVE`로 유지된다.

## 7. 공식 출처

모든 출처의 확인일은 2026-07-14이다.

| 장소 | 공식 출처 |
|---|---|
| 쏠비치 양양 | [한국관광공사](https://english.visitkorea.or.kr/svc/contents/contentsView.do?vcontsId=85034), [소노 위치](https://sonolc.sonohotelsresorts.com/daemyung.sb.yy.introduce.location.ds/dmparse.dm), [소노 프라이빗 비치](https://www.sonohotelsresorts.com/solbeach_yy/facilitiesviewall/detail/ADD00000586) |
| 허브나라농원 | [한국관광공사](https://english.visitkorea.or.kr/svc/whereToGo/locIntrdn/rgnContentsView.do?vcontsId=104740), [열린관광 모두의 여행](https://access.visitkorea.or.kr/ms/detail.do?cotId=1f801032-7d8f-40bb-9e9f-44ffcc0b385d) |
| 로미지안가든 | [한국관광공사 1](https://korean.visitkorea.or.kr/detail/rem_detail.do?cotid=e3f2c6ec-37d4-455a-a37c-295126a36d11), [한국관광공사 2](https://korean.visitkorea.or.kr/detail/rem_detail.do?cotid=5a7d8d42-e7e6-40f2-b1a9-4aa99e1bc411), [정선군 버스정보](https://bis.jeongseon.go.kr/qna/write?mode=R&qnaSeq=564) |
| 고석정 꽃밭 | [철원군 2026 운영 안내](https://www.cwg.go.kr/tour/contents.do?key=1823), [철원군 운영 종료 답변](https://www.cwg.go.kr/tour/selectBbsNttView.do?bbsNo=76&key=668&nttNo=279357), [한국관광공사](https://english.visitkorea.or.kr/svc/whereToGo/locIntrdn/rgnContentsView.do?vcontsId=216232) |
| 파크로쉬 | [정선군](https://www.jeongseon.go.kr/tour/jeongseontour/attractions?contentSeq=254799&mode=read), [공식 카페](https://park-roche.com/dining/cafe), [공식 웰니스클럽](https://park-roche.com/wellness-club/wellness-club) |
| 켄싱턴호텔 평창 프렌치가든 | [공식 시설](https://www.kensington.co.kr/hpc/sub_facilities/detail?idx=113), [공식 지점 정보](https://www.kensington.co.kr/hpc/branch_info), [공식 프로모션](https://kensington.co.kr/hpc/promotion/dining_view?seq=758&sort=1) |
| 델피노·소노펠리체 델피노 | [공식 다이닝](https://www.sonohotelsresorts.com/calm_dp/diningviewall), [공식 하이라이트](https://www.sonohotelsresorts.com/village_dp/highlight), [공식 시설·주소](https://mice.sonohotelsresorts.com/daemyung.dp.room.dpsfinfo.ds/dmparse.dm) |

## 8. 변경 파일

### 장소·카드 데이터와 문서

- `lib/travel-domain/src/data/goat_simplified_scoring_tags_v10_accessibility_merged.json`
- `lib/travel-domain/src/data/goat_reference_cards_v2_balanced.json`
- `lib/travel-domain/src/data/places.json`
- `lib/travel-domain/src/data/tag-dictionary.json`
- `문서/goat_places_clean_db_ready.json`
- `docs/current-tag-inventory.md`
- `GOAT_backend_frontend_handoff_v1/SEND_TO_BACKEND/data/*`의 장소·카드 JSON
- `GOAT_backend_frontend_handoff_v1/SEND_TO_FRONTEND/data/goat_reference_cards_v2_balanced.json`
- `GOAT_backend_frontend_handoff_v1/COMMON_REFERENCE/source_files/*`의 장소·카드 JSON 및 점수 기준 장소 목록
- `attached_assets/Pasted-Build-a-mobile-first-MVP-web-app-for-a-Korean-tourism-r_1780032471126.txt`
- `artifacts/goat-mobile/src/services/localPlacePhoto.ts`

### 추천 자격 필터·타입·검증

- `lib/travel-domain/src/goatRecommendationTypes.ts`
- `lib/travel-domain/src/goatRecommendationEngine.ts`
- `lib/travel-domain/src/recommendationService.ts`
- `scripts/src/verifyPlaceData.ts`
- `scripts/src/fixtures/maintained-place-tags-baseline.json`
- `scripts/package.json`, `scripts/tsconfig.json`, 루트 `package.json`
- `GOAT_backend_frontend_handoff_v1/SEND_TO_BACKEND/src/goatRecommendationTypes.ts`
- `GOAT_backend_frontend_handoff_v1/SEND_TO_BACKEND/src/goatRecommendationEngine.ts`

### 첨부본 자체의 검증·Windows 빌드 호환 보완

- `artifacts/api-server/scripts/verify-api.mjs`: 테스트용 `DATABASE_URL` 추가
- `artifacts/goat-mobile/scripts/verify-api-client.ts`: 테스트용 `DATABASE_URL` 및 변경 데이터에 맞는 기대 ID 갱신
- `artifacts/goat-mobile/package.json`, `artifacts/goat-mobile/tsconfig.json`: Node 스크립트 타입 선언 연결
- `artifacts/mockup-sandbox/src/components/ui/calendar.tsx`, `spinner.tsx`: 기존 React 타입 오류만 수정
- `artifacts/goat-mobile/scripts/build.js`: Metro가 한글 자산명을 `\\uXXXX`로 직렬화할 때 실제 파일명으로 복원
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`: Windows x64에서 필요한 Rollup·Tailwind 공식 네이티브 패키지를 제외하지 않도록 수정

이 보완은 화면 구조·스타일·추천 결과 계약을 변경하지 않는다.

## 9. 실행한 검증과 결과

| 명령 | 결과 |
|---|---|
| `pnpm.cmd run test` | 통과 — active 61, pending 0, managed 61, candidates 61, coverage 61 unique, cards 21, themes 7 |
| `pnpm.cmd run typecheck` | 통과 — 라이브러리, API 서버, 모바일, mockup, 검증 스크립트 |
| `$env:PORT='5173'; $env:BASE_PATH='/'; $env:EXPO_PUBLIC_DOMAIN='localhost:8081'; pnpm.cmd run build` | 통과 — mockup, API 서버, Expo 정적 빌드 포함 |
| `pnpm.cmd --filter @workspace/api-server run verify` | 통과 — 활성 61, 7개 무드, 3카드 역할/순서, 보안·fallback API 검증 |
| `pnpm.cmd --filter @workspace/goat-mobile run verify:api-client` | 통과 |
| `pnpm.cmd --dir GOAT_backend_frontend_handoff_v1/SEND_TO_BACKEND run test` | 통과 — 기존 추천 엔진 테스트 전부 통과 |

추가된 장소 데이터 검증 스크립트는 요청된 21개 항목을 포함해 다음을 검사한다: 전체/활성/대기 수, ID·이름 중복, 유지 54개 ID와 기존 태그 스냅샷, 신규·대기·제외 상태, 통제 어휘, 필수 필드, 좌표 범위, 카드 21개, coverage 정확히 1회, 7개 무드의 3카드 역할·순서·중복·점수 상한, 고석정 운영일 안/밖/날짜 미상 동작, canonical 복제본 일치.

## 10. 최종 diff 검토

- 기존 점수 상수와 `primaryTheme`, `mood_tags`, `sceneTags`, `place_type`, 목적, 접근성, `best_time`, 계절 점수 산식은 변경하지 않았다.
- 카드 1/2/3 역할, 카드별 후보 우선순위, 중복 페널티, 거리 fallback, 노출 보정, coverage 보정, 카드 3 목적 fallback/warning, 디버그 내역, 실패 응답 구조를 유지했다.
- 추천 엔진 변경은 `operatingCondition`이 있는 장소를 점수 계산 전에 거르는 자격 필터와 nullable 접근성 정규화뿐이다.
- 기존 54개 장소의 ID와 통제 태그 필드는 원본 스냅샷과 일치한다.
- canonical과 백엔드·공통 참조 장소 JSON, canonical과 세 레퍼런스 카드 JSON은 검증 스크립트에서 구조적 동일성을 확인했다.
- 제외 4개 ID·이름은 이 변경 이력 보고서를 제외한 소스·데이터·문서에서 검색 결과 0건이다.
- 대기 3개는 활성 배열과 모든 카드 참조에서 제외됐다.
- 프론트 화면·디자인은 변경하지 않았다. 두 UI 파일은 기존 타입 오류 수정만 포함한다.
