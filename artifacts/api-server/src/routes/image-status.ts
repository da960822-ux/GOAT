import { Router, type Request, type Response } from "express";

const router = Router();

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
const MAX_REDIRECTS = 3;
const imageStatusCache = new Map<string, { data: ImageStatusResponse; expiresAt: number }>();

type ImageStatusResponse = {
  ok: boolean;
  status?: number;
  url: string;
  finalUrl?: string;
  contentType?: string | null;
  error?: string;
};

function isAllowedImageUrl(url: URL): boolean {
  return (
    (url.protocol === "http:" || url.protocol === "https:") &&
    (url.hostname === "tong.visitkorea.or.kr" || url.hostname.endsWith(".visitkorea.or.kr"))
  );
}

function buildRejectedResponse(rawUrl: string, error: string, finalUrl?: string): ImageStatusResponse {
  return { ok: false, url: rawUrl, finalUrl, error };
}

function trimCache() {
  while (imageStatusCache.size > CACHE_MAX_ENTRIES) {
    const oldestKey = imageStatusCache.keys().next().value;
    if (!oldestKey) return;
    imageStatusCache.delete(oldestKey);
  }
}

async function checkImageUrl(rawUrl: string): Promise<ImageStatusResponse> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return { ok: false, url: rawUrl, error: "invalid url" };
  }

  if (!isAllowedImageUrl(parsedUrl)) {
    return buildRejectedResponse(rawUrl, "unsupported image host");
  }

  try {
    let currentUrl = parsedUrl;
    let response: globalThis.Response | null = null;

    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      response = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(6_000),
      });

      if (response.status < 300 || response.status >= 400) {
        break;
      }

      const location = response.headers.get("location");
      await response.body?.cancel().catch(() => undefined);
      if (!location) {
        return buildRejectedResponse(rawUrl, "redirect missing location", currentUrl.toString());
      }

      currentUrl = new URL(location, currentUrl);
      if (!isAllowedImageUrl(currentUrl)) {
        return buildRejectedResponse(rawUrl, "redirect target not allowed", currentUrl.toString());
      }
    }

    if (!response) {
      return buildRejectedResponse(rawUrl, "image request failed");
    }

    const contentType = response.headers.get("content-type");
    await response.body?.cancel().catch(() => undefined);

    return {
      ok: response.ok && Boolean(contentType?.toLowerCase().startsWith("image/")),
      status: response.status,
      url: rawUrl,
      finalUrl: currentUrl.toString(),
      contentType,
    };
  } catch {
    return buildRejectedResponse(rawUrl, "image request failed");
  }
}

router.get("/image-status", async (req: Request, res: Response) => {
  const rawUrl = typeof req.query.url === "string" ? req.query.url : "";
  if (!rawUrl) {
    res.status(400).json({ ok: false, error: "url query param is required" });
    return;
  }

  const cached = imageStatusCache.get(rawUrl);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    res.setHeader("X-Image-Status-Cache", "HIT");
    res.json(cached.data);
    return;
  }

  const data = await checkImageUrl(rawUrl);
  imageStatusCache.set(rawUrl, { data, expiresAt: now + CACHE_TTL_MS });
  trimCache();

  res.setHeader("X-Image-Status-Cache", "MISS");
  res.json(data);
});

export default router;
