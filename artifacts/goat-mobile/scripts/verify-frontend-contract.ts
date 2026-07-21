import assert from "node:assert/strict";
import {
  buildRecommendationRequest,
  createRecommendationSessionId,
  getRecommendationRequestId,
  isSafeRecommendationId,
} from "../src/services/recommendationRequest";
import type { TravelPreferences } from "../src/types/preferences";

const base: TravelPreferences = {
  companion: "친구",
  transport: "도보중심",
  visitTime: "일몰",
  purpose: "먹거리·야간탐방",
  season: "겨울",
};

const request = buildRecommendationRequest({
  moodId: "retro-market-harbor",
  preferences: base,
  origin: { type: "region", latitude: 37.5665, longitude: 126.978, regionName: "서울특별시" },
  excludeIds: ["GOAT-001", "GOAT-002", "GOAT-003"],
  sessionId: "goat_session_1234",
  rerollOfRequestId: "REQ_12345678",
});

assert.equal(request.travelPurpose, "먹거리·야간탐방");
assert.equal(request.transportType, "도보중심");
assert.equal(request.visitTime, "저녁");
assert.equal(request.currentMonth, 1);
assert.equal(request.preferences?.companion, "친구");
assert.equal(request.preferences?.purpose, "가볍게 산책");
assert.deepEqual(request.origin, {
  type: "region",
  latitude: 37.5665,
  longitude: 126.978,
  regionName: "서울특별시",
});
assert.deepEqual(request.excludeIds, ["GOAT-001", "GOAT-002", "GOAT-003"]);
assert.equal(request.sessionId, "goat_session_1234");
assert.equal(request.rerollOfRequestId, "REQ_12345678");

const withoutOptionalValues = buildRecommendationRequest({
  moodId: "sea-coast",
  preferences: {
    companion: "혼자",
    transport: "자차",
    visitTime: null,
    purpose: "사진·포토스팟",
    season: null,
  },
  origin: null,
});

assert.equal(withoutOptionalValues.visitTime, undefined);
assert.equal(withoutOptionalValues.currentMonth, undefined);
assert.equal(withoutOptionalValues.origin, undefined);

const generatedSessionIds = Array.from({ length: 100 }, () => createRecommendationSessionId());
assert.equal(new Set(generatedSessionIds).size, generatedSessionIds.length);
assert.ok(generatedSessionIds.every(isSafeRecommendationId));
assert.equal(getRecommendationRequestId({ requestId: "REQ_12345678" }), "REQ_12345678");
assert.equal(getRecommendationRequestId({ requestId: "bad id" }), null);

console.log("Frontend recommendation contract verification passed.");
