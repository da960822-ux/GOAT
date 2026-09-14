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
import { logger } from "../lib/logger";
import { randomUUID } from "node:crypto";

const router = Router();

const KTO_BASE = "https://apis.data.go.kr/B551011";
const SERVICE_KEY = (process.env.KTO_SERVICE_KEY ?? "").trim();
const DEFAULT_CACHE_MAX_ENTRIES = 500;
const DEFAULT_CACHE_TTL_SECONDS = 21_600;
const DEFAULT_STATIC_CACHE_TTL_SECONDS = 86_400;
const DEFAULT_VISIT_CACHE_TTL_SECONDS = 3_600;
const DEFAULT_MAX_STALE_SECONDS = 7 * 24 * 60 * 60;

const ALLOWED_KTO_PATHS = new Set([
  "PhotoGalleryService1/gallerySearchList1",
  "PhotoGalleryService1/galleryList1",
  "PhotoContestService1/getPhotoContestList1",
  "KorService2/searchKeyword2",
  "KorService2/detailCommon2",
  "KorService2/detailImage2",
  "KorService2/detailIntro2",
  "LocalGovTourInfoService1/getLocalGovTourInfo1",
  "TatsCnctrRateService/tatsCnctrRatedList",
]);

type QueryValue = string | string[];
type KtoCacheEntry = {
  data: unknown;
  expiresAt: number;
  storedAt: number;
};

const ktoCache = new Map<string, KtoCacheEntry>();

const readPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const CACHE_MAX_ENTRIES = readPositiveInt(
  process.env.KTO_CACHE_MAX_ENTRIES,
  DEFAULT_CACHE_MAX_ENTRIES,
);
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
const CACHE_MAX_STALE_SECONDS = readPositiveInt(
  process.env.KTO_CACHE_MAX_STALE_SECONDS,
  DEFAULT_MAX_STALE_SECONDS,
);

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

const normalizeKtoPath = (path: string) =>
  path.replace(/^\/+/, "").replace(/\/+$/, "");

const isAllowedKtoPath = (ktoPath: string) => ALLOWED_KTO_PATHS.has(ktoPath);

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
    .sort(
      ([keyA, valueA], [keyB, valueB]) =>
        keyA.localeCompare(keyB) || valueA.localeCompare(valueB),
    );

  const paramStr = entries
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join("&");

  return paramStr ? `${ktoPath}?${paramStr}` : ktoPath;
};

const appendQueryParams = (
  params: URLSearchParams,
  query: Record<string, unknown>,
) => {
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
  const resultCode =
    root.response?.header?.resultCode ?? root.header?.resultCode;

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

async function fetchKtoWithRetry(url: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      });
      if (response.status < 500 || attempt === 1) return response;
      await response.body?.cancel().catch(() => undefined);
    } catch (error) {
      lastError = error;
      if (attempt === 1) throw error;
    }
  }
  throw lastError ?? new Error("KTO_FETCH_FAILED");
}

router.get("/kto", async (req: Request, res: Response) => {
  const startedAt = Date.now();
  const requestId = req.header("x-request-id") ?? randomUUID();
  let cacheKey: string | undefined;
  let ktoPath: string | undefined;
  res.setHeader("Cache-Control", "no-store");
  try {
    const rawQuery = req.query as Record<string, QueryValue | undefined>;
    ktoPath = normalizeKtoPath(getFirstQueryValue(rawQuery.path) ?? "");

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
      res
        .status(500)
        .json({ error: "KTO service key not configured on server" });
      return;
    }

    cacheKey = buildCacheKey(ktoPath, rawQuery);
    const ttlSeconds = getCacheTtlSeconds(ktoPath);
    // Cache is stale fallback only: always try KTO first.
    const cached = ktoCache.get(cacheKey);
    const now = Date.now();

    res.setHeader("X-KTO-Cache", "MISS");
    res.setHeader("X-KTO-Cache-TTL-Seconds", ttlSeconds.toString());

    const params = new URLSearchParams({ serviceKey: SERVICE_KEY });
    appendQueryParams(params, rawQuery);

    const url = `${KTO_BASE}/${ktoPath}?${params.toString()}`;

    const response = await fetchKtoWithRetry(url);

    if (!response.ok) {
      if (cached && now - cached.storedAt <= CACHE_MAX_STALE_SECONDS * 1000) {
        res.setHeader("X-KTO-Cache", "STALE_FALLBACK");
        res.setHeader("X-KTO-Cache-TTL-Seconds", "0");
        res.setHeader("X-KTO-Live-Attempted", "true");
        res.setHeader("X-KTO-Request-Id", requestId);
        logger.warn({ requestId, endpoint: ktoPath, statusCode: response.status, cache: "STALE_FALLBACK", durationMs: Date.now() - startedAt }, "kto request failed; stale cache used");
        res.json(cached.data);
        return;
      }
      logger.warn({ requestId, endpoint: ktoPath, statusCode: response.status, cache: "MISS", durationMs: Date.now() - startedAt }, "kto request failed");
      res
        .status(response.status)
        .json({ error: `KTO returned ${response.status}` });
      return;
    }

    const data = await response.json();

    logger.info({
      requestId,
      endpoint: ktoPath,
      statusCode: response.status,
      resultCode: getKtoResultCode(data),
      cache: "MISS",
      durationMs: Date.now() - startedAt,
      responseItemCount: Array.isArray((data as any)?.response?.body?.items?.item)
        ? (data as any).response.body.items.item.length
        : ((data as any)?.response?.body?.items?.item ? 1 : 0),
    }, "kto request");

    if (shouldCache(data)) {
      ktoCache.set(cacheKey, {
        data,
        expiresAt: now + ttlSeconds * 1000,
        storedAt: now,
      });
      trimCache();
    }

    res.json(data);
  } catch (error) {
    const cached = typeof cacheKey !== "undefined" ? ktoCache.get(cacheKey) : undefined;
    const now = Date.now();
    if (cached && now - cached.storedAt <= CACHE_MAX_STALE_SECONDS * 1000) {
      res.setHeader("X-KTO-Cache", "STALE_FALLBACK");
      res.setHeader("X-KTO-Cache-TTL-Seconds", "0");
      res.setHeader("X-KTO-Live-Attempted", "true");
      res.setHeader("X-KTO-Request-Id", requestId);
      logger.warn({ requestId, endpoint: typeof ktoPath === "string" ? ktoPath : undefined, cache: "STALE_FALLBACK", durationMs: Date.now() - startedAt, error: error instanceof Error ? error.message : "KTO_UNKNOWN" }, "kto request failed; stale cache used");
      res.json(cached.data);
      return;
    }

    res.setHeader("X-KTO-Request-Id", requestId);
    res.setHeader("X-KTO-Live-Attempted", "true");
    res.setHeader("X-KTO-Cache", "MISS");
    res.setHeader("X-KTO-Cache-TTL-Seconds", "0");
    res.status(500).json({ error: "proxy fetch failed" });
  }
});

export default router;
