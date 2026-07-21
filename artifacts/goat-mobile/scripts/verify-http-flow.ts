import assert from "node:assert/strict";
import {
  getMoods,
  getPlace,
  recommendCourse,
  recommendFromTags,
  setBaseUrl,
} from "@workspace/api-client-react";

const apiBaseUrl = process.env.GOAT_API_BASE_URL ?? "http://127.0.0.1:43131";
const requestIdPattern = /^[A-Za-z0-9._:-]{8,128}$/;
const locationFailureNotice =
  "현재 위치를 불러오지 못했어요. 우선 거리 정보 없이 추천해드릴게요.";

setBaseUrl(apiBaseUrl);

async function main() {
  const requestOptions = { signal: AbortSignal.timeout(45_000) };
  const health = await fetch(`${apiBaseUrl}/api/healthz`, requestOptions);
  assert.equal(health.status, 200, "API health check must pass");

  const moods = await getMoods(requestOptions);
  assert.equal(moods.data.moods.length, 7, "all seven moods must be available");

  const sessionId = `goat_http_${Date.now().toString(36)}`;
  const first = await recommendFromTags(
    {
      moodId: "alps-ranch",
      sessionId,
      travelPurpose: "산책·힐링",
      transportType: "대중교통",
      visitTime: "오후",
      currentMonth: 10,
      preferences: {
        companion: "친구",
        transport: "대중교통",
        visitTime: "오후",
        purpose: "가볍게 산책",
      },
      origin: {
        type: "current",
        latitude: 37.5665,
        longitude: 126.978,
      },
    },
    requestOptions,
  );

  assert.equal(first.data.recommendations.length, 3);
  assert.equal(first.data.seedPoolSize, 61);
  assert.match(first.data.requestId, requestIdPattern);
  assert.equal(first.data.originStatus, "APPLIED");
  const firstIds = first.data.recommendations.map(({ place }) => place.place_id);
  assert.equal(new Set(firstIds).size, 3, "initial cards must be unique");

  const selected = first.data.recommendations[0].place;
  const detail = await getPlace(selected.place_id, requestOptions);
  assert.equal(detail.data.place.place_id, selected.place_id);

  const rerolled = await recommendFromTags(
    {
      moodId: "alps-ranch",
      sessionId,
      rerollOfRequestId: first.data.requestId,
      travelPurpose: "산책·힐링",
      transportType: "대중교통",
      visitTime: "오후",
      currentMonth: 10,
      preferences: {
        companion: "친구",
        transport: "대중교통",
        visitTime: "오후",
        purpose: "가볍게 산책",
      },
    },
    requestOptions,
  );
  const rerolledIds = rerolled.data.recommendations.map(({ place }) => place.place_id);
  assert.equal(rerolledIds.length, 3);
  assert.equal(new Set(rerolledIds).size, 3, "rerolled cards must be unique");
  assert.match(rerolled.data.requestId, requestIdPattern);
  assert.notEqual(rerolled.data.requestId, first.data.requestId);
  assert.ok(
    rerolledIds.every((id) => !firstIds.includes(id)),
    "the server session must exclude the immediately previous three cards",
  );

  const locationUnavailable = await recommendFromTags(
    {
      moodId: "alps-ranch",
      sessionId: `${sessionId}_location`,
      transportType: "도보중심",
      travelPurpose: "사진·포토스팟",
      origin: { type: "current" },
    },
    requestOptions,
  );
  assert.equal(locationUnavailable.data.recommendations.length, 3);
  assert.equal(locationUnavailable.data.originStatus, "UNAVAILABLE");
  assert.equal(locationUnavailable.data.originNotice, locationFailureNotice);

  const invalidReroll = await fetch(`${apiBaseUrl}/api/recommend-from-tags`, {
    ...requestOptions,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      moodId: "alps-ranch",
      rerollOfRequestId: first.data.requestId,
      excludeIds: firstIds,
    }),
  });
  assert.equal(invalidReroll.status, 400, "reroll without a session must be rejected");

  const course = await recommendCourse(
    {
      selectedPlaceId: selected.place_id,
      primaryTheme: "알프스·고원·목장 무드",
      userMoodTags: selected.mood_tags.slice(0, 10),
      userSceneTags: selected.mood_tags.slice(0, 10),
      companionType: "친구",
      travelPurpose: "산책·힐링",
      transportType: "대중교통",
      forceRuleBasedFallback: true,
    },
    requestOptions,
  );
  assert.equal(course.data.status, "DONE");
  assert.equal(course.data.mode, "RULE_BASED_FALLBACK");
  assert.ok(course.data.stops.length > 0, "course must contain at least one stop");
  assert.ok(course.data.staticMap, "course must include map or fallback map metadata");

  console.log(
    `HTTP flow verification passed: moods=7, initial=${firstIds.join(",")}, reroll=${rerolledIds.join(",")}, courseStops=${course.data.stops.length}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
