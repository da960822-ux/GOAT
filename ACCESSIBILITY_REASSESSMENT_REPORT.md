# GOAT 장소 접근성 재평가 보고서

- 검토일: 2026-07-21
- 실제 런타임 원본: `lib/travel-domain/src/data/goat_simplified_scoring_tags_v10_accessibility_merged.json`
- 구성: 활성 추천 장소 61개 + `pending_places` 0개 = 전체 추천 장소 61개
- 변경 범위: 각 장소의 `accessibility.public_transport`, `accessibility.car`만 변경
- 결과: 35개 변경, 15개 재평가 후 유지, 11개는 최신 세부 접근정보 부족으로 기존값 유지(`NEEDS_REVIEW`)

평가는 주요 역·터미널·버스 연계와 배차·도보·택시 의존도, 도로·주차·진입 난이도·계절 통제를 함께 반영했다. 공식 홈페이지, 지자체 관광/교통 자료, 대한민국 구석구석·한국관광공사 TourAPI, Kakao Local API를 우선 사용했다. 장소 유형만으로 일괄 등급을 부여하지 않았다.

## 장소별 최종 등급

| ID | 장소 | 대중교통 | 자차 | 판정 |
|---|---|---:|---:|---|
| GOAT-001 | 제이드가든 | 중 | 상 | 유지 |
| GOAT-002 | 레고랜드 코리아 리조트 | 상 | 상 | 변경 |
| GOAT-003 | 춘천 산토리니 | 중 | 상 | 유지 |
| GOAT-004 | 해피초원목장 | 하 | 중 | 변경 |
| GOAT-005 | 아웃오브파크 | 하 | 상 | NEEDS_REVIEW |
| GOAT-006 | 교토정원 | 중 | 상 | NEEDS_REVIEW |
| GOAT-007 | 스테이 조각밤 | 하 | 상 | NEEDS_REVIEW |
| GOAT-008 | 이와림 | 하 | 상 | NEEDS_REVIEW |
| GOAT-009 | 뮤지엄 SAN | 하 | 상 | 변경 |
| GOAT-010 | 소금산 그랜드밸리 | 상 | 상 | 유지 |
| GOAT-011 | 알파카월드 | 하 | 중 | 변경 |
| GOAT-012 | 원대리 자작나무숲 | 하 | 중 | 변경 |
| GOAT-013 | 인제성당 | 상 | 상 | 변경 |
| GOAT-014 | 알펜시아 리조트 | 중 | 상 | 변경 |
| GOAT-015 | 육백마지기 | 하 | 하 | 변경 |
| GOAT-016 | 대관령양떼목장 | 중 | 상 | 유지 |
| GOAT-017 | 하늘목장 | 하 | 상 | 변경 |
| GOAT-018 | 삼양라운드힐 | 하 | 상 | 변경 |
| GOAT-019 | 발왕산 천년주목숲길·애니포레 | 중 | 상 | 유지 |
| GOAT-020 | 삼탄아트마인 | 중 | 상 | 유지 |
| GOAT-021 | 민둥산 | 상 | 중 | 변경 |
| GOAT-022 | 매봉산 바람의 언덕 | 하 | 중 | 변경 |
| GOAT-023 | 태기산 | 하 | 하 | 변경 |
| GOAT-024 | 안목해변 카페거리 | 상 | 중 | 변경 |
| GOAT-025 | 하슬라아트월드 | 중 | 상 | 유지 |
| GOAT-026 | 정동진 썬크루즈 리조트 | 중 | 상 | 유지 |
| GOAT-027 | BTS 버스정류장 | 중 | 중 | 변경 |
| GOAT-028 | 정동진 철길 건널목 | 상 | 중 | 변경 |
| GOAT-029 | 안반데기 | 하 | 하 | 변경 |
| GOAT-030 | 금진해변·헌화로 드라이브 코스 | 하 | 상 | 유지 |
| GOAT-031 | 교동 소품샵 거리 | 상 | 중 | 변경 |
| GOAT-032 | 휴식 료칸 풀빌라 | 하 | 상 | NEEDS_REVIEW |
| GOAT-033 | 유메모리 리조트 | 하 | 상 | NEEDS_REVIEW |
| GOAT-034 | 무릉별유천지 | 중 | 상 | 유지 |
| GOAT-035 | 어달삼거리 | 중 | 중 | 변경 |
| GOAT-036 | 묵호항 일대 | 상 | 중 | 변경 |
| GOAT-037 | 묵호등대·논골담길 | 중 | 중 | 변경 |
| GOAT-038 | 외옹치 바다향기로 | 상 | 중 | 변경 |
| GOAT-039 | 카페 흰다정 | 중 | 상 | NEEDS_REVIEW |
| GOAT-040 | 서피비치 | 중 | 중 | 변경 |
| GOAT-041 | 죽도해변·인구해변·양리단길 | 중 | 중 | 변경 |
| GOAT-042 | 두둥실 | 중 | 상 | NEEDS_REVIEW |
| GOAT-043 | 에이프레임(A-Frame) | 중 | 상 | NEEDS_REVIEW |
| GOAT-044 | 아야진해수욕장 | 중 | 중 | 변경 |
| GOAT-045 | 켄싱턴리조트 설악밸리 | 하 | 상 | 유지 |
| GOAT-046 | 하늬라벤더팜 | 하 | 상 | 유지 |
| GOAT-047 | 능파대 | 중 | 중 | 변경 |
| GOAT-048 | 사유의 숲 | 하 | 상 | NEEDS_REVIEW |
| GOAT-049 | 쏠비치 삼척·산토리니 광장 | 중 | 상 | 유지 |
| GOAT-050 | 라메종드마리 | 중 | 상 | NEEDS_REVIEW |
| GOAT-051 | 장호항 | 중 | 중 | 변경 |
| GOAT-052 | 용화해변 | 중 | 중 | 변경 |
| GOAT-053 | 초곡용굴촛대바위길 | 중 | 상 | 유지 |
| GOAT-054 | 한탄강 주상절리길 | 중 | 상 | 유지 |
| GOAT-055 | 쏠비치 양양 | 중 | 상 | 변경 |
| GOAT-056 | 허브나라농원 | 중 | 중 | 변경 |
| GOAT-057 | 로미지안가든 | 하 | 중 | 변경 |
| GOAT-058 | 고석정 꽃밭 | 중 | 상 | 변경 |
| GOAT-059 | 파크로쉬 리조트 앤 웰니스 | 중 | 상 | 변경 |
| GOAT-060 | 켄싱턴호텔 평창 프렌치가든 | 중 | 상 | 변경 |
| GOAT-061 | 델피노·소노펠리체 델피노 | 중 | 상 | 변경 |

## 주요 판단 근거와 출처

- [Kakao Local REST API 공식 문서](https://developers.kakao.com/docs/en/local/dev-guide): 주소·장소 검색 및 좌표 확인. 2026-07-21 실키로 레고랜드 주소→좌표 변환 성공.
- [춘천 관광 포털](https://www.chuncheon.go.kr/tour/main/) 및 [춘천 교통 포털](https://www.chuncheon.go.kr/traffic/): 춘천권 관광지·버스 연계 확인.
- [뮤지엄 SAN 공식 방문 안내](https://www.museumsan.org/guide/visitor?tab=visitor): 산지형 입지와 방문 동선 확인.
- [대한민국 구석구석 민둥산 안내](https://korean.visitkorea.or.kr/detail/rem_detail.do?cotid=ac801993-6103-4690-a736-8914b9164965): 민둥산역 연계가 가능한 등산 목적지 특성 반영.
- [안반데기 교통·진입로 안내](https://www.kric.go.kr/jsp/board/portal/sub05/res/themeEssayDetail.jsp?board_seq=3258): 현지 대중교통 부재, 좁고 급한 진입로 확인.
- [강원특별자치도 2026 고시](https://state.gwd.go.kr/upload/report/kw_nws_data/kw_mgr_5172_20260312150511.pdf): 육백마지기 진입로 확·포장 공사 진행 사실 확인.
- [허브나라농원 공식 오시는 길](https://www.herbnara.com/default/mp1/mp1_sub5.php?sub=04): 제한된 횟수의 대중교통 연계 확인.
- [쏠비치 양양 공식 오시는 길](https://sonolc.sonohotelsresorts.com/daemyung.sb.yy.introduce.location.ds/dmparse.dm): 승용차 경로와 예약 셔틀 안내 확인.
- [2026 고석정 꽃밭 공식 안내](https://www.gcwcf.or.kr/w1_c_4_1/4): 현행 행사장 운영·접근 기준 확인.
- 한국관광공사 `KorService2` 실 API: 2026-07-21 인증 및 응답 정상 확인.

`NEEDS_REVIEW` 11개는 최신 공식 페이지에서 버스 정류장 거리·배차, 주차 규모 또는 진입도로 조건을 확정할 수 없었다. 요청 원칙에 따라 기존 접근성 값을 유지했으며, 운영주체의 최신 오시는 길/주차 공지가 확보되기 전까지 보수적으로 관리한다.
