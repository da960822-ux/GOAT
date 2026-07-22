import assert from "node:assert/strict";
import {
  geocodeOriginQuery,
  getKakaoCarRoute,
  isKakaoGeocodingConfigured,
  isKakaoRoutingConfigured,
} from "../../artifacts/api-server/src/services/kakao-location";

const originalFetch = globalThis.fetch;
const originalLocalKey = process.env.KAKAO_REST_API_KEY;
const originalMobilityKey = process.env.KAKAO_MOBILITY_REST_API_KEY;
const originalTimeout = process.env.KAKAO_API_TIMEOUT_MS;

try {
  delete process.env.KAKAO_REST_API_KEY;
  delete process.env.KAKAO_MOBILITY_REST_API_KEY;
  assert.equal(isKakaoGeocodingConfigured(), false);
  assert.equal(isKakaoRoutingConfigured(), false);
  await assert.rejects(
    getKakaoCarRoute(
      { latitude: 37.1, longitude: 127.1 },
      { latitude: 37.2, longitude: 127.2 },
    ),
    /KAKAO_API_KEY_MISSING/,
  );

  process.env.KAKAO_REST_API_KEY = "test-local-key";
  process.env.KAKAO_MOBILITY_REST_API_KEY = "test-mobility-key";
  let routeCalls = 0;
  globalThis.fetch = (async () => {
    routeCalls += 1;
    return new Response(JSON.stringify({
      routes: [{ result_code: 0, summary: { distance: 12_340, duration: 1_860 } }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  const origin = { latitude: 37.31, longitude: 127.31 };
  const destination = { latitude: 37.32, longitude: 127.32 };
  assert.deepEqual(await getKakaoCarRoute(origin, destination), {
    distanceKm: 12.3,
    durationMin: 31,
    source: "KAKAO_ROUTE",
  });
  await getKakaoCarRoute(origin, destination);
  assert.equal(routeCalls, 1, "10-minute route cache should prevent a duplicate fetch");

  globalThis.fetch = (async () => new Response("{}", { status: 503 })) as typeof fetch;
  await assert.rejects(
    getKakaoCarRoute(
      { latitude: 37.41, longitude: 127.41 },
      { latitude: 37.42, longitude: 127.42 },
    ),
    /KAKAO_API_HTTP_503/,
  );

  process.env.KAKAO_API_TIMEOUT_MS = "10";
  globalThis.fetch = ((_: string | URL | Request, init?: RequestInit) => new Promise((_, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
  })) as typeof fetch;
  await assert.rejects(
    getKakaoCarRoute(
      { latitude: 37.51, longitude: 127.51 },
      { latitude: 37.52, longitude: 127.52 },
    ),
    (error: unknown) => error instanceof DOMException && error.name === "AbortError",
  );

  let geocodeCalls = 0;
  globalThis.fetch = (async () => {
    geocodeCalls += 1;
    if (geocodeCalls === 1) {
      return new Response(JSON.stringify({ documents: [] }), { status: 200 });
    }
    return new Response(JSON.stringify({
      documents: [{
        x: "127.7300",
        y: "37.8813",
        place_name: "춘천시청",
        address_name: "강원특별자치도 춘천시",
      }],
    }), { status: 200 });
  }) as typeof fetch;
  const geocoded = await geocodeOriginQuery("춘천시청");
  assert.equal(geocoded?.source, "KEYWORD");
  assert.equal(geocoded?.label, "춘천시청");
  assert.equal(geocodeCalls, 2);

  console.log("Kakao location verification passed: unconfigured, success, cache, HTTP failure, timeout, geocode fallback.");
} finally {
  globalThis.fetch = originalFetch;
  if (originalLocalKey === undefined) delete process.env.KAKAO_REST_API_KEY;
  else process.env.KAKAO_REST_API_KEY = originalLocalKey;
  if (originalMobilityKey === undefined) delete process.env.KAKAO_MOBILITY_REST_API_KEY;
  else process.env.KAKAO_MOBILITY_REST_API_KEY = originalMobilityKey;
  if (originalTimeout === undefined) delete process.env.KAKAO_API_TIMEOUT_MS;
  else process.env.KAKAO_API_TIMEOUT_MS = originalTimeout;
}
