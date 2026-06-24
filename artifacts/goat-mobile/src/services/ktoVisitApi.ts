/**
 * KTO 관광지 집중률 방문자 추이 예측 정보
 * Provides: relative visitor concentration level for a tourism spot
 *
 * NOTE: This API returns predicted/trend data — NOT real-time crowd info.
 * UI must never call this "실시간 혼잡도".
 *
 * Endpoint assumed from KTO naming convention; graceful fallback if wrong.
 */

import { ktoFetch, getAuthParams, extractItems } from './ktoApi';
import { KTOVisitConcentration } from './ktoTypes';

const VISIT_URL =
  'https://apis.data.go.kr/B551011/VisitorConcentrationService1/getVisitorConcentration1';

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

function levelFromValue(raw: any): 'low' | 'medium' | 'high' | 'unknown' {
  if (!raw && raw !== 0) return 'unknown';
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
  if (isNaN(n)) return 'unknown';
  if (n >= 0.7 || n >= 70) return 'high';
  if (n >= 0.4 || n >= 40) return 'medium';
  return 'low';
}

/**
 * Fetch visitor concentration prediction for a place.
 * Returns 'unknown' source: 'fallback' gracefully if API is unavailable.
 */
export async function getVisitConcentration(
  placeName: string,
  contentId?: string
): Promise<KTOVisitConcentration> {
  const cacheKey = contentId ?? placeName;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  const fallback: KTOVisitConcentration = {
    concentrationLevel: 'unknown',
    source: 'fallback',
  };

  try {
    const params: Record<string, string | number> = {
      ...getAuthParams(),
      numOfRows: '10',
      pageNo: '1',
    };
    if (contentId) params['contentId'] = contentId;
    else params['keyword'] = placeName;

    const json = await ktoFetch(VISIT_URL, params);
    const items = extractItems(json);
    if (!items.length) {
      cache.set(cacheKey, fallback);
      return fallback;
    }

    const item = items[0];
    // Try various field names that the API might use
    const rawValue =
      item.concentrationIndex ??
      item.visitorRatio ??
      item.concentration ??
      item.visitConcentration ??
      item.ratio ??
      undefined;

    const level = levelFromValue(rawValue);

    const result: KTOVisitConcentration = {
      concentrationLevel: level,
      trendLabel: LEVEL_LABELS[level] || undefined,
      predictedVisitors: item.numOfVisitor
        ? parseInt(String(item.numOfVisitor), 10)
        : undefined,
      baseDate: item.baseDate ?? item.baseYmd ?? undefined,
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
