# Discovery condition flow

- 이동수단과 오늘 조건은 시트의 draft에서만 바뀌며, `조건 적용하기`를 눌렀을 때만 새 추천을 요청한다.
- 응답은 기존과 새 `placeIds`를 비교해 장소 변경, 순서 변경, 유지로 사용자에게 알린다.
- Undo는 서버 revision을 되살리지 않는다. 현재 화면의 직전 추천 스냅샷을 한 번만 복원한다. 이후 교체 요청이 revision conflict로 실패하면 보이는 세 곳을 유지한다.
- 닫기, Android back, 실패, 늦은 응답은 기존 committed 조건과 세 장을 유지한다.

## API 연결 상태

- 모바일은 D 계약의 `/selections`, `/public/recommendations`, `/public/recommendations/replace`, `/scene-cover`, `/place-photos` 생성 클라이언트를 사용한다.
- 현재 API 서버 라우트에는 위 공개 발견 엔드포인트 구현이 등록되어 있지 않다. C에서는 대체 데이터나 추천 규칙을 만들지 않으며, 요청 실패 시 기존 결과 유지 또는 명시적 재시도 UI만 제공한다.
- `getPlace(placeId)`는 카드 표시용 장소명·지역·주소·방문 제한 보강에만 사용하며, 세 장을 병렬 조회하고 실패가 Decision Deck을 막지 않는다.
