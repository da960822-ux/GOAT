/**
 * MAP LINK SERVICE
 *
 * Since the current dataset has no lat/lng or Kakao place IDs,
 * all links use city + place_name as a text search query.
 *
 * UI uses KakaoMap only (app deeplink → web fallback).
 * Naver/Tmap functions are retained here for future use
 * but are NOT exposed in any UI component.
 *
 * TODO: Replace placeholder bundle IDs with real values before production build.
 */
import { Place } from '../types/place';
import { Linking } from 'react-native';

// TODO: Replace with actual android.package / ios.bundleIdentifier before production build
const ANDROID_PACKAGE_NAME = 'com.goattravel.app';
const IOS_BUNDLE_IDENTIFIER = 'com.goattravel.app';

// Naver Map requires the requesting app's bundle ID for deep link authorization
const NAVER_APP_NAME = ANDROID_PACKAGE_NAME;

function buildSearchQuery(place: Place): string {
  return encodeURIComponent(`${place.city} ${place.place_name}`);
}

// ─── KakaoMap ──────────────────────────────────────────────────────────────

export function createKakaoMapLink(place: Place): string {
  const query = buildSearchQuery(place);
  return `kakaomap://search?q=${query}`;
}

export function createKakaoMapWebLink(place: Place): string {
  const query = buildSearchQuery(place);
  return `https://map.kakao.com/?q=${query}`;
}

export async function openKakaoMap(place: Place): Promise<void> {
  const appUrl = createKakaoMapLink(place);
  const webUrl = createKakaoMapWebLink(place);
  const canOpen = await Linking.canOpenURL(appUrl);
  await Linking.openURL(canOpen ? appUrl : webUrl);
}

// ─── Naver Map (not used in UI — retained for future use) ──────────────────

export function createNaverMapLink(place: Place): string {
  const query = buildSearchQuery(place);
  return `nmap://search?query=${query}&appname=${NAVER_APP_NAME}`;
}

export function createNaverMapWebLink(place: Place): string {
  const query = buildSearchQuery(place);
  return `https://map.naver.com/v5/search/${query}`;
}

export async function openNaverMap(place: Place): Promise<void> {
  const appUrl = createNaverMapLink(place);
  const webUrl = createNaverMapWebLink(place);
  const canOpen = await Linking.canOpenURL(appUrl);
  await Linking.openURL(canOpen ? appUrl : webUrl);
}

// ─── Tmap (not used in UI — retained for future use) ──────────────────────

export function createTmapLink(place: Place): string {
  const query = buildSearchQuery(place);
  return `tmap://search?name=${query}`;
}

export function createTmapWebLink(place: Place): string {
  const query = buildSearchQuery(place);
  return `https://www.tmap.co.kr/tmap2/mobile/route.do?searchKeyword=${query}`;
}

export async function openTmap(place: Place): Promise<void> {
  const appUrl = createTmapLink(place);
  const webUrl = createTmapWebLink(place);
  const canOpen = await Linking.canOpenURL(appUrl);
  await Linking.openURL(canOpen ? appUrl : webUrl);
}

// Suppress unused-variable warnings for constants used only in non-UI functions
void IOS_BUNDLE_IDENTIFIER;
