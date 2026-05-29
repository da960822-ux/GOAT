/**
 * KTO 관광사진 정보_GW — Tourism Photo Gallery API
 * Endpoint: https://apis.data.go.kr/B551011/PhotoGalleryService1/galleryList1
 *
 * Search priority:
 *   1. place_name
 *   2. city + place_name
 *   3. primary_mood
 *   4. mood_tags[0]
 *   5. 관광공모전 수상작 (award photo fallback via ktoAwardPhotoApi)
 *   6. { imageUrl: null, source: 'fallback' }
 */

import { ktoFetch, getAuthParams, extractItems } from './ktoApi';
import { KTOPhotoResult } from './ktoTypes';

export type { KTOPhotoResult };

const BASE_URL =
  'https://apis.data.go.kr/B551011/PhotoGalleryService1/galleryList1';

const photoCache = new Map<string, KTOPhotoResult | null>();

interface GalleryItem {
  galWebImageUrl?: string;
  galThumbnailImageUrl?: string;
  galTitle?: string;
  galAddr1?: string;
  galAddr2?: string;
  galSearchKeyword?: string;
}

async function fetchByKeyword(keyword: string): Promise<KTOPhotoResult | null> {
  const json = await ktoFetch(BASE_URL, {
    ...getAuthParams(),
    numOfRows: '5',
    pageNo: '1',
    keyword,
  });
  const items = extractItems(json) as GalleryItem[];
  if (!items.length) return null;

  const item = items.find((i) => i.galWebImageUrl) ?? items[0];
  if (!item) return null;

  const imageUrl = item.galWebImageUrl ?? item.galThumbnailImageUrl ?? null;
  const location = [item.galAddr1, item.galAddr2].filter(Boolean).join(' ') || undefined;
  const keywords = item.galSearchKeyword
    ? item.galSearchKeyword.split(/[, ]+/).filter(Boolean)
    : undefined;

  return {
    imageUrl: imageUrl || null,
    title: item.galTitle,
    location,
    keywords,
    source: 'KTO_PHOTO_API',
  };
}

/**
 * Fetch the best available tourism photo for a place.
 * Falls back through photo contest API then returns null imageUrl.
 * Results are cached in memory for the session.
 */
export async function getPlacePhoto(
  placeName: string,
  primaryMood: string,
  moodTags: string[],
  city?: string
): Promise<KTOPhotoResult> {
  if (photoCache.has(placeName)) {
    return photoCache.get(placeName) ?? { imageUrl: null, source: 'fallback' };
  }

  // 1. Exact place name
  let result = await fetchByKeyword(placeName);

  // 2. City + place name
  if (!result?.imageUrl && city) {
    result = await fetchByKeyword(`${city} ${placeName}`);
  }

  // 3. Primary mood
  if (!result?.imageUrl) {
    result = await fetchByKeyword(primaryMood);
  }

  // 4. First mood tag
  if (!result?.imageUrl && moodTags.length > 0) {
    result = await fetchByKeyword(moodTags[0]);
  }

  // 5. Award photo fallback (lazy import to avoid circular dep)
  if (!result?.imageUrl) {
    try {
      const { getAwardPhoto } = await import('./ktoAwardPhotoApi');
      const award = await getAwardPhoto(placeName, primaryMood, moodTags);
      if (award.imageUrl) {
        result = { ...award, source: 'KTO_AWARD_PHOTO_API' };
      }
    } catch {
      // award photo API not available — continue to fallback
    }
  }

  const final: KTOPhotoResult = result?.imageUrl
    ? result
    : { imageUrl: null, source: 'fallback' };

  photoCache.set(placeName, final);
  return final;
}

export function clearPhotoCache(): void {
  photoCache.clear();
}
