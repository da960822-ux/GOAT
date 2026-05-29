/**
 * KTO 국문 관광정보 서비스_GW
 * Provides: address, coordinates, overview, parking, usage time, contact
 *
 * Flow:
 *   1. searchKeyword1 → find contentId for the place (filter to Gangwon, areaCode=32)
 *   2. detailCommon1  → overview, coords, contact
 *   3. detailIntro1   → parking, usage time, rest day (by contentTypeId)
 */

import { ktoFetch, getAuthParams, extractItems, stripHtml } from './ktoApi';
import { KTOTourInfo } from './ktoTypes';

const SEARCH_URL = 'https://apis.data.go.kr/B551011/KorService1/searchKeyword1';
const DETAIL_COMMON_URL = 'https://apis.data.go.kr/B551011/KorService1/detailCommon1';
const DETAIL_INTRO_URL = 'https://apis.data.go.kr/B551011/KorService1/detailIntro1';

const GANGWON_AREA_CODE = '32';

const cache = new Map<string, KTOTourInfo | null>();

interface SearchResult {
  contentId: string;
  contentTypeId: string;
  addr1: string;
  mapx: string;
  mapy: string;
  title: string;
}

async function searchPlace(keyword: string): Promise<SearchResult | null> {
  const json = await ktoFetch(SEARCH_URL, {
    ...getAuthParams(),
    keyword,
    areaCode: GANGWON_AREA_CODE,
    numOfRows: '10',
    pageNo: '1',
  });
  const items = extractItems(json);
  if (!items.length) return null;

  // Prefer item whose title closely matches the search keyword
  const target = keyword.split(' ').pop() ?? keyword;
  const matched = items.find((i: any) => i.title?.includes(target)) ?? items[0];

  return {
    contentId: matched.contentid ?? '',
    contentTypeId: matched.contenttypeid ?? '12',
    addr1: matched.addr1 ?? '',
    mapx: matched.mapx ?? '',
    mapy: matched.mapy ?? '',
    title: matched.title ?? '',
  };
}

async function fetchDetailCommon(contentId: string): Promise<{
  overview?: string;
  tel?: string;
  homepage?: string;
  mapx?: string;
  mapy?: string;
}> {
  const json = await ktoFetch(DETAIL_COMMON_URL, {
    ...getAuthParams(),
    contentId,
    defaultYN: 'Y',
    firstImageYN: 'N',
    areacodeYN: 'N',
    catcodeYN: 'N',
    addrinfoYN: 'Y',
    mapinfoYN: 'Y',
    overviewYN: 'Y',
  });
  const items = extractItems(json);
  const item = items[0];
  if (!item) return {};
  return {
    overview: item.overview ? stripHtml(item.overview) : undefined,
    tel: item.tel ? stripHtml(item.tel) : undefined,
    homepage: item.homepage ? stripHtml(item.homepage) : undefined,
    mapx: item.mapx,
    mapy: item.mapy,
  };
}

async function fetchDetailIntro(contentId: string, contentTypeId: string): Promise<{
  parking?: string;
  usageTime?: string;
  restDate?: string;
}> {
  const json = await ktoFetch(DETAIL_INTRO_URL, {
    ...getAuthParams(),
    contentId,
    contentTypeId,
  });
  const items = extractItems(json);
  const item = items[0];
  if (!item) return {};

  // Field names vary by contentTypeId — try all known variants
  const parking =
    item.parking ??
    item.chkparkingbeach ??
    item.chkparkingculture ??
    item.chkparkinglodging ??
    undefined;
  const usageTime =
    item.usetime ??
    item.usetimeculture ??
    item.usetimefestival ??
    item.usetimeleports ??
    undefined;
  const restDate =
    item.restdate ??
    item.restdateculture ??
    item.restdatefestival ??
    undefined;

  return {
    parking: parking ? stripHtml(String(parking)) : undefined,
    usageTime: usageTime ? stripHtml(String(usageTime)) : undefined,
    restDate: restDate ? stripHtml(String(restDate)) : undefined,
  };
}

/**
 * Fetch official tourism info for a place.
 * Searches Gangwon (areaCode=32) only.
 * Results are cached in memory for the session.
 */
export async function getTourInfo(placeName: string, city: string): Promise<KTOTourInfo> {
  const cacheKey = `${placeName}::${city}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey) ?? { source: 'local' };
  }

  try {
    // 1. Search by place name, then city + name
    let found = await searchPlace(placeName);
    if (!found?.contentId) found = await searchPlace(`${city} ${placeName}`);
    if (!found?.contentId) {
      cache.set(cacheKey, null);
      return { source: 'local' };
    }

    // 2. Parallel detail fetches
    const [common, intro] = await Promise.all([
      fetchDetailCommon(found.contentId),
      fetchDetailIntro(found.contentId, found.contentTypeId),
    ]);

    // Prefer detail coords over search coords (more accurate)
    const rawMapx = common.mapx ?? found.mapx;
    const rawMapy = common.mapy ?? found.mapy;
    const longitude = rawMapx ? parseFloat(rawMapx) : undefined;
    const latitude = rawMapy ? parseFloat(rawMapy) : undefined;

    const result: KTOTourInfo = {
      contentId: found.contentId,
      contentTypeId: found.contentTypeId,
      title: found.title,
      address: found.addr1 || undefined,
      latitude: latitude && !isNaN(latitude) ? latitude : undefined,
      longitude: longitude && !isNaN(longitude) ? longitude : undefined,
      overview: common.overview,
      parking: intro.parking,
      usageTime: intro.usageTime,
      restDate: intro.restDate,
      phone: common.tel,
      homepage: common.homepage,
      source: 'KTO_TOUR_INFO',
    };

    cache.set(cacheKey, result);
    return result;
  } catch {
    cache.set(cacheKey, null);
    return { source: 'local' };
  }
}

export function clearTourInfoCache(): void {
  cache.clear();
}
