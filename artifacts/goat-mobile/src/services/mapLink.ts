/**
 * MAP LINK SERVICE
 *
 * 지도 연결 안정화 버전
 *
 * 처리 순서:
 * 1. 카카오맵 앱 딥링크 먼저 시도
 * 2. 실패하면 카카오맵 웹 링크로 fallback
 * 3. 웹 링크도 실패하면 Alert 안내
 *
 * 추천 로직/API 구조는 건드리지 않고,
 * 지도 연결 실패 상황에서 앱이 멈추지 않도록 방어 처리만 강화한다.
 */
import { Alert, Linking, Platform } from 'react-native';
import { Place } from '../types/place';

const ANDROID_PACKAGE_NAME = 'com.goattravel.app';
const IOS_BUNDLE_IDENTIFIER = 'com.goattravel.app';
const NAVER_APP_NAME = ANDROID_PACKAGE_NAME;

type MapCoords = {
  lat: number;
  lng: number;
};

function safeText(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function isValidCoords(coords?: MapCoords): coords is MapCoords {
  return (
    !!coords &&
    typeof coords.lat === 'number' &&
    typeof coords.lng === 'number' &&
    Number.isFinite(coords.lat) &&
    Number.isFinite(coords.lng)
  );
}

function getPlaceName(place: Place): string {
  return safeText(place.place_name, '강원 관광지');
}

function getPlaceCity(place: Place): string {
  return safeText(place.city, '강원');
}

function buildSearchQuery(place: Place): string {
  const city = getPlaceCity(place);
  const name = getPlaceName(place);

  return encodeURIComponent(`${city} ${name}`);
}

async function tryOpenUrl(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

async function openUrlWithFallback(
  appUrl: string,
  webUrl: string,
  failTitle: string,
  failMessage: string
): Promise<void> {
  /**
   * 웹에서는 kakaomap://, nmap://, tmap:// 같은 앱 스킴을 열면
   * 빈 탭이 뜨거나 실패할 수 있으므로 바로 웹 URL로 연결한다.
   */
  if (Platform.OS === 'web') {
    const opened = await tryOpenUrl(webUrl);

    if (!opened) {
      Alert.alert(failTitle, failMessage);
    }

    return;
  }

  /**
   * Android/iOS:
   * 1차: 앱 딥링크 시도
   * 2차: 웹 지도 링크 시도
   */
  const openedApp = await tryOpenUrl(appUrl);

  if (openedApp) return;

  const openedWeb = await tryOpenUrl(webUrl);

  if (openedWeb) return;

  Alert.alert(failTitle, failMessage);
}

// ─── KakaoMap ──────────────────────────────────────────────────────────────

export function createKakaoMapLink(place: Place, coords?: MapCoords): string {
  if (isValidCoords(coords)) {
    return `kakaomap://look?p=${coords.lat},${coords.lng}`;
  }

  return `kakaomap://search?q=${buildSearchQuery(place)}`;
}

export function createKakaoMapWebLink(place: Place, coords?: MapCoords): string {
  const placeName = getPlaceName(place);

  if (isValidCoords(coords)) {
    return `https://map.kakao.com/link/map/${encodeURIComponent(placeName)},${coords.lat},${coords.lng}`;
  }

  return `https://map.kakao.com/?q=${buildSearchQuery(place)}`;
}

export async function openKakaoMap(
  place: Place,
  coords?: MapCoords
): Promise<void> {
  const appUrl = createKakaoMapLink(place, coords);
  const webUrl = createKakaoMapWebLink(place, coords);

  await openUrlWithFallback(
    appUrl,
    webUrl,
    '지도를 열 수 없어요',
    '카카오맵 앱과 웹 지도를 모두 열 수 없습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요.'
  );
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

  await openUrlWithFallback(
    appUrl,
    webUrl,
    '지도를 열 수 없어요',
    '네이버지도 앱과 웹 지도를 모두 열 수 없습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요.'
  );
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

  await openUrlWithFallback(
    appUrl,
    webUrl,
    '지도를 열 수 없어요',
    '티맵 앱과 웹 지도를 모두 열 수 없습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요.'
  );
}

void IOS_BUNDLE_IDENTIFIER;