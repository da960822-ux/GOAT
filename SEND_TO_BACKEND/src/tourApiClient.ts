import { TourApiNearbyCandidate, TourCandidateCategory } from "./courseRecommendationTypes";

declare const process: { env?: Record<string, string | undefined> } | undefined;

/**
 * 한국관광콘텐츠랩 OpenAPI(TourAPI) 국문 관광정보 서비스_GW content type id.
 * 문서/활용신청 기준: https://api.visitkorea.or.kr
 * 실제 REST 호출은 TourAPI가 제공하는 공공데이터 게이트웨이 endpoint를 사용한다.
 */
type VisitKoreaContentType = "12" | "14" | "15" | "28" | "32" | "38" | "39";

const VISITKOREA_CONTENT_LAB_KOR_SERVICE_BASE_URL = "https://apis.data.go.kr/B551011/KorService2/locationBasedList2";
const DEFAULT_MOBILE_APP_NAME = "GOAT";
const DEFAULT_MOBILE_OS = "ETC";

function getEnv(key: string): string | undefined {
  const value = typeof process !== "undefined" ? process?.env?.[key] : undefined;
  return value && value.trim() ? value.trim() : undefined;
}

function getVisitKoreaServiceKey(): string | undefined {
  return (
    getEnv("VISITKOREA_SERVICE_KEY") ??
    getEnv("VISITKOREA_CONTENT_LAB_SERVICE_KEY") ??
    getEnv("KTO_SERVICE_KEY") ??
    getEnv("TOUR_API_SERVICE_KEY") ??
    getEnv("TOURAPI_SERVICE_KEY")
  );
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function mapContentTypeToCategory(contenttypeid: string | undefined, title: string): TourCandidateCategory {
  if (contenttypeid === "39") return "RESTAURANT";
  if (contenttypeid === "38" || title.includes("시장")) return "MARKET";
  if (title.includes("카페") || title.includes("커피")) return "CAFE";
  if (title.includes("산책") || title.includes("길") || title.includes("거리")) return "WALK";
  if (title.includes("전망") || title.includes("포토")) return "PHOTO";
  return "TOUR";
}

export async function fetchVisitKoreaContentLabNearbyCandidates(params: {
  mapX: number;
  mapY: number;
  radiusMeters?: number;
  contentTypeIds?: VisitKoreaContentType[];
  maxResults?: number;
}): Promise<TourApiNearbyCandidate[]> {
  const serviceKey = getVisitKoreaServiceKey();
  if (!serviceKey) throw new Error("VISITKOREA_SERVICE_KEY_MISSING");

  const contentTypeIds = params.contentTypeIds ?? ["12", "14", "38", "39"];
  const results: TourApiNearbyCandidate[] = [];

  for (const contentTypeId of contentTypeIds) {
    const url = new URL(VISITKOREA_CONTENT_LAB_KOR_SERVICE_BASE_URL);
    url.searchParams.set("serviceKey", serviceKey);
    url.searchParams.set("MobileOS", getEnv("VISITKOREA_MOBILE_OS") ?? DEFAULT_MOBILE_OS);
    url.searchParams.set("MobileApp", getEnv("VISITKOREA_MOBILE_APP") ?? DEFAULT_MOBILE_APP_NAME);
    url.searchParams.set("_type", "json");
    url.searchParams.set("arrange", "E");
    url.searchParams.set("mapX", String(params.mapX));
    url.searchParams.set("mapY", String(params.mapY));
    url.searchParams.set("radius", String(params.radiusMeters ?? 3000));
    url.searchParams.set("contentTypeId", contentTypeId);
    url.searchParams.set("numOfRows", String(params.maxResults ?? 10));
    url.searchParams.set("pageNo", "1");

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`VISITKOREA_OPENAPI_HTTP_${response.status}`);
    const data = await response.json() as any;
    const item = data?.response?.body?.items?.item;
    const items = Array.isArray(item) ? item : item ? [item] : [];
    for (const row of items) {
      const title = String(row.title ?? "").trim();
      if (!title) continue;
      results.push({
        id: String(row.contentid ?? `${contentTypeId}-${title}`),
        title,
        category: mapContentTypeToCategory(String(row.contenttypeid ?? contentTypeId), title),
        address: String(row.addr1 ?? row.addr2 ?? "").trim() || undefined,
        imageUrl: String(row.firstimage ?? row.firstimage2 ?? "").trim() || undefined,
        mapX: toNumber(row.mapx),
        mapY: toNumber(row.mapy),
        distanceMeters: toNumber(row.dist),
        source: "VISITKOREA_CONTENT_LAB",
        raw: row,
      });
    }
  }

  const seen = new Set<string>();
  return results
    .filter((candidate) => {
      const key = candidate.id || candidate.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) - (b.distanceMeters ?? Number.MAX_SAFE_INTEGER))
    .slice(0, params.maxResults ?? 20);
}

/** Backward compatible alias. 기존 코드에서 TourAPI 이름을 import해도 한국관광콘텐츠랩 OpenAPI 호출로 동작한다. */
export const fetchTourApiNearbyCandidates = fetchVisitKoreaContentLabNearbyCandidates;
