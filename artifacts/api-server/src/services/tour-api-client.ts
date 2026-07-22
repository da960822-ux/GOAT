import type {
  TourApiNearbyCandidate,
  TourCandidateCategory,
} from "@workspace/travel-domain";

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

export interface VisitKoreaNearbyDiagnostics {
  httpStatuses: number[];
  latencyMs: number;
  requestCount: number;
  successfulRequestCount: number;
  failedRequestCount: number;
  rawCandidateCount: number;
  filteredCandidateCount: number;
  coordinateCandidateCount: number;
}

const LOCATION_BASED_LIST_URL =
  "https://apis.data.go.kr/B551011/KorService2/locationBasedList2";
const DEFAULT_MOBILE_APP_NAME = "GOAT";
const DEFAULT_MOBILE_OS = "ETC";
const REQUEST_TIMEOUT_MS = 10_000;
const MIN_RADIUS_METERS = 100;
const MAX_RADIUS_METERS = 20_000;
const MAX_RESULTS_PER_REQUEST = 50;

function getEnv(key: string): string | undefined {
  const value = process.env[key];
  return value && value.trim() ? value.trim() : undefined;
}

function getVisitKoreaServiceKey(): string | undefined {
  const value = (
    getEnv("VISITKOREA_SERVICE_KEY") ??
    getEnv("VISITKOREA_CONTENT_LAB_SERVICE_KEY") ??
    getEnv("KTO_SERVICE_KEY") ??
    getEnv("TOUR_API_SERVICE_KEY") ??
    getEnv("TOURAPI_SERVICE_KEY")
  );
  if (!value) return undefined;

  // data.go.kr commonly provides both decoded and percent-encoded variants.
  // URLSearchParams performs encoding itself, so decode an encoded key once to
  // avoid sending `%25` in place of `%`.
  if (!/%[0-9A-Fa-f]{2}/.test(value)) return value;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
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
  if (title.includes("카페") || title.includes("커피")) return "CAFE";
  if (contenttypeid === "39") return "RESTAURANT";
  if (contenttypeid === "38" || title.includes("시장")) return "MARKET";
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
  onDiagnostics?: (diagnostics: VisitKoreaNearbyDiagnostics) => void;
}): Promise<TourApiNearbyCandidate[]> {
  const serviceKey = getVisitKoreaServiceKey();
  if (!serviceKey) throw new Error("VISITKOREA_SERVICE_KEY_MISSING");
  if (!Number.isFinite(params.mapX) || params.mapX < -180 || params.mapX > 180) {
    throw new Error("VISITKOREA_INVALID_LONGITUDE");
  }
  if (!Number.isFinite(params.mapY) || params.mapY < -90 || params.mapY > 90) {
    throw new Error("VISITKOREA_INVALID_LATITUDE");
  }

  const contentTypeIds = Array.from(new Set(params.contentTypeIds ?? ["12", "14", "28", "38", "39"]));
  const radiusMeters = Math.min(
    Math.max(Math.round(params.radiusMeters ?? 3000), MIN_RADIUS_METERS),
    MAX_RADIUS_METERS,
  );
  const maxResults = Math.min(
    Math.max(Math.round(params.maxResults ?? 20), 1),
    MAX_RESULTS_PER_REQUEST,
  );
  const startedAt = Date.now();
  const httpStatuses: number[] = [];

  const requests = contentTypeIds.map(async (contentTypeId) => {
    const url = new URL(LOCATION_BASED_LIST_URL);
    url.searchParams.set("serviceKey", serviceKey);
    url.searchParams.set("MobileOS", getEnv("VISITKOREA_MOBILE_OS") ?? DEFAULT_MOBILE_OS);
    url.searchParams.set("MobileApp", getEnv("VISITKOREA_MOBILE_APP") ?? DEFAULT_MOBILE_APP_NAME);
    url.searchParams.set("_type", "json");
    url.searchParams.set("arrange", "E");
    url.searchParams.set("mapX", String(params.mapX));
    url.searchParams.set("mapY", String(params.mapY));
    url.searchParams.set("radius", String(radiusMeters));
    url.searchParams.set("contentTypeId", contentTypeId);
    url.searchParams.set("numOfRows", String(maxResults));
    url.searchParams.set("pageNo", "1");

    const response = await fetch(url.toString(), { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    httpStatuses.push(response.status);
    if (!response.ok) throw new Error(`VISITKOREA_OPENAPI_HTTP_${response.status}`);

    const data = await response.json() as {
      response?: {
        header?: { resultCode?: unknown };
        body?: { items?: { item?: unknown[] | unknown } };
      };
    };
    const resultCode = data.response?.header?.resultCode;
    if (resultCode !== undefined && String(resultCode) !== "0000") {
      throw new Error(`VISITKOREA_OPENAPI_RESULT_${String(resultCode).slice(0, 20)}`);
    }
    const item = data.response?.body?.items?.item;
    const items = Array.isArray(item) ? item : item ? [item] : [];

    const candidates: TourApiNearbyCandidate[] = [];
    for (const row of items) {
      if (!row || typeof row !== "object") continue;
      const record = row as Record<string, unknown>;
      const title = String(record.title ?? "").trim();
      if (!title) continue;

      candidates.push({
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
    return candidates;
  });

  const settled = await Promise.allSettled(requests);
  const successful = settled.filter(
    (result): result is PromiseFulfilledResult<TourApiNearbyCandidate[]> => result.status === "fulfilled",
  );
  const baseDiagnostics = {
    httpStatuses: [...httpStatuses].sort((a, b) => a - b),
    latencyMs: Date.now() - startedAt,
    requestCount: requests.length,
    successfulRequestCount: successful.length,
    failedRequestCount: settled.length - successful.length,
  };
  if (successful.length === 0) {
    params.onDiagnostics?.({
      ...baseDiagnostics,
      rawCandidateCount: 0,
      filteredCandidateCount: 0,
      coordinateCandidateCount: 0,
    });
    const statusCodes = settled
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) => result.reason instanceof Error ? result.reason.message : "UNKNOWN")
      .filter((message) => /^VISITKOREA_OPENAPI_HTTP_\d+$/.test(message));
    throw new Error(statusCodes[0] ?? "VISITKOREA_OPENAPI_ALL_REQUESTS_FAILED");
  }

  const results = successful.flatMap((result) => result.value);

  const seen = new Set<string>();
  const filtered = results
    .filter((candidate) => {
      const key = candidate.id || candidate.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .filter((candidate) => candidate.distanceMeters === undefined || candidate.distanceMeters <= radiusMeters)
    .sort((a, b) => (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) - (b.distanceMeters ?? Number.MAX_SAFE_INTEGER))
    .slice(0, maxResults);
  params.onDiagnostics?.({
    ...baseDiagnostics,
    rawCandidateCount: results.length,
    filteredCandidateCount: filtered.length,
    coordinateCandidateCount: filtered.filter(
      (candidate) => Number.isFinite(candidate.mapX) && Number.isFinite(candidate.mapY),
    ).length,
  });
  return filtered;
}

export const fetchTourApiNearbyCandidates = fetchVisitKoreaContentLabNearbyCandidates;
