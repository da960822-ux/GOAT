import assert from "node:assert/strict";
import http from "node:http";
import { goatPlacesDataset } from "@workspace/travel-domain";
import { createGoatDayCourse } from "../src/services/course-recommendation";
import { getPlaceCurrentWeather } from "../src/services/place-current-weather";
import { redactRecommendationConditions } from "../src/lib/recommendation-condition-privacy";

const result = await createGoatDayCourse(
  { selectedPlaceId: "GOAT-001", primaryTheme: "바다·해안 무드" },
  goatPlacesDataset,
);
assert.equal(result.status, "DONE");
assert.equal(result.mode, "RULE_BASED_FALLBACK");
assert.equal(result.stops[0]?.id, "GOAT-001");
assert(result.stops.length <= 3, "selected place plus at most two internal places");
assert(result.stops.slice(1).every((stop) => stop.source === "LOCAL_DB"));

const weather = await getPlaceCurrentWeather(
  { latitude: 37.8, longitude: 128.9 },
  async () => { throw new Error("weather unavailable"); },
);
assert.equal(weather, null, "weather failure must not fail place detail");

const conditions = redactRecommendationConditions({
  moodId: "sea-coast",
  origin: { type: "address", latitude: 37.5665, longitude: 126.978, regionName: "서울역" },
});
assert.deepEqual(conditions.origin, { type: "address" });

process.env.DATABASE_URL = "postgres://test:test@127.0.0.1:5432/test";
process.env.KMA_SERVICE_KEY = "test";
delete process.env.ENABLE_GOOGLE_PLACES_CONTENT;
globalThis.fetch = (async () => { throw new Error("provider unavailable"); }) as typeof fetch;
const { default: app } = await import("../src/app");
const server = app.listen(0);
await new Promise<void>((resolve) => server.once("listening", resolve));
const address = server.address();
assert(address && typeof address === "object");
const request = (path: string, body?: unknown) => new Promise<{ status: number; body: any }>((resolve, reject) => {
  const payload = body === undefined ? undefined : JSON.stringify(body);
  const req = http.request({ hostname: "127.0.0.1", port: address.port, path: `/api${path}`, method: body ? "POST" : "GET", headers: payload ? { "content-type": "application/json", "content-length": Buffer.byteLength(payload) } : {} }, (res) => {
    const chunks: Buffer[] = [];
    res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    res.on("end", () => resolve({ status: res.statusCode ?? 0, body: JSON.parse(Buffer.concat(chunks).toString("utf8")) }));
  });
  req.on("error", reject);
  if (payload) req.write(payload);
  req.end();
});
try {
  const detail = await request("/places/GOAT-001");
  assert.equal(detail.status, 200);
  assert.equal(detail.body.data.currentWeather, null);
  const gps = await request("/recommend-from-tags", { moodId: "sea-coast", origin: { type: "current", latitude: 37.5, longitude: 127 } });
  assert.equal(gps.status, 400);
  const googlePhoto = await request("/google-place-photo/GOAT-003/0");
  assert.equal(googlePhoto.status, 404, "Google Places content must default to off");
} finally {
  server.close();
}
console.log("Course and location privacy verification passed.");
