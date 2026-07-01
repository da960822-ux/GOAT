/**
 * KTO 관광지 집중률 방문자 추이 예측 정보
 * Provides: relative visitor concentration level for a tourism spot
 *
 * NOTE: This API returns predicted/trend data — NOT real-time crowd info.
 * UI must never call this "실시간 혼잡도".
 *
 * Official endpoint: TatsCnctrRateService/tatsCnctrRatedList
 */

import { ktoFetch, getAuthParams, extractItems } from './ktoApi';
import { KTOVisitConcentration } from './ktoTypes';

const VISIT_URL =
  'https://apis.data.go.kr/B551011/TatsCnctrRateService/tatsCnctrRatedList';

const GANGWON_AREA_CODE = '51';

// Source: 한국관광공사_OpenAPI_관광지_시군구_코드정보_v1.0.xlsx
const GANGWON_SIGUNGU_CODES: Record<string, string> = {
  '춘천시': '51110',
  '원주시': '51130',
  '강릉시': '51150',
  '동해시': '51170',
  '태백시': '51190',
  '속초시': '51210',
  '삼척시': '51230',
  '홍천군': '51720',
  '횡성군': '51730',
  '영월군': '51750',
  '평창군': '51760',
  '정선군': '51770',
  '철원군': '51780',
  '화천군': '51790',
  '양구군': '51800',
  '인제군': '51810',
  '고성군': '51820',
  '양양군': '51830',
};

const LEVEL_LABELS: Record<string, string> = {
  low: '방문 여유',
  medium: '보통',
  high: '방문 집중 예상',
  unknown: '',
};

const VISIT_NOTES: Record<string, string> = {
  low: '상대적으로 여유롭게 방문하기 좋은 후보예요.',
  medium: '보통 수준의 방문이 예상돼요. 여유 시간대를 노려보세요.',
  high: '방문 집중 가능성이 있어 여유 시간대 방문을 추천해요.',
  unknown: '',
};

export const VISIT_NOTE = VISIT_NOTES;

const cache = new Map<string, KTOVisitConcentration>();

function levelFromValue(raw: unknown): 'low' | 'medium' | 'high' | 'unknown' {
  if (!raw && raw !== 0) return 'unknown';
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
  if (isNaN(n)) return 'unknown';
  const percentage = n <= 1 ? n * 100 : n;
  if (percentage >= 70) return 'high';
  if (percentage >= 40) return 'medium';
  return 'low';
}

/**
 * Fetch visitor concentration prediction for a place.
 * Returns 'unknown' source: 'fallback' gracefully if API is unavailable.
 */
export async function getVisitConcentration(
  placeName: string,
  city: string
): Promise<KTOVisitConcentration> {
  const cacheKey = `${city}::${placeName}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  const fallback: KTOVisitConcentration = {
    concentrationLevel: 'unknown',
    source: 'fallback',
  };

  try {
    const signguCd = GANGWON_SIGUNGU_CODES[city];
    if (!placeName || !signguCd) {
      cache.set(cacheKey, fallback);
      return fallback;
    }

    const params: Record<string, string | number> = {
      ...getAuthParams(),
      numOfRows: '30',
      pageNo: '1',
      areaCd: GANGWON_AREA_CODE,
      signguCd,
      tAtsNm: placeName,
    };

    const json = await ktoFetch(VISIT_URL, params);
    const items = extractItems(json);
    if (!items.length) {
      cache.set(cacheKey, fallback);
      return fallback;
    }

    const item = items[0];
    const rawValue = item.cnctrRate;

    const level = levelFromValue(rawValue);
    const concentrationRate = Number.parseFloat(String(rawValue));

    const result: KTOVisitConcentration = {
      concentrationLevel: level,
      trendLabel: LEVEL_LABELS[level] || undefined,
      concentrationRate: Number.isFinite(concentrationRate) ? concentrationRate : undefined,
      baseDate: item.baseYmd ?? undefined,
      source: 'KTO_VISIT_CONCENTRATION',
    };

    cache.set(cacheKey, result);
    return result;
  } catch {
    cache.set(cacheKey, fallback);
    return fallback;
  }
}

export function clearVisitCache(): void {
  cache.clear();
}
