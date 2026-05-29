/**
 * KTO 관광공모전(사진) 수상작 정보
 * Award-winning tourism contest photos.
 *
 * Usage: secondary fallback image source only.
 * Used after 관광사진 정보_GW returns no image.
 *
 * Endpoint assumed from KTO naming convention; graceful fallback if wrong.
 */

import { ktoFetch, getAuthParams, extractItems } from './ktoApi';
import { KTOAwardPhoto } from './ktoTypes';

const AWARD_URL =
  'https://apis.data.go.kr/B551011/PhotoContestService1/getPhotoContestList1';

const cache = new Map<string, KTOAwardPhoto | null>();

async function fetchByKeyword(keyword: string): Promise<KTOAwardPhoto | null> {
  const json = await ktoFetch(AWARD_URL, {
    ...getAuthParams(),
    numOfRows: '5',
    pageNo: '1',
    keyword,
  });
  const items = extractItems(json);
  if (!items.length) return null;

  // Try common image field names used across KTO photo APIs
  const item =
    items.find((i: any) => i.imgUrl || i.imageUrl || i.imgpath || i.galWebImageUrl) ??
    items[0];
  if (!item) return null;

  const imageUrl =
    item.imgUrl ??
    item.imageUrl ??
    item.imgpath ??
    item.galWebImageUrl ??
    null;

  const keywords: string[] = item.keyword
    ? item.keyword.split(/[, ]+/).filter(Boolean)
    : [];

  return {
    imageUrl: imageUrl || null,
    title: item.title ?? item.galTitle ?? undefined,
    awardInfo: item.awardName ?? item.award ?? item.awardGrade ?? undefined,
    location: item.addr ?? item.address ?? item.galAddr1 ?? undefined,
    keywords: keywords.length ? keywords : undefined,
    source: 'KTO_AWARD_PHOTO_API',
  };
}

/**
 * Fetch an award-winning photo for a place.
 * Search priority: place_name → primary_mood → mood_tags[0]
 * Returns null imageUrl if nothing found.
 */
export async function getAwardPhoto(
  placeName: string,
  primaryMood: string,
  moodTags: string[]
): Promise<KTOAwardPhoto> {
  if (cache.has(placeName)) {
    return cache.get(placeName) ?? { imageUrl: null, source: 'fallback' };
  }

  let result = await fetchByKeyword(placeName);
  if (!result?.imageUrl) result = await fetchByKeyword(primaryMood);
  if (!result?.imageUrl && moodTags.length > 0) {
    result = await fetchByKeyword(moodTags[0]);
  }

  const final: KTOAwardPhoto = result?.imageUrl
    ? result
    : { imageUrl: null, source: 'fallback' };

  cache.set(placeName, final);
  return final;
}

export function clearAwardPhotoCache(): void {
  cache.clear();
}
