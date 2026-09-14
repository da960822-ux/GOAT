import assert from "node:assert/strict";

const baseUrl = process.env.KTO_VERIFY_BASE_URL;
if (!baseUrl) {
  console.error("Set KTO_VERIFY_BASE_URL to the deployed API base URL.");
  process.exit(2);
}

const selectedPlaceId = process.env.KTO_VERIFY_PLACE_ID ?? "GOAT-002";
const primaryTheme = process.env.KTO_VERIFY_PRIMARY_THEME ?? "휴양·카페·이국공간 무드";
const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/recommend-course`, {
  method: "POST",
  headers: { "content-type": "application/json", accept: "application/json" },
  body: JSON.stringify({ selectedPlaceId, primaryTheme, radiusMeters: 5000, maxCandidatesForLlm: 20 }),
});
const body = await response.json();
assert.equal(response.ok, true, JSON.stringify(body));
const result = body?.data;
assert.ok(result?.selectedPlace?.place_id === selectedPlaceId, JSON.stringify(body));
assert.ok(Array.isArray(result?.stops) && result.stops.length >= 2, JSON.stringify(body));
const ktoStops = result.stops.filter((stop) => stop?.source === "VISITKOREA_CONTENT_LAB");
assert.ok(ktoStops.length > 0, JSON.stringify(result.stops));
assert.ok(ktoStops.every((stop) => stop.address && Number.isFinite(stop.lat) && Number.isFinite(stop.lng)), JSON.stringify(ktoStops));
const detailResponse = await fetch(`${baseUrl.replace(/\/$/, "")}/api/places/${selectedPlaceId}`, {
  headers: { accept: "application/json" },
});
const detailBody = await detailResponse.json();
assert.equal(detailResponse.ok, true, JSON.stringify(detailBody));
const detail = detailBody?.data?.officialTourInfo;
assert.ok(detail?.contentId, JSON.stringify(detailBody));
assert.ok(detail?.canonicalName && detail?.address, JSON.stringify(detail));
assert.ok(detail?.overview || detail?.homepage || detail?.parking, JSON.stringify(detail));
console.log(JSON.stringify({
  ok: true,
  selectedPlaceId,
  mode: result.mode,
  stopCount: result.stops.length,
  ktoStopCount: ktoStops.length,
  ktoStopIds: ktoStops.map((stop) => stop.id),
  fallbackUsed: result.mode === "RULE_BASED_FALLBACK",
  detail: {
    contentId: detail.contentId,
    canonicalName: detail.canonicalName,
    hasOverview: Boolean(detail.overview),
    hasHomepage: Boolean(detail.homepage),
  },
}, null, 2));
