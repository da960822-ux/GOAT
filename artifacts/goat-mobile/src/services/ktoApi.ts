/**
 * Shared KTO API utilities
 *
 * On WEB:  all requests are proxied through the Express api-server at
 *   https://${EXPO_PUBLIC_DOMAIN}/api/kto?path=<KTO_path>&<params>
 *   → avoids CORS restrictions in the browser
 *
 * On NATIVE (iOS/Android): requests go directly to apis.data.go.kr with
 *   the serviceKey embedded at build time (no CORS restriction on native).
 */

import { Platform } from "react-native";

const SERVICE_KEY = (process.env.EXPO_PUBLIC_KTO_SERVICE_KEY ?? "").trim();
const MOBILE_OS = process.env.EXPO_PUBLIC_KTO_MOBILE_OS ?? "ETC";
const MOBILE_APP = process.env.EXPO_PUBLIC_KTO_MOBILE_APP ?? "GOAT";
const PROXY_DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";

const KTO_B551011 = "https://apis.data.go.kr/B551011/";
const FETCH_TIMEOUT_MS = 10_000;

if (__DEV__) {
  if (Platform.OS === "web" && !PROXY_DOMAIN) {
    console.warn("[ktoApi] EXPO_PUBLIC_DOMAIN not set — KTO proxy unavailable on web.");
  } else if (Platform.OS !== "web" && !SERVICE_KEY) {
    console.warn("[ktoApi] EXPO_PUBLIC_KTO_SERVICE_KEY not set — KTO API unavailable on native.");
  }
}

export function hasServiceKey(): boolean {
  if (Platform.OS === "web") return !!PROXY_DOMAIN;
  return !!SERVICE_KEY;
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
 * Web:    routes through the api-server proxy at /api/kto
 * Native: direct KTO request with serviceKey embedded
 */
export function buildUrl(
  base: string,
  params: Record<string, string | number>
): string {
  if (Platform.OS === "web" && PROXY_DOMAIN) {
    // Strip the KTO base prefix to get the path segment, e.g.
    //   "https://apis.data.go.kr/B551011/PhotoGalleryService1/galleryList1"
    //   → "PhotoGalleryService1/galleryList1"
    const ktoPath = base.startsWith(KTO_B551011)
      ? base.slice(KTO_B551011.length)
      : base;

    const proxyParams = new URLSearchParams({ path: ktoPath });
    Object.entries(params).forEach(([k, v]) => proxyParams.append(k, String(v)));
    return `https://${PROXY_DOMAIN}/api/kto?${proxyParams.toString()}`;
  }

  // Native: direct call — serviceKey appended as-is (already URL-encoded)
  const query = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return `${base}?serviceKey=${SERVICE_KEY}&${query}`;
}

/**
 * Fetch a KTO endpoint with timeout and safe error handling.
 * Returns parsed JSON on success, null on any error.
 */
export async function ktoFetch(
  base: string,
  params: Record<string, string | number>
): Promise<any> {
  const isWeb = Platform.OS === "web";
  if (isWeb && !PROXY_DOMAIN) return null;
  if (!isWeb && !SERVICE_KEY) return null;

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
