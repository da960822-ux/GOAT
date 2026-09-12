# GOAT Captain Plan

이 파일은 GOAT 제품 저장소 전체의 작업 지침이다. `agent-skills-main/`은 제품 코드가 아닌 참고용 번들이며, 그 안의 범용 에이전트 워크플로는 GOAT 작업에 적용하지 않는다.

## 기준과 범위

우선순위는 현재 사용자 지시, `GOAT_서비스_수정기획안.md`, `GOAT_실행리스트.md`, 이 파일 순서다. 두 기준 문서는 기본 checkout의 상위 workspace 폴더에 있다.

- 기존 Expo/Express 구조와 장소 61개, 기존 ID를 유지한다.
- P0만 구현한다. P0와 배포 가능한 산출물이 연결되기 전 P1/P2, AI, 계정 동기화, 신규 장소·공급자, 생성 이미지를 시작하지 않는다.
- 새 프레임워크, 장소 SQL 전면 이전, 추측성 추상화와 의존성을 추가하지 않는다.
- Superpowers 및 그 강제 스킬 워크플로를 사용·복원·참조하지 않는다.
- 코딩은 Ponytail의 최소 변경 원칙을 따른다. React Native/Expo 작업은 Vercel React Native 지침을 적용한다. Taste는 웹 마케팅·랜딩 화면에만 적용하고 네이티브 제품 UI에는 강제하지 않는다.

## Captain 통합 규칙

- 모든 worktree 생성, merge, rebase, 충돌 해결, 통합 검증은 Captain이 수행한다.
- 작업 에이전트는 자기 브랜치에만 커밋하고 다른 브랜치를 병합하지 않는다.
- 현재는 D와 E worktree만 사용한다.
  - `codex/d-contract-storage`: `.worktrees/d-contract-storage`
  - `codex/e-release-baseline`: `.worktrees/e-release-baseline`
- D 계약을 Captain이 `develop`에 통합한 뒤에만 최신 `develop`에서 A/B/C worktree를 만든다.
- E는 D와 병렬로 BASE-01을 진행할 수 있다. E 변경을 먼저 통합할 필요가 생기면 Captain이 D와의 충돌 여부를 확인한다.

## 실행 순서

1. D가 최소 공통 계약과 기기 저장 경계를 고정한다.
2. E가 독립적으로 workspace, 기준 build, 환경·release 기반을 정리한다.
3. Captain이 D를 검토·통합한다. 준비된 E baseline도 충돌 검토 후 통합할 수 있다.
4. 그 시점의 최신 `develop`에서 A/B/C worktree를 만든다.
5. A/B/C는 확정 계약을 소비만 하며 공통 계약을 각자 변경하지 않는다.
6. Captain이 A/B/C를 순차 통합하고 E가 최종 운영 연결과 release 검증을 마친다.

## 작업군 소유권

| 작업군 | 단독 소유 | 변경 금지 경계 |
|---|---|---|
| A Catalog/Recommendation | `lib/travel-domain`의 카탈로그, 도메인 특징·관계, 선정·슬롯 교체 순수 규칙 | OpenAPI·생성 API 타입·모바일 저장·배포 설정 |
| B Public Data/Photo | 공급자 어댑터, 사진/커버 선택, 날씨·집중률 정규화, 공급자 권리·캐시 동작 | 장소 추천 규칙·공통 DTO·배포값 |
| C Mobile UX | 발견, Deck, 비교, 상세, 결정 Sheet, 지도, 내 장면 화면 | 추천/공급자 해석, 저장 구현, package/lock/app/EAS |
| D Contract/Storage | OpenAPI, 생성 클라이언트/Zod, 공개·개인 요청 경계, revision/error 계약, `LocalSceneStore` | 도메인 추천 규칙, 공급자 해석, package/lock/EAS |
| E Release | 루트·workspace package/lock/공통 설정, CI/build, app.json/EAS, 환경값, 배포·정책·제출 자산 | OpenAPI·생성 타입, 도메인 추천, 공급자 의미 해석 |

겹치는 파일은 아래처럼 처리한다.

- 의존성·package manifest·lockfile 변경은 E만 수행한다. 다른 작업군은 필요한 의존성을 Captain에게 요청한다.
- API 계약과 생성물은 D만 갱신한다.
- `routes/kto.ts`의 보안·cache-off 골격은 D가 먼저 고정하고, D 통합 뒤 B가 공급자 경로와 정책 해석을 확장한다.
- API 인증·공개 경로 검증 코드는 D가 소유하고 E는 운영 환경값만 연결한다.
- 개인정보·문의 화면의 최종 문구 파일은 E가 소유한다. C는 해당 화면 구조 변경이 필요하면 Captain에게 요청한다.
- GPS 제거는 E가 권한·plugin·dependency를, C가 화면·호출을 담당한다.

## A/B/C가 소비할 최소 계약

D는 구현 세부가 아니라 아래 입출력만 먼저 고정한다.

- 공개 추천 요청: `selectionId`, `mode`, 선택적 `transportType`.
- 공개 추천 응답: `policyVersion`, `catalogVersion`, `selectionId`, `mode`, 정확히 3개의 `cards`, `revision`, `snapshotAt`, `todayStatus`, `appliedFactors`, `skippedFactors`, `partialApplied`.
- 카드: `placeId`, 표시용 장소 정보와 중요 제한, `matchType`, `sceneFitBand`, `matchedFeatures`, `differenceNote`, `placeHero`, `galleryStatus`, `conditions`, `sourceAttributions`, `replacementCount`, `replaceOptions`, `canReplace`.
- 교체 요청: `selectionId`, `mode`, 현재 3개 place ID, `targetSlot`, `seenIds`, `revision`; 실패는 `NO_REPLACEMENT`, `NO_IMPROVING_CANDIDATE`, `REVISION_CONFLICT`로 현재 카드를 보존한다.
- 장면 커버: PHOTO/EDITORIAL 판별 union. PHOTO에는 촬영 장소와 출처, EDITORIAL에는 token과 fallback reason을 둔다.
- 장소 사진: `placeHero`, `evidenceImages`, `galleryStatus`, 출처·권리 상태. 사진 부재는 정상 상태이며 추천 ID·순서를 바꾸지 않는다.
- `LocalSceneStore`: `placeId`, `selectionId`, 자체 메모, 저장 시각의 저장·조회·삭제와 최소 draft 복원만 제공한다.
- 게스트 응답·저장에는 가짜 `userId`/`recommendationId`, 인증 토큰, 공급자 원문, 사진 원본을 넣지 않는다.

경로 이름은 기존 서버 구조를 재사용해 D가 OpenAPI에서 한 번 확정한다. A/B/C는 임시 별칭, `as never`, 화면별 재해석으로 계약을 우회하지 않는다.

## 검증과 보고

- 기준 명령은 `pnpm run typecheck`와 `pnpm run build`다.
- 현재 production build는 mockup Vite 설정이 `PORT`를 요구해 실패하는 상태다. E는 환경변수 없이도 기준 build가 재현되도록 BASE-01에서 해결하고 실제 결과를 남긴다.
- 기능별 최소 회귀 스크립트만 추가·실행한다. 수행하지 않은 API, 권리, 설치, 성능 검증을 성공으로 기록하지 않는다.
- 보고는 변경 작업 ID, 변경 파일, 실행 결과, 남은 blocker만 짧게 남긴다.
