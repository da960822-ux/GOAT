# GOAT 원스토어 출시 체크리스트

확인 기준일: 2026-09-13

DB 주소는 이 체크리스트의 검증 대상에서 제외한다. 출시 빌드 전 아래 명령이 오류 없이 끝나야 한다.

```powershell
$env:EXPO_PUBLIC_API_BASE_URL='https://실제-운영-API-주소'
pnpm --filter @workspace/goat-mobile verify:onestore-release
```

## 현재 코드에서 처리한 항목

- 기기 현재 위치 권한과 GPS 호출을 사용하지 않는다.
- 사용자가 지역·주소를 직접 입력하거나 출발지를 건너뛸 수 있다.
- 서버는 레거시 `origin.type=current` 요청을 거부한다.
- 로그인 추천 기록에는 정확한 출발 좌표와 입력 원문을 저장하지 않는다.
- Google Places 콘텐츠는 `ENABLE_GOOGLE_PLACES_CONTENT=true`일 때만 사용한다. 출시 기본값은 `false`다.
- 선택 장소를 코스 첫 장소로 유지하고 내부 61개 장소 중 최대 2곳만 추가한다.

## 출시를 막는 외부 설정

- `app.json`의 `extra.eas.projectId`에 실제 Expo/EAS 프로젝트 ID를 연결한다.
- EAS production 환경에 실제 HTTPS `EXPO_PUBLIC_API_BASE_URL`을 등록한다.
- 실제 수신 가능한 판매자 이메일·전화번호·웹사이트와 공개 개인정보처리방침 HTTPS URL을 준비한다.
- 신규 상품의 APK/AAB 전략과 서명키 관리 방식을 정한다. AAB로 시작하면 이후 APK로 되돌릴 수 없다.
- 기존 `com.goattravel.app` 상품이 있다면 현재 판매본보다 큰 `versionCode`를 사용한다.

## 원스토어 등록 자료

- 대표 아이콘: 512×512 JPG 또는 PNG
- 그래픽 이미지: 1024×578 JPG 또는 PNG
- 스크린샷: 현재 출시 화면 2~8장, 각 1MB 이하·1300×1300 이하(세로 권장 720×1280)
- 상품명 50자 이하, 한줄 설명 100자 이하, 상세 설명 1300자 이하, 검색 키워드 1~10개
- 앱 권한과 사용 목적, 판매자명·이메일·전화번호·웹사이트
- 카테고리, 연령등급, 광고 SDK 미적용, Android Auto 미지원 여부

## 바이너리 검증

1. 먼저 production과 같은 코드·환경으로 범용 APK를 만들어 실제 기기에 설치한다.
2. 첫 실행, 추천 3장, 카드 교체, 장소 상세, 코스 생성, 카카오맵 이동, 저장·복원, 로그인과 로그아웃을 확인한다.
3. 네트워크 끊김, API 4xx/5xx, 사진·날씨 제공자 장애에서도 재시도 또는 대체 상태가 보이는지 확인한다.
4. 최종 AAB/APK에서 package, versionCode, target/min SDK, 64비트 ABI, 서명, `android:exported`, 권한 목록을 검사한다.
5. 위치 권한과 광고 ID 권한이 없음을 최종 manifest에서 다시 확인한다.
6. 바이너리와 지원단말을 등록한 뒤 검증 요청하고, 승인 상태를 확인한 다음 배포한다.

## 심사 참고 문구 초안

GOAT는 기기의 현재 위치 권한을 요청하거나 GPS 정보를 수집하지 않습니다. 출발지는 사용자가 지역 또는 주소를 직접 입력하거나 건너뛸 수 있습니다. 추천 결과에서 선택한 장소를 중심으로 GOAT가 보유한 강원 장소 안에서 하루 코스를 만들며, 카카오맵 버튼은 외부 지도 앱을 엽니다. 로그인은 선택 사항이며 주요 추천·저장 기능은 로그인 없이 사용할 수 있습니다.

## 공식 기준

- [판매정보](https://onestore-dev.gitbook.io/dev/docs/apps/android/app-info)
- [바이너리](https://onestore-dev.gitbook.io/dev/docs/apps/android/binary)
- [앱 서명](https://onestore-dev.gitbook.io/dev/docs/apps/android/app-signing)
- [검증 절차](https://onestore-dev.gitbook.io/dev/docs/review)
- [상품 검증 가이드라인](https://onestore-dev.gitbook.io/dev/docs/review/one-store-review-guideline)
