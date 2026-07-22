# GOAT 디자인 시스템

## 구현 기준

`C:\Users\SMHRD\Documents\카카오톡 받은 파일\새 폴더`의 시안을 기준으로, 새로운 해석 대신 화면 구조·여백·CTA 위치·사진 중심 구성을 맞춘다. 핵심 흐름은 홈 → 감성 또는 레퍼런스 → 여행 조건 → 분석 → 추천/오류다.

## 토큰

| 구분 | 값 |
| --- | --- |
| Forest | `#173F36` |
| Forest deep | `#0F302A` |
| Ivory | `#F6F2E9` |
| Paper | `#FFFCF6` |
| Sage | `#DDE3DA` |
| Ink | `#18322D` |
| Muted | `#6F7C76` |
| Outline | `#D9D9CF` |
| Error | `#A3493F` |

## 서체와 컴포넌트

- 제목은 Noto Serif KR, 본문·레이블·제어 요소는 Pretendard를 사용한다.
- `BrandIcon` SVG 레지스트리만 사용한다. Unicode 이모지와 아이콘 폰트는 사용하지 않는다.
- 버튼·뒤로가기·아이콘 조작 영역은 최소 44×44dp, 화면 경계에는 Safe Area를 적용한다.
- 사진 카드는 `cover` 크롭과 절제된 오버레이를 사용하며, 선택 카드는 테두리와 체크 표시로 상태를 전달한다.
- reduced-motion 환경에서는 분석 로딩과 전환 모션을 즉시 또는 최소 모션으로 처리한다.

## 선택 데이터

감성은 `sea-coast`, `japan-alley`, `alps-ranch`, `forest-garden-rest`, `retro-market-harbor`, `architecture-exhibit-landmark`, `resort-cafe-exotic` 7종이다. 레퍼런스 카드는 각 감성군 3장씩 총 21장이며, 모든 카드는 정적 이미지 자산에 컴파일 타임으로 매핑한다.

감성과 레퍼런스는 상호 배타적이다. 감성을 고르면 레퍼런스 선택을 지우고, 레퍼런스를 고르면 감성 선택을 지운다.

## 오류·복구

- 401: 로그인으로 이동하되 원래 목적지를 보존한다.
- 422: 결과 없음 화면과 재선택 경로를 제공한다.
- 409/503/네트워크: 네트워크 오류 화면에서 동일 Idempotency-Key로 재시도한다.
