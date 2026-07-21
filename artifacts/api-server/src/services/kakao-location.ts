export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeocodedOrigin extends Coordinates {
  label: string;
  address: string;
  source: "ADDRESS" | "KEYWORD";
}

export interface RouteMetric {
  distanceKm: number;
  durationMin: number;
  source: "KAKAO_ROUTE";
}

const KAKAO_LOCAL_BASE = "https://dapi.kakao.com/v2/local/search";
const KAKAO_DIRECTIONS_URL = "https://apis-navi.kakaomobility.com/v1/directions";
const DEFAULT_TIMEOUT_MS = 4_500;
const ROUTE_CACHE_TTL_MS = 10 * 60 * 1000;
const ROUTE_CACHE_MAX = 500;

type CacheEntry = { expiresAt: number; value: RouteMetric };
const routeCache = new Map<string, CacheEntry>();

function getLocalRestApiKey(): string | undefined {
  return process.env.KAKAO_REST_API_KEY?.trim() || undefined;
}

function getMobilityRestApiKey(): string | undefined {
  return process.env.KAKAO_MOBILITY_REST_API_KEY?.trim()
    || getLocalRestApiKey();
}

export function isKakaoGeocodingConfigured(): boolean {
  return Boolean(getLocalRestApiKey());
}

export function isKakaoRoutingConfigured(): boolean {
  return Boolean(getMobilityRestApiKey());
}

function isValidCoordinate(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

function assertCoordinates(point: Coordinates): void {
  if (!isValidCoordinate(point.latitude, -90, 90) || !isValidCoordinate(point.longitude, -180, 180)) {
    throw new Error("INVALID_COORDINATES");
  }
}

async function fetchJson<T>(url: string, key: string | undefined, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  if (!key) throw new Error("KAKAO_API_KEY_MISSING");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { Authorization: `KakaoAK ${key}` },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`KAKAO_API_HTTP_${response.status}`);
    }
    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}

interface KakaoAddressDocument {
  address_name?: string;
  road_address?: { address_name?: string } | null;
  address?: { address_name?: string } | null;
  x?: string;
  y?: string;
  place_name?: string;
}

interface KakaoSearchResponse {
  documents?: KakaoAddressDocument[];
}

function toGeocodedOrigin(document: KakaoAddressDocument, source: "ADDRESS" | "KEYWORD"): GeocodedOrigin | null {
  const longitude = Number(document.x);
  const latitude = Number(document.y);
  if (!isValidCoordinate(latitude, -90, 90) || !isValidCoordinate(longitude, -180, 180)) return null;

  const address = document.road_address?.address_name
    || document.address?.address_name
    || document.address_name
    || document.place_name
    || "선택한 출발지";
  const label = document.place_name || address;
  return { latitude, longitude, label, address, source };
}

/**
 * 사용자가 입력한 도로명·지번 주소를 먼저 검색하고, 결과가 없으면 장소/지역 키워드 검색으로 보완한다.
 * API 키는 서버에서만 사용하며 모바일 앱에는 노출하지 않는다.
 */
export async function geocodeOriginQuery(query: string): Promise<GeocodedOrigin | null> {
  const normalized = query.trim();
  if (normalized.length < 2) return null;

  const addressUrl = `${KAKAO_LOCAL_BASE}/address.json?query=${encodeURIComponent(normalized)}&size=1`;
  const addressResult = await fetchJson<KakaoSearchResponse>(addressUrl, getLocalRestApiKey());
  const addressMatch = addressResult.documents?.[0]
    ? toGeocodedOrigin(addressResult.documents[0], "ADDRESS")
    : null;
  if (addressMatch) return addressMatch;

  const keywordUrl = `${KAKAO_LOCAL_BASE}/keyword.json?query=${encodeURIComponent(normalized)}&size=1`;
  const keywordResult = await fetchJson<KakaoSearchResponse>(keywordUrl, getLocalRestApiKey());
  return keywordResult.documents?.[0]
    ? toGeocodedOrigin(keywordResult.documents[0], "KEYWORD")
    : null;
}

function rounded(value: number): string {
  return value.toFixed(5);
}

function routeCacheKey(origin: Coordinates, destination: Coordinates): string {
  return `${rounded(origin.latitude)},${rounded(origin.longitude)}>${rounded(destination.latitude)},${rounded(destination.longitude)}`;
}

function readRouteCache(key: string): RouteMetric | undefined {
  const cached = routeCache.get(key);
  if (!cached) return undefined;
  if (cached.expiresAt <= Date.now()) {
    routeCache.delete(key);
    return undefined;
  }
  routeCache.delete(key);
  routeCache.set(key, cached);
  return cached.value;
}

function writeRouteCache(key: string, value: RouteMetric): void {
  routeCache.set(key, { expiresAt: Date.now() + ROUTE_CACHE_TTL_MS, value });
  while (routeCache.size > ROUTE_CACHE_MAX) {
    const oldest = routeCache.keys().next().value as string | undefined;
    if (!oldest) break;
    routeCache.delete(oldest);
  }
}

interface KakaoDirectionsResponse {
  routes?: Array<{
    result_code?: number;
    summary?: {
      distance?: number;
      duration?: number;
    };
  }>;
}

/** 카카오 자동차 길찾기의 실제 도로거리와 예상 소요시간을 반환한다. */
export async function getKakaoCarRoute(
  origin: Coordinates,
  destination: Coordinates,
): Promise<RouteMetric | null> {
  assertCoordinates(origin);
  assertCoordinates(destination);

  const key = routeCacheKey(origin, destination);
  const cached = readRouteCache(key);
  if (cached) return cached;

  const url = new URL(KAKAO_DIRECTIONS_URL);
  url.searchParams.set("origin", `${origin.longitude},${origin.latitude}`);
  url.searchParams.set("destination", `${destination.longitude},${destination.latitude}`);
  url.searchParams.set("priority", "RECOMMEND");
  url.searchParams.set("summary", "true");

  const result = await fetchJson<KakaoDirectionsResponse>(url.toString(), getMobilityRestApiKey());
  const route = result.routes?.find((item) => item.result_code === 0 && item.summary);
  const distanceMeters = route?.summary?.distance;
  const durationSeconds = route?.summary?.duration;
  if (!Number.isFinite(distanceMeters) || !Number.isFinite(durationSeconds)) return null;

  const value: RouteMetric = {
    distanceKm: Number((Number(distanceMeters) / 1000).toFixed(1)),
    durationMin: Math.max(1, Math.round(Number(durationSeconds) / 60)),
    source: "KAKAO_ROUTE",
  };
  writeRouteCache(key, value);
  return value;
}
