# GOAT v0 → v1.3 태그/조합/추천로직 최종 비교 점검

## 1. 최종 판단

v1.3은 v0 대비 태그 기준, 태그 조합, 후보 pool 정책, 추천 로직이 모두 보완되었다.

- v0: 고정 43개 추천 pool + 단순 synonym 태그 매칭 + 5개 테스트.
- v1.3: 58개 seed 유지 + 조건별 PRIMARY43/ALL58 전환 + 태그 표준화 사전 + 13개 테스트.
- v1.3 테스트 결과: `13 passed, 0 failed`.
- v1.3 `npm install` 후 `npm run typecheck`, `npm run test:recommend` 통과 확인.

## 2. v0 대비 추가/수정된 핵심

| 구분 | v0 | v1.3 |
|---|---|---|
| 후보 pool | confirmed + core43만 실질 사용 | 58개 전체 seed 유지, 요청 조건에 따라 PRIMARY43/ALL58 |
| 후보 제외 처리 | 숙소/리조트/future_candidate를 추천에서 제외 | 삭제하지 않고 의도·상태에 따라 사용 |
| 태그 기준 | 코드 내부 SYNONYMS 9개 그룹 중심 | tag_dictionary의 8개 태그군, 102개 표준 태그 |
| 태그 보정 | 단순 동의어 확장 | aliases, relatedTags, moodExpansion, weakStandaloneTags |
| 조합 테스트 | 5개, 카드 수/키워드 중심 | 13개, Top3 placeId 순서까지 검증 |
| 추천 로직 | 태그/계절/시간/접근성/지역/날씨 가중합 | 장면별 sceneSpecific, 지역 보정, 숙소 의도, 데이터 상태, adaptive retry 추가 |
| API-first | 없음 | apiFirstRecommendationAdapter + dataSource/apiQuality 필드 |

## 3. v0 추천 결과 문제와 v1.3 보완 결과

| 기존 케이스 | v0 결과 | v1.3 결과 | 보완 판단 |
|---|---|---|---|
| 바다/해안도로 | GOAT-040, GOAT-025, GOAT-045 | GOAT-031, GOAT-044, GOAT-040 | 해안도로 대표 후보 GOAT-031과 서핑 후보 GOAT-044가 반영됨 |
| 알프스 목장 | GOAT-004, GOAT-017, GOAT-019 | GOAT-017, GOAT-018, GOAT-019 | 평창 대관령 목장 3종이 안정적으로 묶임 |
| 일본 소도시 | GOAT-029, GOAT-037, GOAT-040 | GOAT-029, GOAT-037, GOAT-032 | 해안데크가 빠지고 골목/소품샵 후보가 들어옴 |
| 북유럽 겨울 숲 | GOAT-012, GOAT-024, GOAT-030 | GOAT-012, GOAT-020, GOAT-024 | 숲/침엽수림 후보가 2번으로 보강됨 |
| fallback | 낮은 점수인데 fallbackUsed=false | abstract-mood-only에서 adaptivePoolRetryUsed=true | 추상 무드만 들어와도 ALL58 재시도 적용 |

## 4. v1.3 태그 기준

| 태그군 | 개수 | 용도 |
|---|---:|---|
| standardSceneTags | 22 | 실제 보이는 장면. 추천 영향 가장 큼 |
| standardMoodTags | 11 | 분위기. 단독 직접 추천보다 moodExpansion에 사용 |
| standardStyleTags | 12 | 해외감성/연상 스타일 |
| standardPlaceTypeTags | 14 | 장소 유형 보조 |
| standardActivityTags | 10 | 방문 목적/활동 보조 |
| conditionTags | 14 | 계절/시간/날씨 보정 |
| intentTags | 10 | 숙소/리조트/료칸 등 pool 전환 의도 |
| riskTags | 9 | 위험/주의 문구 및 감점 |

- 표준 태그 총합: 102개.
- 장소 데이터 기반 전체 후보 태그: 321개.
- 단독 노출 위험 태그: 꽃밭, 폐광, 산, 호수, 발리, 산토리니, 이국적, 청량함, 낭만적, 탁트임, 도시적

## 5. v1.3 태그 조합별 후보 점검

아래 strong candidates는 실제 추천 후보로 의미 있는 점수권 후보이다. positiveCandidates는 moodExpansion 때문에 과도하게 넓어질 수 있으므로 QA 판단 기준은 strongCandidateCount로 보는 것이 안전하다.

| 조합 | pool | strong 후보 수 | Top3 | strong 후보 전체 |
|---|---|---:|---|---|
| 바다/해안도로/캘리포니아 감성 | ALL58(58) | 16 | GOAT-031 금진해변·헌화로 드라이브 코스, GOAT-044 서피비치, GOAT-040 외옹치 바다향기로 | GOAT-031 금진해변·헌화로 드라이브 코스, GOAT-044 서피비치, GOAT-040 외옹치 바다향기로, GOAT-057 초곡용굴촛대바위길, GOAT-051 능파대, GOAT-037 어달삼거리, GOAT-025 안목해변 카페거리, GOAT-029 정동진 철길 건널목, GOAT-047 에이프레임(A-Frame), GOAT-039 묵호등대·논골담길, GOAT-045 죽도해변·인구해변·양리단길, GOAT-048 아야진해수욕장, GOAT-027 정동진 썬크루즈 리조트, GOAT-026 하슬라아트월드, GOAT-036 무릉별유천지, GOAT-055 장호항 |
| 일본 소도시/철길/골목 감성 | PRIMARY43(43) | 12 | GOAT-029 정동진 철길 건널목, GOAT-037 어달삼거리, GOAT-032 교동 소품샵 거리 | GOAT-029 정동진 철길 건널목, GOAT-037 어달삼거리, GOAT-032 교동 소품샵 거리, GOAT-041 속초 서점 투어 골목, GOAT-043 속초 관광수산시장·대포항, GOAT-042 카페 흰다정, GOAT-038 묵호항 일대, GOAT-035 월화거리, GOAT-047 에이프레임(A-Frame), GOAT-040 외옹치 바다향기로, GOAT-054 라메종드마리, GOAT-050 하늬라벤더팜 |
| 알프스 목장/초원/동물 감성 | PRIMARY43(43) | 9 | GOAT-017 대관령양떼목장, GOAT-018 하늘목장, GOAT-019 삼양라운드힐 | GOAT-017 대관령양떼목장, GOAT-018 하늘목장, GOAT-019 삼양라운드힐, GOAT-004 해피초원목장, GOAT-030 안반데기, GOAT-020 발왕산 천년주목숲길·애니포레, GOAT-023 매봉산 바람의 언덕, GOAT-022 민둥산, GOAT-024 태기산 |
| 료칸/숙소 감성도 58개 후보 안에서 추천 | ALL58(58) | 8 | GOAT-007 스테이 조각밤, GOAT-008 이와림, GOAT-033 휴식 료칸 풀빌라 | GOAT-007 스테이 조각밤, GOAT-008 이와림, GOAT-033 휴식 료칸 풀빌라, GOAT-034 유메모리 리조트, GOAT-052 사유의 숲, GOAT-049 켄싱턴리조트 설악밸리, GOAT-005 아웃오브파크, GOAT-027 정동진 썬크루즈 리조트 |
| 흐린 날/협곡/비오는 날 대안 | ALL58(58) | 4 | GOAT-058 한탄강 주상절리길, GOAT-010 소금산 그랜드밸리, GOAT-057 초곡용굴촛대바위길 | GOAT-058 한탄강 주상절리길, GOAT-010 소금산 그랜드밸리, GOAT-057 초곡용굴촛대바위길, GOAT-012 원대리 자작나무숲 |
| 북유럽 숲/겨울/설경 감성 | PRIMARY43(43) | 8 | GOAT-012 원대리 자작나무숲, GOAT-020 발왕산 천년주목숲길·애니포레, GOAT-024 태기산 | GOAT-012 원대리 자작나무숲, GOAT-020 발왕산 천년주목숲길·애니포레, GOAT-024 태기산, GOAT-017 대관령양떼목장, GOAT-018 하늘목장, GOAT-019 삼양라운드힐, GOAT-030 안반데기, GOAT-011 알파카월드 |
| 레트로/시장/야간 감성 | PRIMARY43(43) | 4 | GOAT-043 속초 관광수산시장·대포항, GOAT-038 묵호항 일대, GOAT-035 월화거리 | GOAT-043 속초 관광수산시장·대포항, GOAT-038 묵호항 일대, GOAT-035 월화거리, GOAT-042 카페 흰다정 |
| 고원/별/몽골 감성 | PRIMARY43(43) | 9 | GOAT-030 안반데기, GOAT-016 육백마지기, GOAT-023 매봉산 바람의 언덕 | GOAT-030 안반데기, GOAT-016 육백마지기, GOAT-023 매봉산 바람의 언덕, GOAT-019 삼양라운드힐, GOAT-017 대관령양떼목장, GOAT-020 발왕산 천년주목숲길·애니포레, GOAT-024 태기산, GOAT-022 민둥산, GOAT-018 하늘목장 |
| 발리/서핑/해변 감성 | PRIMARY43(43) | 11 | GOAT-044 서피비치, GOAT-045 죽도해변·인구해변·양리단길, GOAT-047 에이프레임(A-Frame) | GOAT-044 서피비치, GOAT-045 죽도해변·인구해변·양리단길, GOAT-047 에이프레임(A-Frame), GOAT-029 정동진 철길 건널목, GOAT-037 어달삼거리, GOAT-040 외옹치 바다향기로, GOAT-055 장호항, GOAT-048 아야진해수욕장, GOAT-057 초곡용굴촛대바위길, GOAT-051 능파대, GOAT-028 BTS 버스정류장 |
| 유럽 정원/성당 감성 | PRIMARY43(43) | 7 | GOAT-001 제이드가든, GOAT-013 인제성당, GOAT-050 하늬라벤더팜 | GOAT-001 제이드가든, GOAT-013 인제성당, GOAT-050 하늬라벤더팜, GOAT-006 교토정원, GOAT-012 원대리 자작나무숲, GOAT-020 발왕산 천년주목숲길·애니포레, GOAT-040 외옹치 바다향기로 |
| 호수/반영/SNS 감성 | PRIMARY43(43) | 5 | GOAT-014 한반도섬, GOAT-036 무릉별유천지, GOAT-040 외옹치 바다향기로 | GOAT-014 한반도섬, GOAT-036 무릉별유천지, GOAT-040 외옹치 바다향기로, GOAT-032 교동 소품샵 거리, GOAT-041 속초 서점 투어 골목 |
| 일본풍/레트로/카페 감성 | PRIMARY43(43) | 12 | GOAT-042 카페 흰다정, GOAT-054 라메종드마리, GOAT-006 교토정원 | GOAT-042 카페 흰다정, GOAT-054 라메종드마리, GOAT-006 교토정원, GOAT-047 에이프레임(A-Frame), GOAT-038 묵호항 일대, GOAT-032 교동 소품샵 거리, GOAT-003 춘천 산토리니, GOAT-025 안목해변 카페거리, GOAT-037 어달삼거리, GOAT-021 삼탄아트마인, GOAT-029 정동진 철길 건널목, GOAT-041 속초 서점 투어 골목 |
| 추상 무드만 들어온 경우 moodExpansion + ALL58 재시도 확인 | ALL58(58) | 4 | GOAT-044 서피비치, GOAT-031 금진해변·헌화로 드라이브 코스, GOAT-012 원대리 자작나무숲 | GOAT-044 서피비치, GOAT-031 금진해변·헌화로 드라이브 코스, GOAT-012 원대리 자작나무숲, GOAT-020 발왕산 천년주목숲길·애니포레 |

## 6. 마지막 보완 사항

마지막 점검 중 `data/tag_dictionary_v1_all58.json`의 `verifiedReferenceCombinations`에서 6~12번 조합에 `expectedTop3`가 빠져 있고, 일부 pool 표기가 `PRIMARY43 또는 ALL58 재시도`로 남아 있는 것을 확인했다.

이 패치본에서는 아래처럼 정리했다.

- 12개 사용자용 레퍼런스 조합 모두 `expectedTop3` 포함.
- pool 표기 `PRIMARY43` / `ALL58`로 통일.
- 13번째 `abstract-mood-only`는 사용자용 레퍼런스 카드가 아니라 QA용 테스트 케이스로 유지.

## 7. 결론

v1.3은 v0보다 명확하게 보완되었다. 프론트에는 자유 태그 전체 조합을 열기보다 12개 레퍼런스 카드 중심으로 전달하는 것이 안전하다. DB/추천 로직 담당자는 58개 seed를 삭제하지 않고, 추천 계산 시 PRIMARY43/ALL58 pool 전환이 정상인지 확인하면 된다.
