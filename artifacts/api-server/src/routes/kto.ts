/**
 * KTO (Korea Tourism Organization) API Proxy
 *
 * Proxies requests to apis.data.go.kr server-side to avoid CORS restrictions
 * in the browser-based Expo web build.
 *
 * Route: GET /api/kto?path=<allowed_KTO_endpoint_path>&<KTO_params>
 *   e.g. /api/kto?path=PhotoGalleryService1/galleryList1&keyword=춘천&numOfRows=5&...
 *
 * The serviceKey is never exposed to the client — it is read from the server
 * environment and appended here.
 */

import { Router, Request, Response } from "express";
import { createRateLimiter } from "../lib/rate-limit";

const router = Router();

const KTO_BASE = "https://apis.data.go.kr/B551011";

function normalizeServiceKey(value: string): string {
  const trimmed = value.trim();
  if (!/%[0-9A-Fa-f]{2}/.test(trimmed)) return trimmed;
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

const SERVICE_KEY = normalizeServiceKey(process.env.KTO_SERVICE_KEY ?? "");
const DEFAULT_CACHE_MAX_ENTRIES = 500;
const DEFAULT_CACHE_TTL_SECONDS = 21_600;
const DEFAULT_STATIC_CACHE_TTL_SECONDS = 86_400;
const DEFAULT_VISIT_CACHE_TTL_SECONDS = 3_600;

const ALLOWED_KTO_PATHS = new Set([
  "PhotoGalleryService1/gallerySearchList1",
  "PhotoGalleryService1/galleryList1",
  "PhotoContestService1/getPhotoContestList1",
  "KorService2/searchKeyword2",
  "KorService2/detailCommon2",
  "KorService2/detailIntro2",
  "LocalGovTourInfoService1/getLocalGovTourInfo1",
  "TatsCnctrRateService/tatsCnctrRatedList",
]);
const ALLOWED_KTO_QUERY_KEYS = new Set([
  "path",
  "MobileOS",
  "MobileApp",
  "_type",
  "keyword",
  "contentId",
  "contentTypeId",
  "defaultYN",
  "firstImageYN",
  "areacodeYN",
  "catcodeYN",
  "addrinfoYN",
  "mapinfoYN",
  "overviewYN",
  "areaCd",
  "signguCd",
  "tAtsNm",
  "numOfRows",
  "pageNo",
]);

type QueryValue = string | string[];
type KtoCacheEntry = {
  data: unknown;
  expiresAt: number;
};

const ktoCache = new Map<string, KtoCacheEntry>();

const readPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const CACHE_MAX_ENTRIES = readPositiveInt(process.env.KTO_CACHE_MAX_ENTRIES, DEFAULT_CACHE_MAX_ENTRIES);
const CACHE_DEFAULT_TTL_SECONDS = readPositiveInt(
  process.env.KTO_CACHE_DEFAULT_TTL_SECONDS,
  DEFAULT_CACHE_TTL_SECONDS,
);
const CACHE_STATIC_TTL_SECONDS = readPositiveInt(
  process.env.KTO_CACHE_STATIC_TTL_SECONDS,
  DEFAULT_STATIC_CACHE_TTL_SECONDS,
);
const CACHE_VISIT_TTL_SECONDS = readPositiveInt(
  process.env.KTO_CACHE_VISIT_TTL_SECONDS,
  DEFAULT_VISIT_CACHE_TTL_SECONDS,
);
const ktoRateLimit = createRateLimiter({
  windowMs: readPositiveInt(process.env.KTO_RATE_LIMIT_WINDOW_SECONDS, 60) * 1000,
  max: readPositiveInt(process.env.KTO_RATE_LIMIT_MAX, 120),
});

const normalizeQueryValue = (value: unknown): string[] => {
  if (value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  return [String(value)];
};

const getFirstQueryValue = (value: unknown) => normalizeQueryValue(value)[0];

const normalizeKtoPath = (path: string) => path.replace(/^\/+/, "").replace(/\/+$/, "");

const isAllowedKtoPath = (ktoPath: string) => ALLOWED_KTO_PATHS.has(ktoPath);

function validateKtoQuery(query: Record<string, QueryValue | undefined>): string | null {
  for (const [key, value] of Object.entries(query)) {
    if (key === "serviceKey" || !ALLOWED_KTO_QUERY_KEYS.has(key)) {
      return `query parameter is not allowed: ${key}`;
    }

    if (Array.isArray(value) || (value !== undefined && String(value).length > 500)) {
      return `invalid query parameter: ${key}`;
    }
  }

  const numOfRows = getFirstQueryValue(query.numOfRows);
  if (numOfRows !== undefined && (!/^\d+$/.test(numOfRows) || Number(numOfRows) < 1 || Number(numOfRows) > 50)) {
    return "numOfRows must be an integer from 1 to 50";
  }

  const pageNo = getFirstQueryValue(query.pageNo);
  if (pageNo !== undefined && (!/^\d+$/.test(pageNo) || Number(pageNo) < 1 || Number(pageNo) > 100)) {
    return "pageNo must be an integer from 1 to 100";
  }

  return null;
}

const getCacheTtlSeconds = (ktoPath: string) => {
  if (ktoPath.includes("TatsCnctrRateService")) {
    return CACHE_VISIT_TTL_SECONDS;
  }

  if (
    ktoPath.includes("PhotoGalleryService1") ||
    ktoPath.includes("KorService2") ||
    ktoPath.toLowerCase().includes("photo") ||
    ktoPath.toLowerCase().includes("gallery")
  ) {
    return CACHE_STATIC_TTL_SECONDS;
  }

  return CACHE_DEFAULT_TTL_SECONDS;
};

const buildCacheKey = (ktoPath: string, query: Record<string, unknown>) => {
  const entries = Object.entries(query)
    .filter(([key]) => key !== "path" && key !== "serviceKey")
    .flatMap(([key, value]) =>
      normalizeQueryValue(value)
        .sort()
        .map((item) => [key, item] as const),
    )
    .sort(([keyA, valueA], [keyB, valueB]) => keyA.localeCompare(keyB) || valueA.localeCompare(valueB));

  const paramStr = entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");

  return paramStr ? `${ktoPath}?${paramStr}` : ktoPath;
};

const appendQueryParams = (params: URLSearchParams, query: Record<string, unknown>) => {
  for (const [key, value] of Object.entries(query)) {
    if (key === "path" || key === "serviceKey") {
      continue;
    }

    for (const item of normalizeQueryValue(value)) {
      params.append(key, item);
    }
  }
};

const getKtoResultCode = (data: unknown): string | undefined => {
  if (!data || typeof data !== "object") {
    return undefined;
  }

  const root = data as {
    header?: { resultCode?: unknown };
    response?: { header?: { resultCode?: unknown } };
  };
  const resultCode = root.response?.header?.resultCode ?? root.header?.resultCode;

  return resultCode === undefined ? undefined : String(resultCode);
};

const shouldCache = (data: unknown) => {
  const resultCode = getKtoResultCode(data);
  return resultCode === undefined || resultCode === "0000";
};

const trimCache = () => {
  while (ktoCache.size > CACHE_MAX_ENTRIES) {
    const oldestKey = ktoCache.keys().next().value;
    if (!oldestKey) {
      return;
    }
    ktoCache.delete(oldestKey);
  }
};

router.get("/kto", ktoRateLimit, async (req: Request, res: Response) => {
  try {
    const rawQuery = req.query as Record<string, QueryValue | undefined>;
    const queryError = validateKtoQuery(rawQuery);
    if (queryError) {
      res.setHeader("X-KTO-Cache", "MISS");
      res.setHeader("X-KTO-Cache-TTL-Seconds", "0");
      res.status(400).json({ error: queryError });
      return;
    }
    const ktoPath = normalizeKtoPath(getFirstQueryValue(rawQuery.path) ?? "");

    if (!ktoPath) {
      res.setHeader("X-KTO-Cache", "MISS");
      res.setHeader("X-KTO-Cache-TTL-Seconds", "0");
      res.status(400).json({ error: "path query param is required" });
      return;
    }

    if (!isAllowedKtoPath(ktoPath)) {
      res.setHeader("X-KTO-Cache", "MISS");
      res.setHeader("X-KTO-Cache-TTL-Seconds", "0");
      res.status(403).json({ error: "KTO path is not allowed" });
      return;
    }

    if (!SERVICE_KEY) {
      res.setHeader("X-KTO-Cache", "MISS");
      res.setHeader("X-KTO-Cache-TTL-Seconds", "0");
      res.status(500).json({ error: "KTO service key not configured on server" });
      return;
    }

    const cacheKey = buildCacheKey(ktoPath, rawQuery);
    const ttlSeconds = getCacheTtlSeconds(ktoPath);
    const cached = ktoCache.get(cacheKey);
    const now = Date.now();

    if (cached) {
      if (cached.expiresAt > now) {
        res.setHeader("X-KTO-Cache", "HIT");
        res.setHeader("X-KTO-Cache-TTL-Seconds", Math.ceil((cached.expiresAt - now) / 1000).toString());
        res.json(cached.data);
        return;
      }

      ktoCache.delete(cacheKey);
    }

    res.setHeader("X-KTO-Cache", "MISS");
    res.setHeader("X-KTO-Cache-TTL-Seconds", ttlSeconds.toString());

    const params = new URLSearchParams({ serviceKey: SERVICE_KEY });
    appendQueryParams(params, rawQuery);

    const url = `${KTO_BASE}/${ktoPath}?${params.toString()}`;

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      res.status(response.status).json({ error: `KTO returned ${response.status}` });
      return;
    }

    const data = await response.json();

    if (shouldCache(data)) {
      ktoCache.set(cacheKey, {
        data,
        expiresAt: now + ttlSeconds * 1000,
      });
      trimCache();
    }

    res.json(data);
  } catch (error) {
    res.setHeader("X-KTO-Cache", "MISS");
    res.setHeader("X-KTO-Cache-TTL-Seconds", "0");
    const isTimeout = error instanceof Error
      && (error.name === "TimeoutError" || error.name === "AbortError");
    res.status(isTimeout ? 504 : 502).json({
      error: isTimeout ? "KTO request timed out" : "KTO request failed",
    });
  }
});

export default router;
