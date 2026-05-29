/**
 * KTO 관광사진 정보_GW
 * Korea Tourism Organization — Tourism Photo Gallery API
 *
 * Endpoint: https://apis.data.go.kr/B551011/PhotoGalleryService1/galleryList1
 * Docs: https://www.data.go.kr/data/15101578/openapi.do
 *
 * Search strategy:
 *   1. place_name keyword → use first result
 *   2. primary_mood keyword → use first result
 *   3. mood_tags[0] keyword → use first result
 *   4. Return {imageUrl: null, source: 'fallback'}
 *
 * TODO (Priority 2): Connect 한국관광공사_국문 관광정보 서비스_GW
 *   Endpoint: https://apis.data.go.kr/B551011/KorService1/searchKeyword1
 *   Purpose: Enrich place data with real addresses, coordinates, descriptions
 *   File: src/services/tourInfoApi.ts (stub already exists)
 *
 * TODO (Priority 3): Connect 한국관광공사_관광지 집중률 방문자 추이 예측 정보
 *   Purpose: Crowd-level indicator per place/time period
 *   File: src/services/visitorPredictionApi.ts (stub already exists)
 *
 * TODO (Priority 4): Connect 한국관광공사_기초지자체 중심 관광지 정보
 *   Purpose: Local municipality tourism data to fill data gaps
 *   File: src/services/localTourApi.ts (stub already exists)
 *
 * TODO (Priority 5): Connect 한국관광공사_관광공모전(사진) 수상작 정보
 *   Purpose: High-quality award-winning photos as hero image candidates
 *   Can be merged into this service or a separate awardPhotoApi.ts
 */

const BASE_URL =
  'https://apis.data.go.kr/B551011/PhotoGalleryService1/galleryList1';
const SERVICE_KEY = process.env.EXPO_PUBLIC_KTO_SERVICE_KEY ?? '';
const MOBILE_OS = process.env.EXPO_PUBLIC_KTO_MOBILE_OS ?? 'ETC';
const MOBILE_APP = process.env.EXPO_PUBLIC_KTO_MOBILE_APP ?? 'GOAT';

if (!SERVICE_KEY && __DEV__) {
  console.warn('[ktoPhotoApi] EXPO_PUBLIC_KTO_SERVICE_KEY is not set.');
}

export interface KTOPhotoResult {
  imageUrl: string | null;
  title?: string;
  location?: string;
  keyword?: string;
  source: 'KTO_PHOTO_API' | 'fallback';
}

/** In-memory cache keyed by place_name */
const photoCache = new Map<string, KTOPhotoResult | null>();

interface GalleryItem {
  galWebImageUrl?: string;
  galThumbnailImageUrl?: string;
  galTitle?: string;
  galAddr1?: string;
  galAddr2?: string;
  galSearchKeyword?: string;
}

function buildUrl(keyword: string): string {
  // Append serviceKey as-is (already URL-encoded by data.go.kr portal).
  // Other params use encodeURIComponent to avoid double-encoding.
  return (
    `${BASE_URL}` +
    `?serviceKey=${SERVICE_KEY}` +
    `&numOfRows=5` +
    `&pageNo=1` +
    `&MobileOS=${encodeURIComponent(MOBILE_OS)}` +
    `&MobileApp=${encodeURIComponent(MOBILE_APP)}` +
    `&_type=json` +
    `&keyword=${encodeURIComponent(keyword)}`
  );
}

async function fetchPhotoByKeyword(keyword: string): Promise<KTOPhotoResult | null> {
  if (!SERVICE_KEY) return null;
  try {
    const res = await fetch(buildUrl(keyword), {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;

    const json = await res.json();
    const body = json?.response?.body;
    if (!body) return null;

    // API returns "" (empty string) when no items exist
    const items = body?.items?.item;
    if (!items || items === '') return null;

    const list: GalleryItem[] = Array.isArray(items) ? items : [items];
    const item = list.find((i) => i.galWebImageUrl) ?? list[0];
    if (!item) return null;

    const imageUrl = item.galWebImageUrl ?? item.galThumbnailImageUrl ?? null;
    const location = [item.galAddr1, item.galAddr2].filter(Boolean).join(' ') || undefined;

    return {
      imageUrl: imageUrl || null,
      title: item.galTitle,
      location,
      keyword: item.galSearchKeyword,
      source: 'KTO_PHOTO_API',
    };
  } catch {
    return null;
  }
}

/**
 * Fetch the best available tourism photo for a place.
 * Results are cached in memory for the session.
 */
export async function getPlacePhoto(
  placeName: string,
  primaryMood: string,
  moodTags: string[]
): Promise<KTOPhotoResult> {
  // Return cached result immediately (including null = confirmed no photo)
  if (photoCache.has(placeName)) {
    return photoCache.get(placeName) ?? { imageUrl: null, source: 'fallback' };
  }

  // 1. Search by exact place name
  let result = await fetchPhotoByKeyword(placeName);

  // 2. Fallback: search by primary mood
  if (!result?.imageUrl) {
    result = await fetchPhotoByKeyword(primaryMood);
  }

  // 3. Fallback: search by first mood tag
  if (!result?.imageUrl && moodTags.length > 0) {
    result = await fetchPhotoByKeyword(moodTags[0]);
  }

  const final: KTOPhotoResult = result?.imageUrl
    ? result
    : { imageUrl: null, source: 'fallback' };

  photoCache.set(placeName, final);
  return final;
}

/** Clear the in-memory cache (e.g., for testing) */
export function clearPhotoCache(): void {
  photoCache.clear();
}
