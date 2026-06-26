import { Image } from 'react-native';

import type { KTOPhotoResult } from './ktoTypes';

type LocalImageModule = number | { uri?: string; default?: { uri?: string } };
type ImageWithResolver = typeof Image & {
  resolveAssetSource?: (source: LocalImageModule) => { uri?: string } | null;
};

const LOCAL_PLACE_IMAGE_MODULES: Record<string, LocalImageModule> = {
  '레고랜드 코리아 리조트': require('../../../../24place_img/레고랜드 코리아 리조트.webp'),
  교토정원: require('../../../../24place_img/춘천 교토정원.jpg'),
  '스테이 조각밤': require('../../../../24place_img/스테이 조각밤.jpg'),
  이와림: require('../../../../24place_img/이와림.jpg'),
  '뮤지엄 SAN': require('../../../../24place_img/뮤지엄SAN.jpg'),
  '발왕산 천년주목숲길·애니포레': require('../../../../24place_img/발왕산 애니포레.jpg'),
  '정동진 철길 건널목': require('../../../../24place_img/정동진 철길 건널목(건널목 사진은 아님).jpg'),
  '휴식 료칸 풀빌라': require('../../../../24place_img/휴식 료칸 풀빌라.jpg'),
  '유메모리 리조트': require('../../../../24place_img/유메모리 리조트.jpg'),
  어달삼거리: require('../../../../24place_img/어달삼거리.jpg'),
  '묵호항 일대': require('../../../../24place_img/묵호항 일대.jpg'),
  '묵호등대·논골담길': require('../../../../24place_img/묵호 논골담길.jpg'),
  '속초 관광수산시장·대포항': require('../../../../24place_img/속초 대포항.jpg'),
  '카페 흰다정': require('../../../../24place_img/카페 흰다정.jpg'),
  두둥실: require('../../../../24place_img/두둥실 카페.jpg'),
  '에이프레임(A-Frame)': require('../../../../24place_img/에이프레임.jpg'),
  '켄싱턴리조트 설악밸리': require('../../../../24place_img/켄싱턴리조트 설악밸리.jpg'),
  '사유의 숲': require('../../../../24place_img/사유의 숲.jpg'),
  '쏠비치 삼척·산토리니 광장': require('../../../../24place_img/쏠비치 삼척.jpg'),
  라메종드마리: require('../../../../24place_img/라메종드마리.jpg'),
  '죽도해변·인구해변·양리단길': require('../../../../24place_img/죽도 해변.jpg'),
  초곡용굴촛대바위길: require('../../../../24place_img/초곡용굴촛대바위길.webp'),
};

function getLocalImageUri(source: LocalImageModule): string | null {
  if (typeof source === 'object') {
    return source.uri ?? source.default?.uri ?? null;
  }

  const resolveAssetSource = (Image as ImageWithResolver).resolveAssetSource;
  if (typeof resolveAssetSource !== 'function') {
    return null;
  }

  return resolveAssetSource(source)?.uri ?? null;
}

export function getLocalPlacePhoto(placeName: string): KTOPhotoResult | null {
  const source = LOCAL_PLACE_IMAGE_MODULES[placeName];
  if (!source) return null;

  const imageUrl = getLocalImageUri(source);

  return {
    imageUrl,
    imageSource: source,
    title: placeName,
    source: 'LOCAL_PLACE_IMAGE',
  };
}

export const LOCAL_PLACE_IMAGE_PLACE_NAMES = Object.keys(LOCAL_PLACE_IMAGE_MODULES);
