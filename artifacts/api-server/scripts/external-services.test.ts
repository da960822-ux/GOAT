import assert from "node:assert/strict";
import test from "node:test";
import {
  callOpenRouterCoursePlanner,
  validateLlmCoursePlannerJson,
} from "../../../lib/travel-domain/src/openRouterCourseLlm";
import { fetchVisitKoreaContentLabNearbyCandidates } from "../../../lib/travel-domain/src/tourApiClient";
import {
  createGoatDayCourse,
  sortCourseStopsByNearestNeighbor,
} from "../../../lib/travel-domain/src/courseRecommendationService";
import { buildKakaoStaticMapResult } from "../../../lib/travel-domain/src/kakaoStaticMap";
import { InMemoryRecommendationExposureRepository } from "../../../lib/travel-domain/src/recommendationExposureRepository";

const originalFetch = globalThis.fetch;

const selectedPlace = {
  place_id: "GOAT-TEST-1",
  place_name: "테스트 대표 장소",
  city: "춘천",
  region_group: "영서",
  primaryTheme: "숲·정원·자연휴식 무드",
  place_type: "정원",
  photo_point: "호숫가",
  recommendation_use: "테스트",
  purpose_tags: ["산책·힐링"],
  season_tags: ["사계절"],
  accessibility: { car: "상", public_transport: "중", walk: "상" },
  latitude: 37.88,
  longitude: 127.73,
};

const validLlmJson = {
  courseTitle: "테스트 하루 코스",
  summary: "대표 장소와 카페를 잇는 코스",
  selectedCandidateIds: ["candidate-1"],
  stops: [
    {
      id: selectedPlace.place_id,
      title: selectedPlace.place_name,
      category: "START_PLACE",
      stayMinutes: 60,
      reason: "선택 장소",
    },
    {
      id: "candidate-1",
      title: "테스트 카페",
      category: "CAFE",
      stayMinutes: 45,
      reason: "휴식",
    },
  ],
  routeNote: "가까운 순서",
};

test.after(() => {
  globalThis.fetch = originalFetch;
});

test("LLM structured output rejects unknown and duplicate candidate IDs", { concurrency: false }, () => {
  const parsed = validateLlmCoursePlannerJson(validLlmJson, {
    selectedPlaceId: selectedPlace.place_id,
    candidateIds: ["candidate-1"],
  });
  assert.deepEqual(parsed.selectedCandidateIds, ["candidate-1"]);
  const normalized = validateLlmCoursePlannerJson({
    ...validLlmJson,
    selectedCandidateIds: [selectedPlace.place_id, "candidate-1"],
  }, {
    selectedPlaceId: selectedPlace.place_id,
    candidateIds: ["candidate-1"],
  });
  assert.deepEqual(normalized.selectedCandidateIds, ["candidate-1"]);

  assert.throws(
    () => validateLlmCoursePlannerJson(
      { ...validLlmJson, selectedCandidateIds: ["not-a-candidate"] },
      { selectedPlaceId: selectedPlace.place_id, candidateIds: ["candidate-1"] },
    ),
    /LLM_SCHEMA_UNKNOWN_CANDIDATE_ID/,
  );
  assert.throws(
    () => validateLlmCoursePlannerJson(
      { ...validLlmJson, stops: [...validLlmJson.stops, validLlmJson.stops[1]] },
      { selectedPlaceId: selectedPlace.place_id, candidateIds: ["candidate-1"] },
    ),
    /LLM_SCHEMA_DUPLICATE_STOP_ID/,
  );
});

test("OpenRouter request retries 429 and sends bounded JSON-mode output", { concurrency: false }, async () => {
  process.env.OPENROUTER_API_KEY = "test-openrouter-key";
  process.env.OPENROUTER_MAX_ATTEMPTS = "2";
  process.env.OPENROUTER_RETRY_DELAY_MS = "0";
  let calls = 0;
  let requestPayload: Record<string, unknown> | undefined;
  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    calls += 1;
    requestPayload = JSON.parse(String(init?.body ?? "{}"));
    if (calls === 1) {
      return { ok: false, status: 429, text: async () => "rate limited" } as Response;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        model: "openai/gpt-4o-mini-2024-07-18",
        choices: [{ message: { content: JSON.stringify(validLlmJson) } }],
      }),
    } as Response;
  }) as typeof fetch;

  const result = await callOpenRouterCoursePlanner({
    selectedPlace: selectedPlace as never,
    conditions: { primaryTheme: selectedPlace.primaryTheme },
    candidates: [{ id: "candidate-1", title: "테스트 카페", category: "CAFE" }],
  });
  assert.equal(calls, 2);
  assert.equal(requestPayload?.max_tokens, 1200);
  assert.deepEqual(requestPayload?.response_format, { type: "json_object" });
  assert.equal(result.httpStatus, 200);
  assert.equal(result.attempts, 2);
  assert.equal(result.requestedModel, "openai/gpt-4o-mini");
  assert.equal(result.model, "openai/gpt-4o-mini-2024-07-18");
});

test("VisitKorea client tolerates one failed content type and avoids double-encoding keys", { concurrency: false }, async () => {
  process.env.VISITKOREA_SERVICE_KEY = "encoded%2Fkey";
  process.env.KTO_SERVICE_KEY = "";
  let calls = 0;
  let diagnostics: import("../../../lib/travel-domain/src/tourApiClient").VisitKoreaNearbyDiagnostics | undefined;
  globalThis.fetch = (async (input: string | URL | Request) => {
    calls += 1;
    const url = new URL(String(input));
    assert.equal(url.searchParams.get("serviceKey"), "encoded/key");
    const contentTypeId = url.searchParams.get("contentTypeId");
    if (contentTypeId === "14") {
      return { ok: false, status: 503 } as Response;
    }
    const rows = contentTypeId === "12"
      ? { contentid: "candidate-1", title: "호수 공원", contenttypeid: "12", dist: "100" }
      : contentTypeId === "28"
        ? [{ contentid: "candidate-1", title: "호수 공원", contenttypeid: "28", dist: "120" }]
        : contentTypeId === "38"
          ? [{ contentid: "far-market", title: "먼 시장", contenttypeid: "38", dist: "5000" }]
          : [{ contentid: "candidate-2", title: "테스트 카페", contenttypeid: "39", dist: "250" }];
    return {
      ok: true,
      status: 200,
      json: async () => ({
        response: { header: { resultCode: "0000" }, body: { items: { item: rows } } },
      }),
    } as Response;
  }) as typeof fetch;

  const result = await fetchVisitKoreaContentLabNearbyCandidates({
    mapX: 127.73,
    mapY: 37.88,
    radiusMeters: 3000,
    maxResults: 20,
    onDiagnostics: (value) => {
      diagnostics = value;
    },
  });
  assert.equal(calls, 5);
  assert.deepEqual(result.map(({ id }) => id), ["candidate-1", "candidate-2"]);
  assert.equal(result[1].category, "CAFE");
  assert.equal(diagnostics?.successfulRequestCount, 4);
  assert.equal(diagnostics?.failedRequestCount, 1);
  assert.equal(diagnostics?.filteredCandidateCount, 2);
});

test("VisitKorea client fails cleanly when every content type fails", { concurrency: false }, async () => {
  process.env.VISITKOREA_SERVICE_KEY = "test-service-key";
  globalThis.fetch = (async () => ({ ok: false, status: 503 })) as typeof fetch;
  await assert.rejects(
    fetchVisitKoreaContentLabNearbyCandidates({ mapX: 127.73, mapY: 37.88 }),
    /VISITKOREA_OPENAPI_HTTP_503/,
  );
});

test("course stops keep the representative first and use nearest-neighbour order", { concurrency: false }, () => {
  const ordered = sortCourseStopsByNearestNeighbor([
    { order: 1, id: "start", title: "start", type: "START_PLACE", category: "START_PLACE", lat: 37, lng: 127, stayMinutes: 60, reason: "start" },
    { order: 2, id: "far", title: "far", type: "TOUR", category: "TOUR", lat: 37.3, lng: 127, stayMinutes: 40, reason: "far" },
    { order: 3, id: "near", title: "near", type: "TOUR", category: "TOUR", lat: 37.01, lng: 127, stayMinutes: 40, reason: "near" },
    { order: 4, id: "middle", title: "middle", type: "TOUR", category: "TOUR", lat: 37.02, lng: 127, stayMinutes: 40, reason: "middle" },
  ]);
  assert.deepEqual(ordered.map(({ id }) => id), ["start", "near", "middle", "far"]);
  assert.deepEqual(ordered.map(({ order }) => order), [1, 2, 3, 4]);
});

test("REST key is never embedded in client-side Kakao map configuration", { concurrency: false }, () => {
  process.env.KAKAO_JAVASCRIPT_KEY = "";
  process.env.KAKAO_MAP_KEY = "";
  process.env.KAKAO_REST_API_KEY = "server-only-secret";
  const map = buildKakaoStaticMapResult([
    { order: 1, id: "start", title: "start", type: "START_PLACE", category: "START_PLACE", lat: 37, lng: 127, stayMinutes: 60, reason: "start" },
  ], "start");
  assert.equal(map.provider, "KAKAO_MAP_SEARCH");
  assert.ok(!JSON.stringify(map).includes("server-only-secret"));
});

test("forced fallback bypasses both VisitKorea and OpenRouter", { concurrency: false }, async () => {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    throw new Error("network must not be called");
  }) as typeof fetch;
  const dataset = {
    places: [
      selectedPlace,
      { ...selectedPlace, place_id: "GOAT-TEST-2", place_name: "가까운 카페", place_type: "카페", latitude: 37.881, longitude: 127.731 },
      { ...selectedPlace, place_id: "GOAT-TEST-3", place_name: "산책 공원", place_type: "공원", latitude: 37.89, longitude: 127.74 },
    ],
  };
  const result = await createGoatDayCourse({
    selectedPlaceId: selectedPlace.place_id,
    primaryTheme: selectedPlace.primaryTheme,
    forceRuleBasedFallback: true,
  }, dataset as never);
  assert.equal(calls, 0);
  assert.equal(result.mode, "RULE_BASED_FALLBACK");
  assert.ok(result.stops.length >= 2);
});

test("invalid LLM output degrades to a rule-based course instead of failing the request", { concurrency: false }, async () => {
  process.env.OPENROUTER_API_KEY = "test-openrouter-key";
  globalThis.fetch = (async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      model: "openai/gpt-4o-mini",
      choices: [{ message: { content: JSON.stringify({
        ...validLlmJson,
        selectedCandidateIds: ["invented-place"],
      }) } }],
    }),
  })) as typeof fetch;
  const result = await createGoatDayCourse({
    selectedPlaceId: selectedPlace.place_id,
    primaryTheme: selectedPlace.primaryTheme,
    nearbyCandidates: [{ id: "candidate-1", title: "테스트 카페", category: "CAFE", mapX: 127.731, mapY: 37.881 }],
  }, { places: [selectedPlace] } as never);
  assert.equal(result.status, "DONE");
  assert.equal(result.mode, "RULE_BASED_FALLBACK");
  assert.ok(result.warnings.some((warning) => warning.includes("OpenRouter")));
});

test("LLM failure matrix always returns the rule-based service fallback", { concurrency: false }, async () => {
  process.env.OPENROUTER_MAX_ATTEMPTS = "2";
  process.env.OPENROUTER_RETRY_DELAY_MS = "0";
  const dataset = { places: [selectedPlace] };
  const baseRequest = {
    selectedPlaceId: selectedPlace.place_id,
    primaryTheme: selectedPlace.primaryTheme,
    nearbyCandidates: [
      { id: "candidate-1", title: "테스트 카페", category: "CAFE", mapX: 127.731, mapY: 37.881 },
    ],
    debug: true,
  };

  const cases: Array<{
    name: string;
    expectedError: RegExp;
    expectedCalls: number;
    missingKey?: boolean;
    response?: () => Promise<Response>;
  }> = [
    {
      name: "missing key",
      expectedError: /OPENROUTER_API_KEY_MISSING/,
      expectedCalls: 0,
      missingKey: true,
    },
    {
      name: "invalid key 401",
      expectedError: /OPENROUTER_HTTP_401/,
      expectedCalls: 1,
      response: async () => ({ ok: false, status: 401, text: async () => "unauthorized" } as Response),
    },
    {
      name: "timeout",
      expectedError: /OPENROUTER_TIMEOUT/,
      expectedCalls: 2,
      response: async () => {
        const error = new Error("timed out");
        error.name = "TimeoutError";
        throw error;
      },
    },
    {
      name: "500 after retry",
      expectedError: /OPENROUTER_HTTP_500/,
      expectedCalls: 2,
      response: async () => ({ ok: false, status: 500, text: async () => "server error" } as Response),
    },
    {
      name: "empty response",
      expectedError: /OPENROUTER_EMPTY_RESPONSE/,
      expectedCalls: 1,
      response: async () => ({ ok: true, status: 200, json: async () => ({ choices: [] }) } as Response),
    },
    {
      name: "non JSON response",
      expectedError: /LLM_JSON_PARSE_FAILED/,
      expectedCalls: 1,
      response: async () => ({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: "not-json" } }] }),
      } as Response),
    },
    {
      name: "missing required schema field",
      expectedError: /LLM_SCHEMA_SUMMARY_REQUIRED/,
      expectedCalls: 1,
      response: async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ ...validLlmJson, summary: undefined }) } }],
        }),
      } as Response),
    },
    {
      name: "oversized response",
      expectedError: /OPENROUTER_RESPONSE_TOO_LARGE/,
      expectedCalls: 1,
      response: async () => ({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: "x".repeat(50_001) } }] }),
      } as Response),
    },
  ];

  for (const failureCase of cases) {
    if (failureCase.missingKey) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = "test-openrouter-key";
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      if (!failureCase.response) throw new Error("fetch must not be called");
      return failureCase.response();
    }) as typeof fetch;

    const result = await createGoatDayCourse(baseRequest as never, dataset as never);
    assert.equal(result.status, "DONE", failureCase.name);
    assert.equal(result.mode, "RULE_BASED_FALLBACK", failureCase.name);
    assert.match(result.debug?.llmError ?? "", failureCase.expectedError, failureCase.name);
    assert.equal(calls, failureCase.expectedCalls, failureCase.name);
  }
  process.env.OPENROUTER_API_KEY = "test-openrouter-key";
});

test("in-memory exposure repository scopes rerolls to the originating session", { concurrency: false }, async () => {
  const repository = new InMemoryRecommendationExposureRepository();
  await repository.saveExposures({
    requestId: "REQ_TEST_SESSION_A",
    sessionId: "session-a-0001",
    referenceCardId: "REF_ALPS_01",
    cards: [
      { placeId: "GOAT-001", rankNo: 1 },
      { placeId: "GOAT-002", rankNo: 2 },
      { placeId: "GOAT-003", rankNo: 3 },
    ],
  });
  assert.deepEqual(
    await repository.findPlaceIdsByRequestId("REQ_TEST_SESSION_A", { sessionId: "session-a-0001" }),
    ["GOAT-001", "GOAT-002", "GOAT-003"],
  );
  assert.deepEqual(
    await repository.findPlaceIdsByRequestId("REQ_TEST_SESSION_A", { sessionId: "session-b-0001" }),
    [],
  );
  assert.deepEqual(
    (await repository.getExposureStats({})).recentExposureByPlaceId,
    {},
  );
});
