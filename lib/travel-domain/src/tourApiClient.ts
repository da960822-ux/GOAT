import { TourApiNearbyCandidate, TourCandidateCategory } from "./courseRecommendationTypes";

declare const process: { env: Record<string, string | undefined> };
declare const fetch: (input: string, init?: { signal?: unknown }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;
declare const AbortSignal: { timeout(ms: number): unknown };
declare const URL: {
  new(input: string): {
    searchParams: { set(name: string, value: string): void };
    toString(): string;
  };
};

type VisitKoreaContentType = "12" | "14" | "15" | "28" | "32" | "38" | "39";

const LOCATION_BASED_LIST_URL =
  "https://apis.data.go.kr/B551011/KorService2/locationBasedList2";
const DEFAULT_MOBILE_APP_NAME = "GOAT";
const DEFAULT_MOBILE_OS = "ETC";
const REQUEST_TIMEOUT_MS = 10_000;

function getEnv(key: string): string | undefined {
  const value = process.env[key];
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
    const url = new URL(LOCATION_BASED_LIST_URL);
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

    const response = await fetch(url.toString(), { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!response.ok) throw new Error(`VISITKOREA_OPENAPI_HTTP_${response.status}`);

    const data = await response.json() as {
      response?: { body?: { items?: { item?: unknown[] | unknown } } };
    };
    const item = data.response?.body?.items?.item;
    const items = Array.isArray(item) ? item : item ? [item] : [];

    for (const row of items) {
      if (!row || typeof row !== "object") continue;
      const record = row as Record<string, unknown>;
      const title = String(record.title ?? "").trim();
      if (!title) continue;

      results.push({
        id: String(record.contentid ?? `${contentTypeId}-${title}`),
        title,
        category: mapContentTypeToCategory(String(record.contenttypeid ?? contentTypeId), title),
        address: String(record.addr1 ?? record.addr2 ?? "").trim() || undefined,
        imageUrl: String(record.firstimage ?? record.firstimage2 ?? "").trim() || undefined,
        mapX: toNumber(record.mapx),
        mapY: toNumber(record.mapy),
        distanceMeters: toNumber(record.dist),
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

export const fetchTourApiNearbyCandidates = fetchVisitKoreaContentLabNearbyCandidates;
