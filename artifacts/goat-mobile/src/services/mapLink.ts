import { Place } from '../types/place';
import { Linking } from 'react-native';

function buildSearchQuery(place: Place): string {
  return encodeURIComponent(`${place.city} ${place.place_name}`);
}

export function createKakaoMapLink(place: Place): string {
  const query = buildSearchQuery(place);
  return `kakaomap://search?q=${query}`;
}

export function createKakaoMapWebLink(place: Place): string {
  const query = buildSearchQuery(place);
  return `https://map.kakao.com/?q=${query}`;
}

export function createNaverMapLink(place: Place): string {
  const query = buildSearchQuery(place);
  return `nmap://search?query=${query}&appname=com.goat.travel`;
}

export function createNaverMapWebLink(place: Place): string {
  const query = buildSearchQuery(place);
  return `https://map.naver.com/v5/search/${query}`;
}

export function createTmapLink(place: Place): string {
  const query = buildSearchQuery(place);
  return `tmap://search?name=${query}`;
}

export function createTmapWebLink(place: Place): string {
  const query = buildSearchQuery(place);
  return `https://www.tmap.co.kr/tmap2/mobile/route.do?searchKeyword=${query}`;
}

export async function openKakaoMap(place: Place): Promise<void> {
  const appUrl = createKakaoMapLink(place);
  const webUrl = createKakaoMapWebLink(place);
  const canOpen = await Linking.canOpenURL(appUrl);
  await Linking.openURL(canOpen ? appUrl : webUrl);
}

export async function openNaverMap(place: Place): Promise<void> {
  const appUrl = createNaverMapLink(place);
  const webUrl = createNaverMapWebLink(place);
  const canOpen = await Linking.canOpenURL(appUrl);
  await Linking.openURL(canOpen ? appUrl : webUrl);
}

export async function openTmap(place: Place): Promise<void> {
  const appUrl = createTmapLink(place);
  const webUrl = createTmapWebLink(place);
  const canOpen = await Linking.canOpenURL(appUrl);
  await Linking.openURL(canOpen ? appUrl : webUrl);
}
