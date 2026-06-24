/**
 * KTO 기초지자체 중심 관광지 정보
 * Local municipality tourism data for Gangwon cities/counties.
 *
 * Usage: background enrichment + Data Source screen only.
 * Not rendered directly in primary user-facing UI.
 *
 * Endpoint assumed from KTO naming convention; graceful fallback if wrong.
 */

import { ktoFetch, getAuthParams, extractItems } from './ktoApi';
import { KTOLocalGovInfo } from './ktoTypes';

const LOCAL_GOV_URL =
  'https://apis.data.go.kr/B551011/LocalGovTourInfoService1/getLocalGovTourInfo1';

const cache = new Map<string, KTOLocalGovInfo | null>();

/**
 * Fetch city/county-level tourism context.
 * Returns fallback with source: 'fallback' silently if API is unavailable.
 */
export async function getLocalGovInfo(city: string, regionGroup: string): Promise<KTOLocalGovInfo> {
  const cacheKey = `${city}::${regionGroup}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey) ?? { source: 'fallback' };
  }

  try {
    const json = await ktoFetch(LOCAL_GOV_URL, {
      ...getAuthParams(),
      numOfRows: '10',
      pageNo: '1',
      keyword: city,
    });
    const items = extractItems(json);
    if (!items.length) {
      cache.set(cacheKey, null);
      return { source: 'fallback' };
    }

    const spots = items
      .map((i: any) => i.title ?? i.name)
      .filter(Boolean)
      .slice(0, 5) as string[];

    const keywords = items
      .flatMap((i: any) =>
        String(i.keyword ?? '').split(',').map((k: string) => k.trim())
      )
      .filter(Boolean)
      .slice(0, 5) as string[];

    const result: KTOLocalGovInfo = {
      regionName: regionGroup,
      city,
      relatedTourSpots: spots.length ? spots : undefined,
      regionKeywords: keywords.length ? keywords : undefined,
      source: 'KTO_LOCAL_GOV_TOUR_INFO',
    };

    cache.set(cacheKey, result);
    return result;
  } catch {
    cache.set(cacheKey, null);
    return { source: 'fallback' };
  }
}

export function clearLocalGovCache(): void {
  cache.clear();
}
