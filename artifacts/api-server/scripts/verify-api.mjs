import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";

const port = 43129;
const baseUrl = `http://127.0.0.1:${port}/api`;
const expectedMoodIds = [
  "sea-coast",
  "japan-alley",
  "alps-ranch",
  "forest-garden-rest",
  "retro-market-harbor",
  "architecture-exhibit-landmark",
  "resort-cafe-exotic",
];

const server = spawn(process.execPath, ["--enable-source-maps", "./dist/index.mjs"], {
  cwd: new URL("..", import.meta.url),
  env: {
    ...process.env,
    PORT: String(port),
    DATABASE_URL: "postgresql://verify:verify@127.0.0.1:5432/verify",
    KTO_SERVICE_KEY: "",
    KAKAO_JAVASCRIPT_KEY: "test-key",
    ALLOW_RECOMMENDATION_DEBUG: "false",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

async function request(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = await response.json();
  return { response, body };
}

async function requestText(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  return { response, body: await response.text() };
}

async function recommend(body) {
  return request("/recommend-from-tags", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const { response } = await request("/healthz");
      if (response.ok) return;
    } catch {
      // Server startup is still in progress.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("API server did not start");
}

try {
  await waitForServer();

  const places = JSON.parse(
    await readFile(new URL("../../../lib/travel-domain/src/data/goat_simplified_scoring_tags_v10_accessibility_merged.json", import.meta.url)),
  );
  assert.equal(places.places.length, 61);
  assert.equal(new Set(places.places.map(({ place_id }) => place_id)).size, 61);
  assert.ok(places.places.some(({ place_id, place_name }) => place_id === "GOAT-002" && place_name.includes("레고랜드")));

  const moodsResult = await request("/moods");
  assert.equal(moodsResult.response.status, 200);
  assert.equal(moodsResult.body.data.moods.length, 7);
  assert.deepEqual(
    moodsResult.body.data.moods.map(({ id }) => id),
    expectedMoodIds,
  );

  for (const mood of moodsResult.body.data.moods) {
    const result = await recommend({ moodId: mood.id });
    assert.equal(result.response.status, 200, mood.id);
    assert.match(result.body.data.requestId, /^REQ_\d+_[A-Z0-9]+$/, mood.id);
    assert.equal(result.body.data.seedPoolSize, 61, mood.id);
    assert.ok(result.body.data.referenceCardId, mood.id);
    assert.equal(result.body.data.cards.length, 3, mood.id);
    assert.equal(result.body.data.recommendations.length, 3, mood.id);
    const ids = result.body.data.recommendations.map(({ place }) => place.place_id);
    assert.equal(new Set(ids).size, 3, mood.id);
    assert.deepEqual(
      result.body.data.cards.map(({ placeId }) => placeId),
      ids,
      mood.id,
    );
    assert.deepEqual(
      result.body.data.cards.map(({ role }) => role),
      ["BEST_SCENE", "SAME_MOOD_ALTERNATIVE", "CONDITION_FIT_ALTERNATIVE"],
      mood.id,
    );
    for (const [index, recommendation] of result.body.data.recommendations.entries()) {
      assert.ok(Array.isArray(recommendation.matchedTags));
      assert.equal(typeof recommendation.score, "number");
      assert.equal(typeof recommendation.scoreBreakdown.tag, "number");
      assert.equal(typeof recommendation.scoreBreakdown.baseScore, "number");
      assert.equal(recommendation.scoreBreakdown.originDistanceBonus, 0);
      if (index === 0) assert.equal(recommendation.scoreBreakdown.routeDistanceBonus, 0);
    }
  }

  const conditioned = await recommend({
    moodId: "alps-ranch",
    preferences: {
      companion: "가족",
      transport: "대중교통",
      visitTime: "오후",
      purpose: "사진 위주",
    },
    origin: {
      type: "current",
      latitude: 37.5665,
      longitude: 126.978,
    },
  });
  assert.equal(conditioned.response.status, 200);
  assert.ok(
    conditioned.body.data.recommendations.some(
      (recommendation) => recommendation.scoreBreakdown.travelPurpose > 0,
    ),
  );
  assert.ok(
    conditioned.body.data.recommendations.some(
      (recommendation) => recommendation.scoreBreakdown.transport > 0,
    ),
  );
  assert.equal(conditioned.body.data.originStatus, "APPLIED");
  assert.equal(conditioned.body.data.recommendations[0].scoreBreakdown.originDistanceBonus, 0);
  assert.equal(conditioned.body.data.recommendations[0].scoreBreakdown.routeDistanceBonus, 0);
  assert.equal(conditioned.body.data.recommendations[0].routeInfo.from, "ORIGIN");
  assert.equal(conditioned.body.data.recommendations[0].routeInfo.scoreApplied, false);
  for (const recommendation of conditioned.body.data.recommendations.slice(1)) {
    assert.equal(recommendation.scoreBreakdown.originDistanceBonus, 0);
    if (recommendation.routeInfo) {
      assert.equal(recommendation.routeInfo.from, "FIRST_CARD");
      assert.equal(recommendation.routeInfo.scoreApplied, true);
    } else {
      assert.equal(recommendation.scoreBreakdown.routeDistanceBonus, 0);
    }
  }

  const skippedOrigin = await recommend({
    moodId: "alps-ranch",
    origin: { type: "skip" },
  });
  assert.equal(skippedOrigin.response.status, 200);
  assert.equal(skippedOrigin.body.data.originStatus, "SKIPPED");
  assert.ok(!skippedOrigin.body.data.recommendations[0].routeInfo);
  for (const recommendation of skippedOrigin.body.data.recommendations) {
    assert.equal(recommendation.scoreBreakdown.originDistanceBonus, 0);
    assert.equal(recommendation.scoreBreakdown.routeDistanceBonus, 0);
    assert.ok(!recommendation.routeInfo);
  }

  const unavailableOrigin = await recommend({
    moodId: "alps-ranch",
    origin: { type: "current" },
  });
  assert.equal(unavailableOrigin.response.status, 200);
  assert.equal(unavailableOrigin.body.data.originStatus, "UNAVAILABLE");
  assert.equal(
    unavailableOrigin.body.data.originNotice,
    "현재 위치를 불러오지 못했어요. 우선 거리 정보 없이 추천해드릴게요.",
  );
  assert.ok(unavailableOrigin.body.data.warnings.includes("ORIGIN_UNAVAILABLE"));
  for (const recommendation of unavailableOrigin.body.data.recommendations) {
    assert.equal(recommendation.scoreBreakdown.routeDistanceBonus, 0);
    assert.ok(!recommendation.routeInfo);
  }

  const referenceCardRequest = await recommend({
    referenceCardId: "REF_SEA_02",
    travelPurpose: "사진·포토스팟",
    transportType: "자차",
    visitTime: "오후",
    currentMonth: 7,
  });
  assert.equal(referenceCardRequest.response.status, 200);
  assert.equal(referenceCardRequest.body.data.referenceCardId, "REF_SEA_02");
  assert.equal(referenceCardRequest.body.data.cards.length, 3);

  const firstAlps = await recommend({ moodId: "alps-ranch" });
  const excludedIds = firstAlps.body.data.recommendations.map(({ place }) => place.place_id);
  const secondAlps = await recommend({ moodId: "alps-ranch", excludeIds: excludedIds });
  assert.equal(secondAlps.response.status, 200);
  assert.equal(secondAlps.body.data.recommendations.length, 3);
  assert.ok(
    secondAlps.body.data.recommendations.every(({ place }) => !excludedIds.includes(place.place_id)),
  );

  const sessionId = "verify-session-0001";
  const firstSessionRecommendation = await recommend({ moodId: "alps-ranch", sessionId });
  assert.equal(firstSessionRecommendation.response.status, 200);
  const firstSessionRequestId = firstSessionRecommendation.body.data.requestId;
  const firstSessionPlaceIds = firstSessionRecommendation.body.data.recommendations
    .map(({ place }) => place.place_id);
  const rerolledSessionRecommendation = await recommend({
    moodId: "alps-ranch",
    sessionId,
    rerollOfRequestId: firstSessionRequestId,
  });
  assert.equal(rerolledSessionRecommendation.response.status, 200);
  assert.notEqual(rerolledSessionRecommendation.body.data.requestId, firstSessionRequestId);
  assert.ok(rerolledSessionRecommendation.body.data.recommendations.every(
    ({ place }) => !firstSessionPlaceIds.includes(place.place_id),
  ));

  const rerollWithoutSession = await recommend({
    moodId: "alps-ranch",
    rerollOfRequestId: firstSessionRequestId,
  });
  assert.equal(rerollWithoutSession.response.status, 400);

  const geocodeWithLoadedKey = await request("/geocode-origin", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: "서울역" }),
  });
  assert.equal(geocodeWithLoadedKey.response.status, 200);
  assert.equal(typeof geocodeWithLoadedKey.body.data.origin.latitude, "number");
  assert.equal(typeof geocodeWithLoadedKey.body.data.origin.longitude, "number");

  const legoland = await request("/places/GOAT-002");
  assert.equal(legoland.response.status, 200);
  assert.equal(legoland.body.data.place.place_name, "레고랜드 코리아 리조트");

  const badMood = await recommend({ moodId: "not-a-mood" });
  assert.equal(badMood.response.status, 400);
  assert.equal(badMood.body.success, false);

  const badRequest = await recommend({
    moodId: "alps-ranch",
    preferences: { transport: "도보" },
  });
  assert.equal(badRequest.response.status, 400);

  const forbiddenDebug = await recommend({ moodId: "alps-ranch", debug: true });
  assert.equal(forbiddenDebug.response.status, 403);
  assert.equal(forbiddenDebug.body.code, "DEBUG_NOT_ALLOWED");

  const disallowedModel = await request("/recommend-course", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      selectedPlaceId: "GOAT-001",
      primaryTheme: "알프스·고원·목장 무드",
      llmModel: "unapproved-expensive-model",
    }),
  });
  assert.equal(disallowedModel.response.status, 400);
  assert.equal(disallowedModel.body.code, "LLM_MODEL_NOT_ALLOWED");

  const maliciousMarkers = encodeURIComponent(JSON.stringify([
    { order: 1, title: "</script><script>window.xss=true</script>", lat: 37.8, lng: 128.8 },
  ]));
  const courseMap = await requestText(
    `/course-map?centerLat=37.8&centerLng=128.8&markers=${maliciousMarkers}`,
  );
  assert.equal(courseMap.response.status, 200);
  assert.ok(!courseMap.body.includes("</script><script>window.xss=true</script>"));
  assert.ok(courseMap.body.includes("\\u003c/script\\u003e"));

  const missingPlace = await request("/places/not-found");
  assert.equal(missingPlace.response.status, 404);
  assert.equal(missingPlace.body.success, false);

  const ktoWithoutKey = await request("/kto?path=KorService2/searchKeyword2");
  assert.equal(ktoWithoutKey.response.status, 500);
  assert.match(ktoWithoutKey.body.error, /service key not configured/i);

  const invalidKtoPageSize = await request("/kto?path=KorService2/searchKeyword2&numOfRows=51");
  assert.equal(invalidKtoPageSize.response.status, 400);

  console.log("API verification passed: 61 places, 7 moods, GOAT reference-card scoring engine.");
} finally {
  server.kill();
}
