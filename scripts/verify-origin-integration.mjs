import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function findEnv(start) {
  let current = start;
  while (true) {
    const candidate = resolve(current, "GOAT.env");
    try {
      await access(candidate);
      return candidate;
    } catch {
      const parent = dirname(current);
      if (parent === current) throw new Error("GOAT_ENV_NOT_FOUND");
      current = parent;
    }
  }
}

const envPath = process.env.GOAT_ENV_FILE
  ? resolve(process.cwd(), process.env.GOAT_ENV_FILE)
  : await findEnv(root);
const envText = await readFile(envPath, "utf8");
const portLine = envText.split(/\r?\n/).find((line) => /^PORT=/.test(line));
const port = Number(process.env.GOAT_TEST_PORT ?? portLine?.slice("PORT=".length).trim().replace(/^(['"])(.*)\1$/, "$2"));
if (!Number.isInteger(port) || port <= 0) throw new Error("PORT_NOT_LOADED");

const baseUrl = `http://127.0.0.1:${port}/api`;
const commonBody = {
  moodId: "sea-coast",
  preferences: {
    companion: "친구",
    transport: "대중교통",
    visitTime: "오후",
    purpose: "사진 위주",
  },
};

async function postRecommendation(origin, transport = "대중교통") {
  const response = await fetch(`${baseUrl}/recommend-from-tags`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...commonBody,
      preferences: { ...commonBody.preferences, transport },
      origin,
    }),
  });
  return { response, body: await response.json() };
}

const health = await fetch(`${baseUrl}/healthz`);
console.log(`BACKEND_HEALTH: ${health.ok ? "PASSED" : "FAILED"}`);
const courseMap = await fetch(`${baseUrl}/course-map?centerLat=37.5665&centerLng=126.978&markers=${encodeURIComponent(JSON.stringify([{ order: 1, title: "환경변수 로드 검증", lat: 37.5665, lng: 126.978 }]))}`);
console.log(`BACKEND_KAKAO_ENV_LOAD: ${courseMap.ok ? "PASSED" : "FAILED"}`);

const current = await postRecommendation({
  type: "current",
  latitude: 37.5665,
  longitude: 126.978,
});
const car = await postRecommendation({
  type: "current",
  latitude: 37.5665,
  longitude: 126.978,
}, "자차");
const region = await postRecommendation({
  type: "region",
  latitude: 37.8813,
  longitude: 127.73,
  regionName: "춘천",
});
const skipped = await postRecommendation({ type: "skip" });
const unavailable = await postRecommendation({ type: "current" });

console.log(`CURRENT_ORIGIN_REQUEST_DTO: ${current.response.ok ? "ACCEPTED" : "REJECTED"}`);
console.log(`CAR_ORIGIN_REQUEST_DTO: ${car.response.ok ? "ACCEPTED" : "REJECTED"}`);
console.log(`REGION_ORIGIN_REQUEST_DTO: ${region.response.ok ? "ACCEPTED" : "REJECTED"}`);
console.log(`SKIP_ORIGIN_REQUEST_DTO: ${skipped.response.ok ? "ACCEPTED" : "REJECTED"}`);
console.log(`UNAVAILABLE_ORIGIN_REQUEST_DTO: ${unavailable.response.ok ? "ACCEPTED" : "REJECTED"}`);
console.log(`ORIGIN_STATUS_APPLIED: ${current.body?.data?.originStatus === "APPLIED" ? "PASSED" : "MISSING"}`);
console.log(`ORIGIN_STATUS_SKIPPED: ${skipped.body?.data?.originStatus === "SKIPPED" ? "PASSED" : "MISSING"}`);
console.log(`ORIGIN_STATUS_UNAVAILABLE: ${unavailable.body?.data?.originStatus === "UNAVAILABLE" ? "PASSED" : "MISSING"}`);
const requiredFailureMessage = "현재 위치를 불러오지 못했어요. 우선 거리 정보 없이 추천해드릴게요.";
console.log(`UNAVAILABLE_NOTICE_EXACT: ${unavailable.body?.data?.originNotice === requiredFailureMessage ? "PASSED" : "FAILED"}`);

const summarize = (body) => body?.data?.cards?.map((card) => ({
  placeId: card.placeId,
  baseScore: card.score?.baseScore,
  routeDistanceBonus: card.score?.routeDistanceBonus,
})) ?? [];
const currentCards = summarize(current.body);
const skippedCards = summarize(skipped.body);
console.log(`ORIGIN_REACHES_RECOMMENDATION_ENGINE: ${JSON.stringify(currentCards) === JSON.stringify(skippedCards) ? "FAILED_IGNORED" : "OBSERVED"}`);
console.log(`CARD1_ROUTE_BONUS_ZERO: ${currentCards[0]?.routeDistanceBonus === 0 ? "PASSED" : "FAILED"}`);
console.log(`CARD2_3_LINKAGE_BONUS_PRESENT: ${currentCards.slice(1).every((card) => typeof card.routeDistanceBonus === "number") ? "PASSED" : "FAILED"}`);
const carCards = car.body?.data?.cards ?? [];
const carRecommendations = car.body?.data?.recommendations ?? [];
console.log(`CAR_CARD1_ORIGIN_SCORE_NOT_APPLIED: ${carCards[0]?.score?.originDistanceBonus === 0 && carCards[0]?.score?.routeDistanceBonus === 0 && carRecommendations[0]?.routeInfo?.scoreApplied === false ? "PASSED" : "FAILED"}`);
console.log(`CAR_CARD2_3_LINKAGE_SOURCE: ${carCards.slice(1).map((card) => card.score?.routeDistanceSource ?? "NONE").join(",")}`);

const geocodeProbe = await fetch(`${baseUrl}/geocode-origin`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ query: "춘천시청" }),
});
const geocodeBody = await geocodeProbe.json();
const geocodePassed = geocodeProbe.ok
  && Number.isFinite(Number(geocodeBody?.data?.origin?.latitude))
  && Number.isFinite(Number(geocodeBody?.data?.origin?.longitude));
console.log(`BACKEND_ADDRESS_SEARCH_ENDPOINT: ${geocodePassed ? "PASSED" : `FAILED_HTTP_${geocodeProbe.status}`}`);
console.log(`ADDRESS_TO_COORDINATES: ${geocodePassed ? "PASSED" : "FAILED"}`);

const contractPassed = health.ok
  && courseMap.ok
  && current.response.ok
  && car.response.ok
  && region.response.ok
  && skipped.response.ok
  && unavailable.response.ok
  && current.body?.data?.originStatus === "APPLIED"
  && car.body?.data?.originStatus === "APPLIED"
  && skipped.body?.data?.originStatus === "SKIPPED"
  && unavailable.body?.data?.originStatus === "UNAVAILABLE"
  && unavailable.body?.data?.originNotice === requiredFailureMessage
  && geocodePassed;
if (!contractPassed) process.exitCode = 1;
