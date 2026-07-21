import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function readJson(response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  return body;
}

async function getJson(baseUrl, path, timeoutMs = 10_000) {
  const response = await fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(timeoutMs) });
  return readJson(response);
}

async function postJson(baseUrl, path, body, timeoutMs = 75_000) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  return readJson(response);
}

async function timed(action) {
  const startedAt = Date.now();
  const value = await action();
  return { value, latencyMs: Date.now() - startedAt };
}

async function waitForServer(baseUrl) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/healthz`, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return;
    } catch {
      // Build is already complete; the child only needs a short startup window.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("LIVE_SMOKE_SERVER_START_TIMEOUT");
}

const port = await findAvailablePort();
assert.ok(port);
const baseUrl = `http://127.0.0.1:${port}/api`;
const resultDirectory = new URL("../reports/", import.meta.url);
const resultFile = new URL("external-live-verification.json", resultDirectory);
await mkdir(resultDirectory, { recursive: true });
await rm(resultFile, { force: true });
const server = spawn(process.execPath, ["--enable-source-maps", "./dist/index.mjs"], {
  cwd: new URL("..", import.meta.url),
  env: {
    ...process.env,
    PORT: String(port),
    NODE_ENV: "development",
    ALLOW_RECOMMENDATION_DEBUG: "true",
    KAKAO_ROUTE_CANDIDATE_LIMIT: "1",
    COURSE_RATE_LIMIT_MAX: "100",
    RECOMMEND_RATE_LIMIT_MAX: "100",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
// Drain structured server logs so a long external request cannot fill the
// child's pipe and stall the verification process.
server.stdout?.resume();
server.stderr?.resume();

try {
  await waitForServer(baseUrl);

  const health = await timed(() => getJson(baseUrl, "/healthz"));
  const sessionId = `live-smoke-${Date.now()}`;
  const initial = await postJson(baseUrl, "/recommend-from-tags", {
    moodId: "forest-garden-rest",
    sessionId,
  });
  const initialIds = initial.data.recommendations.map(({ place }) => place.place_id);
  const reroll = await postJson(baseUrl, "/recommend-from-tags", {
    moodId: "forest-garden-rest",
    sessionId,
    rerollOfRequestId: initial.data.requestId,
  });
  const rerollIds = reroll.data.recommendations.map(({ place }) => place.place_id);

  const geocode = await timed(() => postJson(baseUrl, "/geocode-origin", { query: "서울역" }, 20_000));
  const route = await timed(() => postJson(baseUrl, "/recommend-from-tags", {
    moodId: "forest-garden-rest",
    sessionId,
    travelPurpose: "산책·힐링",
    transportType: "자차",
    origin: geocode.value.data.origin,
  }, 60_000));
  const routeSources = route.value.data.recommendations
    .map(({ routeInfo }) => routeInfo?.source)
    .filter(Boolean);

  const selectedPlaceId = "GOAT-055";
  const selectedPlace = await getJson(baseUrl, `/places/${selectedPlaceId}`);
  const primaryTheme = selectedPlace.data.place.primaryTheme ?? selectedPlace.data.place.primary_mood;
  const course = await timed(() => postJson(baseUrl, "/recommend-course", {
    selectedPlaceId,
    primaryTheme,
    companionType: "친구",
    travelPurpose: "산책·힐링",
    transportType: "자차",
    radiusMeters: 3_000,
    maxCandidatesForLlm: 12,
    debug: true,
  }));
  const courseData = course.value.data;
  const diagnostics = courseData.debug?.tourApiDiagnostics;
  const candidatesPassedToLlm = courseData.debug?.candidatesPassedToLlm ?? [];
  const candidateIds = candidatesPassedToLlm.map(({ id }) => id);
  const stopIds = courseData.stops.map(({ id }) => id);
  const ktoCandidateExamples = candidatesPassedToLlm
    .filter(({ source }) => source === "VISITKOREA_CONTENT_LAB" || source === "TOUR_API")
    .slice(0, 3)
    .map(({ id, title }) => ({ id, title }));
  const sourceCounts = Object.entries(
    candidatesPassedToLlm.reduce((counts, candidate) => {
      const source = candidate.source ?? "UNKNOWN";
      counts[source] = (counts[source] ?? 0) + 1;
      return counts;
    }, {}),
  ).map(([source, count]) => `${source}:${count}`);

  const newPlaces = [];
  for (let number = 55; number <= 61; number += 1) {
    const placeId = `GOAT-${String(number).padStart(3, "0")}`;
    const detail = await getJson(baseUrl, `/places/${placeId}`);
    const place = detail.data.place;
    const fallbackCourse = await postJson(baseUrl, "/recommend-course", {
      selectedPlaceId: placeId,
      primaryTheme: place.primaryTheme ?? place.primary_mood,
      forceRuleBasedFallback: true,
    }, 20_000);
    newPlaces.push({
      placeId,
      coordinatesFinite: Number.isFinite(place.lat) && Number.isFinite(place.lng),
      status: fallbackCourse.data.status,
      stopCount: fallbackCourse.data.stops.length,
      mapProvider: fallbackCourse.data.staticMap.provider,
      markerCount: fallbackCourse.data.staticMap.staticMapConfig?.markers?.length ?? 0,
    });
  }

  // This command is a live verification gate, not an informational demo.
  // Any fallback masquerading as an external success must terminate non-zero.
  assert.equal(health.value.status, "ok", "health endpoint must report ok");
  assert.match(initial.data.requestId, /^REQ_\d+_[A-Z0-9]+$/);
  assert.match(reroll.data.requestId, /^REQ_\d+_[A-Z0-9]+$/);
  assert.notEqual(initial.data.requestId, reroll.data.requestId);
  assert.equal(initialIds.length, 3);
  assert.equal(rerollIds.length, 3);
  assert.ok(rerollIds.every((placeId) => !initialIds.includes(placeId)), "reroll must exclude prior exposure");
  assert.ok(Number.isFinite(geocode.value.data.origin.latitude));
  assert.ok(Number.isFinite(geocode.value.data.origin.longitude));
  assert.ok(routeSources.includes("KAKAO_ROUTE"), "at least one live Kakao route must succeed");
  assert.ok((diagnostics?.successfulRequestCount ?? 0) > 0, "KTO must return a successful request");
  assert.ok((diagnostics?.filteredCandidateCount ?? 0) > 0, "KTO must return nearby candidates");
  assert.ok(candidatesPassedToLlm.length > 0, "KTO candidates must reach the LLM");
  assert.equal(new Set(candidateIds).size, candidateIds.length, "candidate IDs must be unique");
  assert.equal(courseData.status, "DONE");
  assert.equal(courseData.mode, "LLM_OPENROUTER", "OpenRouter fallback is not a live success");
  assert.equal(courseData.debug?.llmHttpStatus, 200);
  assert.equal(courseData.debug?.llmRequestedModel, courseData.debug?.llmModel);
  assert.equal(new Set(stopIds).size, stopIds.length, "course stop IDs must be unique");
  const allowedStopIds = new Set([selectedPlaceId, ...candidateIds]);
  assert.ok(stopIds.every((id) => allowedStopIds.has(id)), "course stops must use supplied IDs");
  assert.equal(ktoCandidateExamples.length, 3, "three real KTO place examples are required");
  assert.equal(courseData.staticMap.provider, "KAKAO_JS_SDK_STATIC_MAP");
  assert.ok((courseData.staticMap.staticMapConfig?.markers?.length ?? 0) > 0);
  assert.equal(courseData.staticMap.staticMapConfig?.markers?.length, courseData.stops.length);
  assert.ok(newPlaces.every(({ coordinatesFinite, status, markerCount }) => (
    coordinatesFinite && status === "DONE" && markerCount > 0
  )));

  const summary = {
    verification: "PASS",
    generatedAt: new Date().toISOString(),
    health: { status: health.value.status, latencyMs: health.latencyMs },
    exposureContract: {
      requestIdPresent: Boolean(initial.data.requestId),
      requestIdsDistinct: initial.data.requestId !== reroll.data.requestId,
      previousCardsExcluded: rerollIds.every((placeId) => !initialIds.includes(placeId)),
      initialCount: initialIds.length,
      rerollCount: rerollIds.length,
    },
    kakaoGeocode: {
      httpStatus: 200,
      latencyMs: geocode.latencyMs,
      source: geocode.value.data.source,
      coordinatesFinite: Number.isFinite(geocode.value.data.origin.latitude)
        && Number.isFinite(geocode.value.data.origin.longitude),
    },
    kakaoRoute: {
      apiHttpStatus: 200,
      totalLatencyMs: route.latencyMs,
      recommendationCount: route.value.data.recommendations.length,
      actualRouteCount: routeSources.filter((source) => source === "KAKAO_ROUTE").length,
      fallbackRouteCount: routeSources.filter((source) => source === "HAVERSINE").length,
      originStatus: route.value.data.originStatus,
      warnings: route.value.data.warnings ?? [],
    },
    ktoNearby: {
      httpStatuses: diagnostics?.httpStatuses ?? [],
      latencyMs: diagnostics?.latencyMs,
      requestCount: diagnostics?.requestCount,
      successfulRequestCount: diagnostics?.successfulRequestCount,
      failedRequestCount: diagnostics?.failedRequestCount,
      rawCandidateCount: diagnostics?.rawCandidateCount,
      filteredCandidateCount: diagnostics?.filteredCandidateCount,
      coordinateCandidateCount: diagnostics?.coordinateCandidateCount,
      candidatesPassedToLlm: courseData.nearbyCandidateCount,
      candidateSources: sourceCounts,
      actualPlaceExamples: ktoCandidateExamples,
    },
    llm: {
      courseHttpStatus: 200,
      totalCourseLatencyMs: course.latencyMs,
      mode: courseData.mode,
      requestedModel: courseData.debug?.llmRequestedModel,
      actualModel: courseData.debug?.llmModel,
      modelMatched: courseData.debug?.llmRequestedModel === courseData.debug?.llmModel,
      llmHttpStatus: courseData.debug?.llmHttpStatus,
      llmLatencyMs: courseData.debug?.llmLatencyMs,
      attempts: courseData.debug?.llmAttempts,
      errorCode: courseData.debug?.llmError,
      stopCount: courseData.stops.length,
      uniqueStopCount: new Set(courseData.stops.map(({ id }) => id)).size,
      warnings: courseData.warnings,
    },
    map: {
      provider: courseData.staticMap.provider,
      markerCount: courseData.staticMap.staticMapConfig?.markers?.length ?? 0,
      fallbackUrlPresent: Boolean(courseData.staticMap.fallbackMapSearchUrl),
    },
    newPlaces,
  };

  const serializedSummary = `${JSON.stringify(summary, null, 2)}\n`;
  await writeFile(resultFile, serializedSummary, "utf8");
  console.log(serializedSummary.trimEnd());
} finally {
  server.kill();
  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 2_000);
    server.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}
