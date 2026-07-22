import type { CourseStop, StaticMapResult } from "@workspace/travel-domain";

declare const process: { env: Record<string, string | undefined> };

function getEnv(key: string): string | undefined {
  const value = process.env[key];
  return value && value.trim() ? value.trim() : undefined;
}

function hasCoordinates(stop: CourseStop): stop is CourseStop & { lat: number; lng: number } {
  return typeof stop.lat === "number" &&
    Number.isFinite(stop.lat) &&
    typeof stop.lng === "number" &&
    Number.isFinite(stop.lng);
}

export function buildKakaoMapSearchUrl(keyword: string): string {
  return `https://map.kakao.com/link/search/${encodeURIComponent(keyword)}`;
}

export function buildKakaoStaticMapResult(stops: CourseStop[], fallbackKeyword: string): StaticMapResult {
  // REST API keys are server credentials and must never be embedded in a client-side SDK URL.
  // KAKAO_MAP_KEY is retained as a backwards-compatible alias only for a public JavaScript key.
  const appKey = getEnv("KAKAO_JAVASCRIPT_KEY") ?? getEnv("KAKAO_MAP_KEY");
  const withCoords = stops.filter(hasCoordinates);

  if (!appKey || withCoords.length === 0) {
    return {
      provider: "KAKAO_MAP_SEARCH",
      fallbackMapSearchUrl: buildKakaoMapSearchUrl(fallbackKeyword),
      reason: !appKey
        ? "Kakao StaticMap 렌더링용 앱 키가 없어 검색 링크로 fallback했습니다."
        : "코스 후보 좌표가 부족해 검색 링크로 fallback했습니다.",
    };
  }

  const center = withCoords[0];
  const markers = withCoords.slice(0, 6).map((stop, index) => ({
    order: index + 1,
    title: stop.title,
    lat: stop.lat,
    lng: stop.lng,
  }));

  return {
    provider: "KAKAO_JS_SDK_STATIC_MAP",
    staticMapConfig: {
      sdkScriptUrl: `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}`,
      containerId: "goat-static-map",
      center: { lat: center.lat, lng: center.lng },
      level: 7,
      width: 640,
      height: 360,
      markers,
    },
    fallbackMapSearchUrl: buildKakaoMapSearchUrl(fallbackKeyword),
  };
}
