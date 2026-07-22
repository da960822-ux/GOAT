# GOAT Design System

## Intent

제공된 GOAT 시안의 짙은 포레스트 그린, 따뜻한 아이보리, 한국어 세리프 제목과 사진 중심 구성을 그대로 재현한다. 이 문서는 새 방향을 제안하지 않고 구현이 시안에서 벗어나지 않도록 제한한다.

## Color

- Primary / forest: `#173F36`
- Primary deep: `#0F302A`
- Background / ivory: `#F6F2E9`
- Surface / paper: `#FFFCF6`
- Secondary surface / sage: `#DDE3DA`
- Ink: `#18322D`
- Muted: `#6F7C76`
- Outline: `#D9D9CF`
- Error: `#A3493F`

색은 `src/theme/editorial.ts` 토큰으로만 공유한다. 시안에 없는 보라색, 장식용 그라디언트와 글래스 효과는 금지한다.

## Typography

- Display and editorial headings: Noto Serif KR 400/600
- Body, labels and controls: Pretendard 400/500/600/700
- 제목은 대체로 22–33sp, 본문은 13–15sp, 버튼은 16sp를 사용한다.
- 한국어 줄바꿈은 시안의 행 수를 우선하며 본문 행간은 글자 크기의 약 1.55–1.7배를 유지한다.

## Shape and Spacing

- Cards: 16–24dp radius, only where the reference uses rounded photography.
- Buttons and tags: pill shape.
- Touch targets: 48dp preferred, never below 44dp.
- Primary horizontal gutters: 16–22dp.
- Safe-area insets are always applied at screen boundaries.

## Brand assets

- `assets/images/goat-logo-full.png`: 제공 원본을 그대로 보존한 앱 아이콘·스플래시 자산.
- `GoatMark`: 원본의 GOAT 세리프 워드마크와 `GANGWON OF ALL TIME` 로크업.
- `GangwonSymbol`: 로딩·빈 상태·소형 표시에 쓰는 강원 실루엣 SVG.
- `BrandIcon`: 외부 아이콘 폰트 없이 렌더되는 단일 SVG 레지스트리. 선 굵기와 선택 채움 상태를 통일한다.

## Components

- `GoatMark` and `GangwonSymbol`: shared brand lockups.
- `BrandIcon`: all navigation, status and action icons.
- `ScreenHeader`: shared top bar and 44dp back action.
- `PrimaryButton`: filled, outline and paper variants with pressed, disabled and loading states.
- Editorial image cards: fixed aspect and `cover` crop with restrained dark overlay.
- Error, no-results and analysis states use independent routes and an explicit recovery action.

## Motion

랜딩은 260ms 페이드만 사용하고 분석 오비트는 느리게 회전한다. reduced-motion에서는 두 효과 모두 즉시 전환된다. 페이지 이동은 플랫폼 라우터 전환을 따른다.

## Reference Priority

When this document, a skill recommendation and the reference JPGs conflict, the reference JPGs win. 허용된 랜딩 차이는 오른쪽 CTA가 `내 위치로 찾기`로 바뀐 것, 새 브랜드 로고, 접근성에 필요한 플랫폼 동작뿐이다. 제거된 사진 분석 시안은 더 이상 제품 라우트가 아니다.
