import { Platform } from "react-native";

const explicitBaseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "").trim();
const legacyDomain = (process.env.EXPO_PUBLIC_DOMAIN ?? "").trim();
const developmentWebBaseUrl =
  __DEV__ && Platform.OS === "web" ? "http://127.0.0.1:3000" : "";
const legacyBaseUrl = legacyDomain
  ? /^https?:\/\//i.test(legacyDomain)
    ? legacyDomain
    : `https://${legacyDomain}`
  : "";

export const API_BASE_URL = (
  explicitBaseUrl ||
  legacyBaseUrl ||
  developmentWebBaseUrl
).replace(/\/+$/, "");

export function resolveApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
}
