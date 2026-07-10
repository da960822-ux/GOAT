const explicitBaseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "").trim();
const legacyDomain = (process.env.EXPO_PUBLIC_DOMAIN ?? "").trim();

export const API_BASE_URL = (
  explicitBaseUrl ||
  (legacyDomain ? `https://${legacyDomain.replace(/^https?:\/\//, "")}` : "")
).replace(/\/+$/, "");

export function resolveApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
}
