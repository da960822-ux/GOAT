# GOAT 상세 필드·출처 감사

## 상세 필드 소유권

| 화면 필드 | 실제 데이터 | 표시 출처 | 결합 규칙 |
|---|---|---|---|
| 장소 표시명 | GOAT DB `place_name` | GOAT 자체 큐레이션 | KTO 공식명이 달라도 사용자용 이름은 유지 |
| 장면과 닮은 점·알려진 차이 | GOAT 추천 엔진 | GOAT 자체 큐레이션 | 외부 기관 출처를 붙이지 않음 |
| `primary_mood`·`mood_tags`·`photo_point` | GOAT DB | GOAT 자체 큐레이션 | 외부 기관 출처를 붙이지 않음 |
| 추천 시간·이동 참고 | GOAT DB | GOAT 자체 큐레이션 | 공식 운영정보와 분리 |
| 공식 명칭·주소·좌표·소개·운영·주차·문의 | KTO `contentId` 기반 `detailCommon2` / `detailIntro2` | 관광정보 출처: ⓒ한국관광공사 | 검증된 contentId가 있고 상세 응답이 반환된 필드만 표시 |
| 현재 날씨 | 기상청 단기예보 | 날씨정보 출처: 기상청 | 실제 예보가 반환된 경우만 표시 |
| 대표·Gallery 사진 | KTO 관광사진/TourAPI 또는 Google Places | 각 `PhotoAsset.attribution` | 사진마다 실제 provider attribution 사용 |
| fallback | 사용 근거가 확인된 GOAT 자산만 | GOAT 또는 명시된 권리자 | 출처 불명 이미지는 렌더링하지 않음 |

## 화면 감사

| 화면 | 기존 문제 | 수정 원칙 |
|---|---|---|
| 결과 카드 | 출처가 사진과 떨어져 있고 작성자까지 반복돼 밀도가 높음 | 사진 위에 provider만 작게 표시, 작성자 상세는 Gallery로 이동 |
| 장소 상세 | 사진 출처가 본문 맨 아래에 있었고 KTO 공식 상세·기상청 예보 연결 누락 | 사진 바로 아래 attribution, GOAT 추천/KTO 공식정보/날씨 섹션 분리 |
| Gallery | 작성자 텍스트만 있고 작성자·개별 사진 링크가 없음 | 각 사진별 Google Maps·작성자·원본 링크를 API metadata로 렌더링 |
| Compare | 썸네일 출처 없음 | 썸네일 바로 아래 provider 표시 |
| Decision Sheet | 사진을 렌더링하지 않아 사진 출처 대상이 아님 | 장소명·제한만 유지, 불필요한 출처 반복 금지 |
| 내 장면 | 썸네일 출처 없음, 출처 불명 `place.imageUrl` fallback 가능 | 실제 PhotoAsset만 사용하고 썸네일에 provider 표시 |
| 데이터 출처 안내 | 58곳으로 오래됨, Google Places·기상청 누락, source pill 과다 | 61곳·데이터 종류별 출처·캐시 정책을 일반 텍스트로 정리 |

KTO 관광정보가 없는 장소는 GOAT 보유 주소를 별도 섹션에 표시하며, 한국관광공사 출처를 붙이지 않는다. Google 사진은 카드/Compare/내 장면에서 provider를 표시하고, 상세·Gallery에서 작성자 프로필과 개별 원본 사진 접근을 제공한다.
