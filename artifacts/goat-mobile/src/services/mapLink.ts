/**
 * MAP LINK SERVICE
 *
 * KakaoMap deep link strategy:
 *   - If lat/lng coordinates are available (from KTO 국문 관광정보 서비스_GW),
 *     use coordinate-based look link for pinpoint accuracy.
 *   - Otherwise fall back to city + place_name text search.
 *
 * UI uses KakaoMap only (app deeplink → web fallback).
 * Naver/Tmap functions are retained here for future use
 * but are NOT exposed in any UI component.
 *
 * TODO: Replace placeholder bundle IDs with real values before production build.
 */
import { Place } from '../types/place';
import { Linking } from 'react-native';

const ANDROID_PACKAGE_NAME = 'com.goattravel.app';
const IOS_BUNDLE_IDENTIFIER = 'com.goattravel.app';
const NAVER_APP_NAME = ANDROID_PACKAGE_NAME;

function buildSearchQuery(place: Place): string {
  return encodeURIComponent(`${place.city} ${place.place_name}`);
}

// ─── KakaoMap ──────────────────────────────────────────────────────────────

export function createKakaoMapLink(place: Place, coords?: { lat: number; lng: number }): string {
  if (coords) {
    return `kakaomap://look?p=${coords.lat},${coords.lng}`;
  }
  return `kakaomap://search?q=${buildSearchQuery(place)}`;
}

export function createKakaoMapWebLink(place: Place, coords?: { lat: number; lng: number }): string {
  if (coords) {
    return `https://map.kakao.com/link/map/${encodeURIComponent(place.place_name)},${coords.lat},${coords.lng}`;
  }
  return `https://map.kakao.com/?q=${buildSearchQuery(place)}`;
}

export async function openKakaoMap(
  place: Place,
  coords?: { lat: number; lng: number }
): Promise<void> {
  const appUrl = createKakaoMapLink(place, coords);
  const webUrl = createKakaoMapWebLink(place, coords);

  try {
    const canOpen = await Linking.canOpenURL(appUrl);
    if (canOpen) {
      await Linking.openURL(appUrl);
    } else {
      await Linking.openURL(webUrl);
    }
  } catch {
    try {
      await Linking.openURL(webUrl);
    } catch {
      const { Alert } = await import('react-native');
      Alert.alert('카카오맵을 열 수 없어요. 잠시 후 다시 시도해주세요.');
    }
  }
}

// ─── Naver Map ─────────────────────────────────────────────────────────────

export function createNaverMapLink(place: Place): string {
  return `nmap://search?query=${buildSearchQuery(place)}&appname=${NAVER_APP_NAME}`;
}

export function createNaverMapWebLink(place: Place): string {
  return `https://map.naver.com/v5/search/${buildSearchQuery(place)}`;
}

export async function openNaverMap(place: Place): Promise<void> {
  const appUrl = createNaverMapLink(place);
  const webUrl = createNaverMapWebLink(place);
  const canOpen = await Linking.canOpenURL(appUrl);
  await Linking.openURL(canOpen ? appUrl : webUrl);
}

// ─── Tmap ──────────────────────────────────────────────────────────────────

export function createTmapLink(place: Place): string {
  return `tmap://search?name=${buildSearchQuery(place)}`;
}

export function createTmapWebLink(place: Place): string {
  return `https://www.tmap.co.kr/tmap2/mobile/route.do?searchKeyword=${buildSearchQuery(place)}`;
}

export async function openTmap(place: Place): Promise<void> {
  const appUrl = createTmapLink(place);
  const webUrl = createTmapWebLink(place);
  const canOpen = await Linking.canOpenURL(appUrl);
  await Linking.openURL(canOpen ? appUrl : webUrl);
}

void IOS_BUNDLE_IDENTIFIER;
