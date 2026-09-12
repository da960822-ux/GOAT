import assert from "node:assert/strict";
import {
  getShortTermForecast,
  normalizeShortTermForecast,
  latestKmaBase,
  summarizeTodayContext,
  toDiscoveryWeatherCondition,
  toKmaGrid,
} from "../src/services/today-context";
import { normalizeVisitConcentration } from "../src/lib/kto-visit-concentration";

const now = new Date("2026-09-13T00:20:00.000Z"); // 09:20 KST
const forecast = normalizeShortTermForecast([
  { fcstDate: "20260913", fcstTime: "1000", category: "PTY", fcstValue: "0" },
  { fcstDate: "20260913", fcstTime: "1000", category: "SKY", fcstValue: "1" },
  { fcstDate: "20260913", fcstTime: "1000", category: "TMP", fcstValue: "21" },
  { fcstDate: "20260913", fcstTime: "1000", category: "WSD", fcstValue: "2.1" },
  { fcstDate: "20260913", fcstTime: "1100", category: "PTY", fcstValue: "1" },
  { fcstDate: "20260913", fcstTime: "1100", category: "SKY", fcstValue: "4" },
  { fcstDate: "20260914", fcstTime: "1000", category: "PTY", fcstValue: "0" },
], now);
assert.equal(forecast.status, "APPLIED");
assert.deepEqual(forecast.hours.map(({ atKst }) => atKst), ["202609131000", "202609131100"]);
assert.equal(forecast.hours[1]?.precipitation, "RAIN_OR_SNOW");
assert.deepEqual(toKmaGrid(37.8813, 127.7298), { nx: 73, ny: 134 });
assert.deepEqual(latestKmaBase(now), { baseDate: "20260913", baseTime: "0800" });
assert.deepEqual(latestKmaBase(new Date("2026-09-12T15:05:00.000Z")), { baseDate: "20260912", baseTime: "2300" });
assert.equal(normalizeShortTermForecast([], now).reason, "NO_SAME_DAY_FORECAST");
const concentration = normalizeVisitConcentration(
  [{ tAtsNm: "테스트 관광지", baseYmd: "20260913", cnctrRate: "0.8" }],
  "테스트 관광지",
  now,
);
assert.equal(concentration.comparison, "UNSUPPORTED");
assert.equal(concentration.concentrationRate, null);
assert.deepEqual(
  summarizeTodayContext({
    requested: true,
    factors: [
      { factor: "WEATHER", status: "APPLIED" },
      { factor: "VISIT_CONCENTRATION", status: "SKIPPED" },
    ],
    baselinePlaceIds: ["a", "b", "c"],
    conditionedPlaceIds: ["a", "b", "c"],
  }),
  {
    todayStatus: "NO_CHANGE",
    appliedFactors: ["WEATHER"],
    skippedFactors: ["VISIT_CONCENTRATION"],
    partialApplied: true,
  },
);
assert.equal(
  summarizeTodayContext({
    requested: true,
    factors: [{ factor: "WEATHER", status: "SKIPPED" }],
    baselinePlaceIds: ["a"],
    conditionedPlaceIds: ["a"],
  }).todayStatus,
  "UNAVAILABLE",
);
assert.deepEqual(toDiscoveryWeatherCondition(forecast), {
  status: "COMPARABLE",
  comparisonKey: "202609131000/202609131100",
  preference: 1,
});
assert.deepEqual(
  toDiscoveryWeatherCondition({
    factor: "WEATHER",
    status: "SKIPPED",
    reason: "PROVIDER_NOT_CONFIGURED",
    windowStartKst: null,
    windowEndKst: null,
    hours: [],
  }),
  { status: "UNAVAILABLE", reason: "NO_DATA" },
);

const originalFetch = globalThis.fetch;
const originalKmaKey = process.env.KMA_SERVICE_KEY;
const originalKtoKey = process.env.KTO_SERVICE_KEY;
try {
  delete process.env.KMA_SERVICE_KEY;
  process.env.KTO_SERVICE_KEY = "shared-data-go-kr-key";
  let requestedKey = "";
  globalThis.fetch = (async (input) => {
    requestedKey = new URL(String(input)).searchParams.get("serviceKey") ?? "";
    return new Response(JSON.stringify({ response: { body: { items: { item: [
      { fcstDate: "20260913", fcstTime: "1000", category: "PTY", fcstValue: "0" },
    ] } } } }), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  assert.equal((await getShortTermForecast({ latitude: 37.8813, longitude: 127.7298 }, now)).status, "APPLIED");
  assert.equal(requestedKey, "shared-data-go-kr-key");

  process.env.KMA_SERVICE_KEY = "dedicated-kma-key";
  assert.equal((await getShortTermForecast({ latitude: 37.8813, longitude: 127.7298 }, now)).status, "APPLIED");
  assert.equal(requestedKey, "dedicated-kma-key");
} finally {
  globalThis.fetch = originalFetch;
  if (originalKmaKey === undefined) delete process.env.KMA_SERVICE_KEY;
  else process.env.KMA_SERVICE_KEY = originalKmaKey;
  if (originalKtoKey === undefined) delete process.env.KTO_SERVICE_KEY;
  else process.env.KTO_SERVICE_KEY = originalKtoKey;
}
console.log("Today context verification passed.");
