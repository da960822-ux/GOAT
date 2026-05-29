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

/**
 * Fetch a gallery photo by contentId.
 * NOTE: The PhotoGalleryService1 API rejects free-form Korean `keyword` params
 * with INVALID_REQUEST_PARAMETER_ERROR — only use contentId or no filter.
 */
async function fetchByContentId(contentId: string): Promise<KTOPhotoResult | null> {
  const json = await ktoFetch(BASE_URL, {
    ...getAuthParams(),
    numOfRows: '5',
    pageNo: '1',
    contentId,
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

/** Fetch photo for a contentId — exported for use by usePlacePhoto */
export async function getPlacePhotoByContentId(contentId: string): Promise<KTOPhotoResult | null> {
  return fetchByContentId(contentId);
}

/**
 * @deprecated Use usePlacePhoto hook instead — it sources photos from
 * KorService2 firstimage (getTourInfo) and getPlacePhotoByContentId.
 * Kept for API compatibility; always returns fallback.
 */
export async function getPlacePhoto(
  _placeName: string,
  _primaryMood: string,
  _moodTags: string[],
  _city?: string
): Promise<KTOPhotoResult> {
  return { imageUrl: null, source: 'fallback' };
}

export function clearPhotoCache(): void {
  photoCache.clear();
}
