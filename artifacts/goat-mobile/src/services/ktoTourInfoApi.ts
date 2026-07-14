/**
 * KTO 국문 관광정보 서비스_GW (v2)
 * Provides: address, coordinates, overview, parking, usage time, contact
 *
 * API version: KorService2 (updated from KorService1 per API portal)
 * JSON format: append &_type=json
 *
 * Flow:
 *   1. searchKeyword2 → find contentId, then validate the returned city
 *   2. detailCommon2  → overview, coords, contact
 *   3. detailIntro2   → parking, usage time, rest day (by contentTypeId)
 */

import {
  ktoFetch,
  getAuthParams,
  extractItems,
  stripHtml,
  isRemoteImageAvailable,
  normalizeKtoImageUrl,
} from "./ktoApi";
import { KTOTourInfo } from "./ktoTypes";
import { getKtoSearchTerms, isRelevantKtoResult } from "./ktoPlaceSearch";

const KOR_BASE = "https://apis.data.go.kr/B551011/KorService2";
const SEARCH_URL = `${KOR_BASE}/searchKeyword2`;
const DETAIL_COMMON_URL = `${KOR_BASE}/detailCommon2`;
const DETAIL_INTRO_URL = `${KOR_BASE}/detailIntro2`;

const cache = new Map<string, KTOTourInfo | null>();

interface SearchResult {
  contentId: string;
  contentTypeId: string;
  addr1: string;
  mapx: string;
  mapy: string;
  title: string;
  firstimage?: string;
}

interface RawSearchItem {
  contentid?: string;
  contenttypeid?: string;
  addr1?: string;
  mapx?: string;
  mapy?: string;
  title?: string;
  firstimage?: string;
}

async function findFirstAvailableImageUrl(items: RawSearchItem[]): Promise<string | undefined> {
  for (const item of items) {
    if (item.firstimage) {
      const imageUrl = normalizeKtoImageUrl(item.firstimage);
      if (await isRemoteImageAvailable(imageUrl)) {
        return imageUrl;
      }
    }
  }

  return undefined;
}

async function searchPlace(keyword: string, city: string): Promise<SearchResult | null> {
  const json = await ktoFetch(SEARCH_URL, {
    ...getAuthParams(),
    keyword,
    numOfRows: "10",
    pageNo: "1",
  });
  const items = extractItems(json) as RawSearchItem[];
  if (!items.length) return null;

  const relevantItems = items.filter((item) =>
    isRelevantKtoResult(city, keyword, item.title ?? "", item.addr1 ?? "")
  );
  const matched = relevantItems[0];
  if (!matched) return null;

  const firstimage = await findFirstAvailableImageUrl(relevantItems);

  return {
    contentId: matched.contentid ?? "",
    contentTypeId: matched.contenttypeid ?? "12",
    addr1: matched.addr1 ?? "",
    mapx: matched.mapx ?? "",
    mapy: matched.mapy ?? "",
    title: matched.title ?? "",
    firstimage,
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
    defaultYN: "Y",
    firstImageYN: "N",
    areacodeYN: "N",
    catcodeYN: "N",
    addrinfoYN: "Y",
    mapinfoYN: "Y",
    overviewYN: "Y",
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

async function fetchDetailIntro(
  contentId: string,
  contentTypeId: string
): Promise<{ parking?: string; usageTime?: string; restDate?: string }> {
  const json = await ktoFetch(DETAIL_INTRO_URL, {
    ...getAuthParams(),
    contentId,
    contentTypeId,
  });
  const items = extractItems(json);
  const item = items[0];
  if (!item) return {};

  // Field names vary by contentTypeId — try all known variants across types
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
 * Searches by name and validates the returned address against the place city.
 * Results are cached in memory for the session.
 */
export async function getTourInfo(placeName: string, city: string): Promise<KTOTourInfo> {
  const cacheKey = `${placeName}::${city}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey) ?? { source: "local" };
  }

  try {
    let found: SearchResult | null = null;
    for (const searchTerm of getKtoSearchTerms(placeName)) {
      found = await searchPlace(searchTerm, city);
      if (found?.contentId) break;
    }
    if (!found?.contentId) {
      cache.set(cacheKey, null);
      return { source: "local" };
    }

    // 2. Parallel detail fetches
    const [common, intro] = await Promise.all([
      fetchDetailCommon(found.contentId),
      fetchDetailIntro(found.contentId, found.contentTypeId),
    ]);

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
      imageUrl: found.firstimage,
      overview: common.overview,
      parking: intro.parking,
      usageTime: intro.usageTime,
      restDate: intro.restDate,
      phone: common.tel,
      homepage: common.homepage,
      source: "KTO_TOUR_INFO",
    };

    cache.set(cacheKey, result);
    return result;
  } catch {
    cache.set(cacheKey, null);
    return { source: "local" };
  }
}

export function clearTourInfoCache(): void {
  cache.clear();
}
