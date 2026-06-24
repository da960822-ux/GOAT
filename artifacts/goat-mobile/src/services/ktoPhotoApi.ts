/**
 * KTO 관광사진 정보_GW — Tourism Photo Gallery API
 * Endpoint: https://apis.data.go.kr/B551011/PhotoGalleryService1/gallerySearchList1
 *
 * Searches the official tourism photo gallery by a place-specific keyword.
 * Results from another city/province are rejected.
 */

import { ktoFetch, getAuthParams, extractItems } from './ktoApi';
import { KTOPhotoResult } from './ktoTypes';
import { getKtoSearchTerms, isRelevantKtoResult } from './ktoPlaceSearch';

export type { KTOPhotoResult };

const BASE_URL =
  'https://apis.data.go.kr/B551011/PhotoGalleryService1/gallerySearchList1';

const photoCache = new Map<string, KTOPhotoResult | null>();

interface GalleryItem {
  galWebImageUrl?: string;
  galThumbnailImageUrl?: string;
  galTitle?: string;
  galAddr1?: string;
  galAddr2?: string;
  galSearchKeyword?: string;
}

async function fetchByKeyword(keyword: string, city: string): Promise<KTOPhotoResult | null> {
  const json = await ktoFetch(BASE_URL, {
    ...getAuthParams(),
    numOfRows: '5',
    pageNo: '1',
    keyword,
  });
  const items = extractItems(json) as GalleryItem[];
  if (!items.length) return null;

  const item = items.find((candidate) =>
    Boolean(candidate.galWebImageUrl || candidate.galThumbnailImageUrl) &&
    isRelevantKtoResult(
      city,
      keyword,
      candidate.galTitle ?? '',
      [candidate.galAddr1, candidate.galAddr2].filter(Boolean).join(' ')
    )
  );
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

export async function getPlacePhoto(
  placeName: string,
  city: string
): Promise<KTOPhotoResult> {
  const cacheKey = `${city}::${placeName}`;
  if (photoCache.has(cacheKey)) {
    return photoCache.get(cacheKey) ?? { imageUrl: null, source: 'fallback' };
  }

  for (const searchTerm of getKtoSearchTerms(placeName)) {
    const result = await fetchByKeyword(searchTerm, city);
    if (result?.imageUrl) {
      photoCache.set(cacheKey, result);
      return result;
    }
  }

  const fallback: KTOPhotoResult = { imageUrl: null, source: 'fallback' };
  photoCache.set(cacheKey, fallback);
  return fallback;
}

export function clearPhotoCache(): void {
  photoCache.clear();
}
