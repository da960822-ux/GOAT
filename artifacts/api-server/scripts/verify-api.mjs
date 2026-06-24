import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";

const port = 43129;
const baseUrl = `http://127.0.0.1:${port}/api`;
const expectedTop3 = {
  "california-coast": ["GOAT-031", "GOAT-044", "GOAT-040"],
  "japan-small-town": ["GOAT-029", "GOAT-037", "GOAT-032"],
  "alps-meadow": ["GOAT-017", "GOAT-018", "GOAT-019"],
  "ryokan-lodging": ["GOAT-007", "GOAT-008", "GOAT-033"],
  "rainy-canyon": ["GOAT-058", "GOAT-010", "GOAT-057"],
  "nordic-winter": ["GOAT-012", "GOAT-020", "GOAT-024"],
  "retro-night-market": ["GOAT-043", "GOAT-038", "GOAT-035"],
  "plateau-stars": ["GOAT-030", "GOAT-016", "GOAT-023"],
  "bali-surf": ["GOAT-044", "GOAT-045", "GOAT-047"],
  "europe-garden": ["GOAT-001", "GOAT-013", "GOAT-050"],
  "lake-reflection": ["GOAT-014", "GOAT-036", "GOAT-040"],
  "japan-retro-cafe": ["GOAT-042", "GOAT-054", "GOAT-006"],
};

const server = spawn(process.execPath, ["--enable-source-maps", "./dist/index.mjs"], {
  cwd: new URL("..", import.meta.url),
  env: { ...process.env, PORT: String(port), KTO_SERVICE_KEY: "" },
  stdio: ["ignore", "pipe", "pipe"],
});

async function request(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = await response.json();
  return { response, body };
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
    await readFile(new URL("../../../lib/travel-domain/src/data/places.json", import.meta.url)),
  );
  assert.equal(places.length, 58);
  assert.equal(new Set(places.map(({ placeId }) => placeId)).size, 58);
  assert.ok(places.some(({ placeId, name }) => placeId === "GOAT-002" && name.includes("레고랜드")));

  const moodsResult = await request("/moods");
  assert.equal(moodsResult.response.status, 200);
  assert.equal(moodsResult.body.data.moods.length, 12);
  assert.deepEqual(
    moodsResult.body.data.moods.map(({ id }) => id),
    Object.keys(expectedTop3),
  );

  for (const mood of moodsResult.body.data.moods) {
    const result = await recommend({ moodId: mood.id });
    assert.equal(result.response.status, 200, mood.id);
    assert.equal(result.body.data.seedPoolSize, 58, mood.id);
    assert.ok([43, 58].includes(result.body.data.candidatePoolSize), mood.id);
    assert.equal(result.body.data.recommendations.length, 3, mood.id);
    const ids = result.body.data.recommendations.map(({ place }) => place.place_id);
    assert.equal(new Set(ids).size, 3, mood.id);
    assert.deepEqual(ids, expectedTop3[mood.id], mood.id);
    assert.ok(result.body.data.appliedTags.length >= mood.keywords.length, mood.id);
    for (const recommendation of result.body.data.recommendations) {
      assert.ok(Array.isArray(recommendation.matchedTags));
      assert.equal(typeof recommendation.score, "number");
      assert.equal(typeof recommendation.scoreBreakdown.tag, "number");
      assert.ok(!("distanceKm" in recommendation));
    }
  }

  const conditioned = await recommend({
    moodId: "alps-meadow",
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
  for (const recommendation of conditioned.body.data.recommendations) {
    assert.notEqual(recommendation.scoreBreakdown.companion, 0);
    assert.notEqual(recommendation.scoreBreakdown.travelPurpose, 0);
    assert.notEqual(recommendation.scoreBreakdown.transport, 0);
    assert.ok(!("distanceKm" in recommendation));
  }

  const firstAlps = await recommend({ moodId: "alps-meadow" });
  const excludedIds = firstAlps.body.data.recommendations.map(({ place }) => place.place_id);
  const secondAlps = await recommend({ moodId: "alps-meadow", excludeIds: excludedIds });
  assert.equal(secondAlps.response.status, 200);
  assert.equal(secondAlps.body.data.recommendations.length, 3);
  assert.ok(
    secondAlps.body.data.recommendations.every(({ place }) => !excludedIds.includes(place.place_id)),
  );

  const legoland = await request("/places/GOAT-002");
  assert.equal(legoland.response.status, 200);
  assert.equal(legoland.body.data.place.place_name, "레고랜드 코리아 리조트");

  const badMood = await recommend({ moodId: "not-a-mood" });
  assert.equal(badMood.response.status, 400);
  assert.equal(badMood.body.success, false);

  const badRequest = await recommend({
    moodId: "alps-meadow",
    preferences: { transport: "도보" },
  });
  assert.equal(badRequest.response.status, 400);

  const missingPlace = await request("/places/not-found");
  assert.equal(missingPlace.response.status, 404);
  assert.equal(missingPlace.body.success, false);

  const ktoWithoutKey = await request("/kto?path=KorService2/searchKeyword2");
  assert.equal(ktoWithoutKey.response.status, 500);
  assert.match(ktoWithoutKey.body.error, /service key not configured/i);

  console.log("API verification passed: 58 places, 12 moods, v1.3+ Top 3 and condition scores.");
} finally {
  server.kill();
}
