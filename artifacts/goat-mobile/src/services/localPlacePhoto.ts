import { Image } from 'react-native';

import type { KTOPhotoResult } from './ktoTypes';

type LocalImageModule = number | { uri?: string; default?: { uri?: string } };
type ImageWithResolver = typeof Image & {
  resolveAssetSource?: (source: LocalImageModule) => { uri?: string } | null;
};

const LOCAL_PLACE_IMAGE_MODULES: Record<string, LocalImageModule> = {
  '레고랜드 코리아 리조트': require('@/assets/images/place-reference/legoland-korea-resort.webp'),
  교토정원: require('@/assets/images/place-reference/chuncheon-kyoto-garden.jpg'),
  '스테이 조각밤': require('@/assets/images/place-reference/stay-jogakbam.jpg'),
  '교동 소품샵 거리': require('@/assets/images/place-reference/gyodong-gift-shop-ai.jpg'),
  이와림: require('@/assets/images/place-reference/iwalim.jpg'),
  '뮤지엄 SAN': require('@/assets/images/place-reference/museum-san.jpg'),
  '발왕산 천년주목숲길·애니포레': require('@/assets/images/place-reference/balwangsan-anyfore.jpg'),
  '정동진 철길 건널목': require('@/assets/images/place-reference/jeongdongjin-railroad.jpg'),
  '휴식 료칸 풀빌라': require('@/assets/images/place-reference/hyusik-ryokan-pool-villa.jpg'),
  '유메모리 리조트': require('@/assets/images/place-reference/yumemori-resort.jpg'),
  어달삼거리: require('@/assets/images/place-reference/eodal-junction.jpg'),
  '묵호항 일대': require('@/assets/images/place-reference/mukho-port.jpg'),
  '묵호등대·논골담길': require('@/assets/images/place-reference/mukho-nongoldamgil.jpg'),
  '속초 관광수산시장·대포항': require('@/assets/images/place-reference/sokcho-daepo-port.jpg'),
  '카페 흰다정': require('@/assets/images/place-reference/cafe-hindajeong.jpg'),
  두둥실: require('@/assets/images/place-reference/doodoongsil-cafe.jpg'),
  '에이프레임(A-Frame)': require('@/assets/images/place-reference/a-frame.jpg'),
  '켄싱턴리조트 설악밸리': require('@/assets/images/place-reference/kensington-seorak-valley.jpg'),
  '사유의 숲': require('@/assets/images/place-reference/sayu-forest.jpg'),
  '쏠비치 삼척·산토리니 광장': require('@/assets/images/place-reference/sol-beach-samcheok.jpg'),
  라메종드마리: require('@/assets/images/place-reference/la-maison-de-marie.jpg'),
  '죽도해변·인구해변·양리단길': require('@/assets/images/place-reference/jukdo-beach.jpg'),
  초곡용굴촛대바위길: require('@/assets/images/place-reference/chogok-sea-cave.webp'),
};

const GENERATED_PLACE_IMAGE_NAMES = new Set(['교동 소품샵 거리']);

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
    attributionLabel: GENERATED_PLACE_IMAGE_NAMES.has(placeName)
      ? 'AI 생성 장면 예시 · GOAT 제작'
      : '앱 보유 장소 이미지 · 실제 장소 참고',
    isGenerated: GENERATED_PLACE_IMAGE_NAMES.has(placeName),
    title: placeName,
    source: 'LOCAL_PLACE_IMAGE',
  };
}

export const LOCAL_PLACE_IMAGE_PLACE_NAMES = Object.keys(LOCAL_PLACE_IMAGE_MODULES);
