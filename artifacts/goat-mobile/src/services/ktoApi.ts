/**
 * Shared KTO API utilities
 *
 * Web, iOS and Android all use the Express proxy so the KTO service key
 * remains server-only.
 */

import { Platform } from "react-native";
import { API_BASE_URL, resolveApiUrl } from "../config/api";

const MOBILE_OS = process.env.EXPO_PUBLIC_KTO_MOBILE_OS ?? "ETC";
const MOBILE_APP = process.env.EXPO_PUBLIC_KTO_MOBILE_APP ?? "GOAT";

const KTO_B551011 = "https://apis.data.go.kr/B551011/";
const FETCH_TIMEOUT_MS = 10_000;
const IMAGE_STATUS_TIMEOUT_MS = 7_000;

if (__DEV__) {
  if (Platform.OS !== "web" && !API_BASE_URL) {
    console.warn("[ktoApi] EXPO_PUBLIC_API_BASE_URL not set — API proxy unavailable on native.");
  }
}

export function hasServiceKey(): boolean {
  return Platform.OS === "web" || Boolean(API_BASE_URL);
}

/**
 * KTO still returns some public image URLs with an http scheme. The official
 * image host supports HTTPS, so upgrade only that known host to avoid mixed
 * content blocking in HTTPS web deployments.
 */
export function normalizeKtoImageUrl(imageUrl: string): string {
  try {
    const url = new URL(imageUrl);
    if (
      url.protocol === "http:" &&
      url.hostname.toLowerCase() === "tong.visitkorea.or.kr"
    ) {
      url.protocol = "https:";
    }
    return url.toString();
  } catch {
    return imageUrl;
  }
}

/** Returns the common auth/identity params (excluding serviceKey) */
export function getAuthParams(): Record<string, string> {
  return {
    MobileOS: MOBILE_OS,
    MobileApp: MOBILE_APP,
    _type: "json",
  };
}

/**
 * Build the request URL.
 *
 * All platforms route through the api-server proxy at /api/kto.
 */
export function buildUrl(
  base: string,
  params: Record<string, string | number>
): string {
  const ktoPath = base.startsWith(KTO_B551011)
    ? base.slice(KTO_B551011.length)
    : base;

  const proxyParams = new URLSearchParams({ path: ktoPath });
  Object.entries(params).forEach(([k, v]) => proxyParams.append(k, String(v)));
  return resolveApiUrl(`/api/kto?${proxyParams.toString()}`);
}

/**
 * Fetch a KTO endpoint with timeout and safe error handling.
 * Returns parsed JSON on success, null on any error.
 */
export async function ktoFetch(
  base: string,
  params: Record<string, string | number>
): Promise<any> {
  if (!hasServiceKey()) return null;

  const url = buildUrl(base, params);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function isRemoteImageAvailable(imageUrl: string): Promise<boolean> {
  if (!imageUrl || !hasServiceKey()) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMAGE_STATUS_TIMEOUT_MS);

  try {
    const url = resolveApiUrl(`/api/image-status?url=${encodeURIComponent(imageUrl)}`);
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) return true;

    const data = (await res.json()) as { ok?: boolean };
    return data.ok !== false;
  } catch {
    return true;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Safely extract the items array from a standard KTO API JSON response.
 * The API returns items.item as array, single object, or "" when empty.
 */
export function extractItems(json: any): any[] {
  if (!json) return [];
  const item = json?.response?.body?.items?.item;
  if (!item || item === "") return [];
  return Array.isArray(item) ? item : [item];
}

/** Strip HTML tags from KTO overview/description strings */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}
