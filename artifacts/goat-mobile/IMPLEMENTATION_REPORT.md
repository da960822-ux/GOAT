# GOAT 시안 1:1 재구현 및 기능 v2 연동 보고서

## 구현 결과

- 랜딩을 둥근 히어로 카드 구조에서 시안의 풀블리드 해안 배경 구조로 재구현했다.
- 원본 로고를 `assets/images/goat-logo-full.png`에 보존하고 앱 아이콘·스플래시에 연결했다. 헤더용 `GoatMark`와 소형 `GangwonSymbol`은 코드 기반 파생 자산이다.
- `@expo/vector-icons`, Ionicons, Feather UI 사용을 모두 제거하고 `react-native-svg` 기반 `BrandIcon`으로 교체했다.
- 사진 검색·업로드·사진 분석 라우트, 권한, 어댑터, 패키지 의존성을 제거했다. 오른쪽 랜딩 CTA는 `내 위치로 찾기`다.
- 중복 `(tabs)` 라우트를 제거하고 홈·추천·지도·저장·마이 5개 상위 화면을 하나의 `AppTabBar`로 통합했다.

## 기능 v2

- 인증: Google·Kakao OAuth start, `/login/callback`, `/api/auth/me`, `/api/auth/logout`, HttpOnly 쿠키 요청(`credentials: include`)을 연결했다. 이메일과 목 세션은 제거했다.
- 추천: 공식 `POST /api/recommendations`를 사용한다. UUID Idempotency-Key를 생성하고 `REQUEST_IN_PROGRESS`는 `Retry-After` 뒤 같은 키로 재시도한다.
- 상태: `RecommendationData`를 그대로 보존하는 `recommendationSession`, 재시도를 위한 `pendingAttempt`, 생성된 `course`를 앱 컨텍스트에 둔다.
- 출발지: 현재 위치, 지역, 주소 검색, 건너뛰기를 지원한다. 지역·주소는 `geocodeOrigin`, 현재 위치는 Expo Location을 사용한다.
- 결과: 역할, 점수, 추천 이유, 주의사항, 계절, 혼잡도, 거리·시간, 북마크, 좋아요·싫어요 사유, 재추천, 하루 코스를 연결했다.
- 상세: 장소 API, KTO 사진·관광정보·방문 집중률, 서버 북마크, 공유, 카카오맵, 하루 코스를 연결했다. `unknown` 혼잡도는 정보 없음으로 표시한다.
- 상위 화면: 최근 추천 복원·삭제·재추천, 코스 순서·체류 시간·카카오맵, 서버 북마크 목록·해제, 사용자·로그인 제공자·최근 로그인·로그아웃을 구현했다.

## 시각 비교

| 기준 | 구현 | 오버레이 |
|---|---|---|
| `KakaoTalk_20260705_014446672.jpg` | `output/playwright/home-final-390x844.png` | `output/visual-comparison/home-final-overlay.png` |

- 랜딩 390×844 캡처에서 헤더, 위치 문구, 제목, 설명, 2개 CTA, 최근 추천, 저장한 곳, 하단 탭의 세로 리듬을 기준 JPG에 맞췄다.
- 430×932 결과는 `output/playwright/home-final-430x932.png`에 남겼다.
- 히어로 원본 사진이 없어 시안의 오른쪽 절벽·소나무·작은 숙소·왼쪽 여백 구도를 유지한 새 사진을 생성해 `assets/images/editorial/landing-coast.png`에 저장했다. UI 텍스트와 버튼은 이미지에 포함하지 않았다.
- 이미지 콘텐츠 자체가 다른 영역은 픽셀 일치 지표로 삼지 않았다.

## Taste / Impeccable 검수 반영

- 시안 우선: 새 레이아웃 미학, 글래스모피즘, 보라색, 과한 그림자, 장식 모션을 추가하지 않았다.
- 아이콘: 네트워크 폰트와 누락 글리프가 없는 로컬 SVG 레지스트리로 통일했다.
- 접근성: 핵심 조작 44–56dp, Android 하단 탭 48dp, Safe Area, radio 선택 상태, 로딩·disabled 상태, reduced-motion을 반영했다.
- 오류 복구: 401 로그인 이동, 409 동일 키 재시도·재사용 확인, 422 결과 없음, 503 입력·키 보존 재시도 구조를 반영했다.
- 랜딩 모션은 260ms 페이드와 버튼 눌림만 남겼다.

## 검증 증거

| 검사 | 결과 |
|---|---|
| `pnpm --filter @workspace/goat-mobile typecheck` | 통과 |
| `pnpm --filter @workspace/goat-mobile verify:v2-ui` | 통과, 73개 소스 파일 검사 |
| API 서버 typecheck | 통과 |
| API 서버 `verify` | 통과: 61 places, 7 moods, score v2, audit, persistence |
| Expo Web production export | 통과 |
| Expo Android production export | 통과, 1,676 modules |
| Expo iOS production export | 통과, 1,680 modules |
| Playwright 랜딩·감성 선택·여행 조건 흐름 | 통과, 콘솔 오류 0 |
| UI 소스의 `@expo/vector-icons` / 사진 분석 참조 | 0개 |

## 환경 의존 제한

- 실제 OAuth 공급자 승인과 실제 추천 생성은 서버의 OAuth 키, DB, `EXPO_PUBLIC_API_BASE_URL`이 있는 배포 환경에서 종단 간 확인해야 한다. 로컬 정적 웹 캡처는 API 없이 랜딩 시각 검증에 사용했다.
- Android/iOS 실기기에서 200% 큰 글자, TalkBack·VoiceOver, 예측 뒤로가기, OAuth 쿠키 공유를 최종 확인해야 한다. 프로덕션 번들 생성은 양쪽 모두 통과했다.
- 10개 과거 시안 중 사진 업로드·사진 분석 시안은 확정된 기능 제거 결정에 따라 구현 대상에서 제외했다. 나머지 기존 캡처는 이전 구현 증거이므로 이번 v2 랜딩 증거와 혼동하지 않는다.
