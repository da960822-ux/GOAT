# GOAT Product

## 제품 목적

GOAT는 강원 여행자가 감성 또는 사진 레퍼런스, 동행·목적·교통·시간·출발지를 선택하면 조건에 맞는 여행지를 추천하고 저장·코스 확인까지 이어 주는 모바일 앱이다.

## 주요 사용자 흐름

1. 홈에서 최근 추천과 북마크를 확인하거나 `닮은 여행지 찾기`를 시작한다.
2. 감성 7종 또는 레퍼런스 카드 21종 중 정확히 하나를 선택한다.
3. 동행·목적·교통·시간·출발지를 선택한다. 표시 문구와 API 값은 분리한다.
4. 분석 화면은 감성 선택과 레퍼런스 선택에 맞춰 문구와 이미지를 분기한다.
5. 추천 결과에서 상세·저장·공유·코스를 확인하고, 오류 상태에서는 원인을 보존한 복구 경로를 제공한다.

## 도메인 계약

- `RecommendationSelection`은 mood 또는 reference 중 하나만 갖는 판별 유니온이다.
- `POST /api/recommendations`는 `moodId`/`referenceCardId` 정확히 하나를 검증한다.
- `origin.type`은 `region`, `address`, `current`, `skip` 네 값으로 정규화한다.
- 최초 선택은 `PendingAttempt`와 `RecommendationSession`에 보존한다.
- 재시도와 409·503·네트워크 복구는 같은 Idempotency-Key를 사용한다.

## 접근성

모든 주요 조작은 44×44dp 이상이며, Safe Area·스크린리더 레이블·선택 상태·reduced-motion을 고려한다.
