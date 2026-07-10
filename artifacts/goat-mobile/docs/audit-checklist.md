# GOAT App — Audit Checklist

Last updated: 2025-05 (v1.0.0 shell)

## Screen Flow
- [x] Landing → Mood Selection → Travel Preference → Results → Detail → Map → Back
- [x] Photo Mood entry point (beta mock flow) accessible from Landing secondary CTA
- [x] All support screens reachable from Landing footer (GOAT 소개, 이용 안내, 데이터 출처, 개인정보처리방침, 문의하기)
- [x] No dead-end screens — every screen has a working back button or explicit navigation action
- [x] Safe area insets applied on Landing (top + bottom)

## Recommendation Cards
- [x] getRecommendations() always returns exactly 3 cards when eligible pool >= 3 places
- [x] Fallback slot-fill loop prevents < 3 cards from silent partial display
- [x] results.tsx shows EmptyState when recommendations.length < 3
- [x] Eligible pool: 42 confirmed non-lodging places (43 total − 1 레고랜드)
- [x] Card roles clearly distinct: 장면 최적 / 내 상황 맞춤 / 안전한 대안

## Dataset
- [x] Source: goat_places_clean_db_ready.json — "first recommendation pool" (43 places)
- [x] This is NOT the original 58-place seed pool — documented in recommendationService.ts header
- [x] All 43 records have data_status === 'confirmed' — no unconfirmed data shown
- [x] Required fields complete across all 43 records (no missing values)
- [x] Optional fields (lat, lng, imageUrl, etc.) typed as optional — no component depends on them

## Map Links
- [x] KakaoMap only shown in UI (native app deep link → web fallback; web opens map URL directly)
- [x] Search query: city + place_name (no lat/lng available)
- [x] Naver Map and Tmap functions retained in mapLink.ts but not exposed in UI
- [x] ANDROID_PACKAGE_NAME / IOS_BUNDLE_IDENTIFIER constants extracted with TODO comment

## Scoring Logic
- [x] safetyScore() uses exact transport tokens: '자차 상/중/하', '대중 상/중/하'
- [x] No broad accessibility.includes('상') — eliminates false matches (e.g. 상권, 상점)
- [x] When prefs provided, only the matching transport mode contributes to safetyScore
- [x] scorePreferences() already uses exact token matching

## Build / Deployment
- [x] app.json: version 1.0.0, ios.bundleIdentifier, android.package set to com.goattravel.app
- [x] eas.json: development / preview / production profiles present
- [x] TODO: Replace com.goattravel.app with real bundle IDs before App Store submission
- [x] TODO: Set expo.extra.eas.projectId before first EAS build
- [x] TODO: Add google-services-key.json for Android Play Store submission
- [ ] App icon: using placeholder (assets/images/icon.png) — replace before launch
- [ ] Splash screen: using icon as splash — replace before launch

## TypeScript
- [x] tsc --noEmit passes with zero errors
- [x] All new files (photo-mood, contact, imageMoodService, KakaoMapButton) are typed

## Known Non-Issues
- getAlternatives() is labeled "같은 감성 대안" (not "nearby") — correct, no lat/lng
- PhotoMoodScreen uses mock service only — real image analysis not yet implemented (by design)
