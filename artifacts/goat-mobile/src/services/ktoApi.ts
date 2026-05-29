/**
 * Shared KTO API utilities
 *
 * All KTO endpoints at apis.data.go.kr require:
 *   serviceKey  — URL-encoded key issued by the portal (append directly, not double-encoded)
 *   MobileOS    — from EXPO_PUBLIC_KTO_MOBILE_OS
 *   MobileApp   — from EXPO_PUBLIC_KTO_MOBILE_APP
 *   _type=json  — for JSON responses
 */

const SERVICE_KEY = process.env.EXPO_PUBLIC_KTO_SERVICE_KEY ?? '';
const MOBILE_OS = process.env.EXPO_PUBLIC_KTO_MOBILE_OS ?? 'ETC';
const MOBILE_APP = process.env.EXPO_PUBLIC_KTO_MOBILE_APP ?? 'GOAT';
const FETCH_TIMEOUT_MS = 8000;

if (!SERVICE_KEY && __DEV__) {
  console.warn('[ktoApi] EXPO_PUBLIC_KTO_SERVICE_KEY is not set.');
}

export function hasServiceKey(): boolean {
  return !!SERVICE_KEY;
}

/** Returns the common auth/identity params (excluding serviceKey) */
export function getAuthParams(): Record<string, string> {
  return {
    MobileOS: MOBILE_OS,
    MobileApp: MOBILE_APP,
    _type: 'json',
  };
}

/**
 * Build a URL for a KTO endpoint.
 * serviceKey is appended as-is (already URL-encoded by data.go.kr portal).
 * All other param values are encoded with encodeURIComponent.
 */
export function buildUrl(base: string, params: Record<string, string | number>): string {
  const query = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `${base}?serviceKey=${SERVICE_KEY}&${query}`;
}

/**
 * Fetch a KTO API endpoint with timeout and safe error handling.
 * Returns parsed JSON on success, null on any error.
 */
export async function ktoFetch(
  base: string,
  params: Record<string, string | number>
): Promise<any> {
  if (!SERVICE_KEY) return null;
  const url = buildUrl(base, params);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
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
 * The API returns items.item as either an array, a single object, or ""
 * (empty string) when no results exist.
 */
export function extractItems(json: any): any[] {
  if (!json) return [];
  const item = json?.response?.body?.items?.item;
  if (!item || item === '') return [];
  return Array.isArray(item) ? item : [item];
}

/** Strip HTML tags from a KTO overview/description string */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}
