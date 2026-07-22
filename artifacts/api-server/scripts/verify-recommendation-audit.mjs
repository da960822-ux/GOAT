import assert from "node:assert/strict";

const entry = new URL("../src/lib/recommendation-audit.ts", import.meta.url);
const auditModule = await import(entry.href);

const validScore = {
  moodScore: {
    total: 35,
    theme: {
      requested: "sea",
      placeTheme: "sea",
      matched: true,
      score: 18,
    },
    moodTags: {
      requested: ["calm"],
      matched: ["calm"],
      count: 1,
      score: 6,
    },
    sceneTags: {
      requested: ["coast"],
      matched: ["coast"],
      count: 1,
      score: 5,
    },
    placeTypeHint: { matchedHints: [], score: 0, note: "hint only" },
  },
  conditionScore: {
    total: 32,
    purpose: {
      requested: "rest",
      placePurposeTags: ["rest"],
      matched: true,
      score: 20,
    },
    accessibility: {
      transportType: "car",
      grade: "high",
      score: 12,
    },
    season: {
      requested: "summer",
      placeSeasonTags: [],
      matchType: "none",
      score: 0,
    },
  },
  baseScore: 67,
  routeDistanceBonus: 8,
  duplicatePenalty: 3,
  exposurePenalty: 2,
  coverageBoost: 3,
  lowExposureBoost: 1,
  selectionScore: 74,
  displayScore: 72,
};

const normalizedLegacyScore = {
  ...validScore,
  originDistanceBonus: 0,
  originDistanceSource: "NONE",
  routeDistanceSource: "NONE",
};

assert.deepEqual(
  auditModule.safeParsePersistedRecommendationScore(validScore),
  normalizedLegacyScore,
  "legacy v1 score must be normalized for v2 readers",
);

const validV2Score = {
  ...validScore,
  originDistanceKm: 42.5,
  originDistanceSource: "HAVERSINE",
  originDistanceBonus: 6,
  routeDistanceKm: 18.2,
  routeDurationMin: 31,
  routeDistanceSource: "KAKAO_ROUTE",
  selectionScore: 80,
};
assert.deepEqual(
  auditModule.safeParsePersistedRecommendationScore(validV2Score),
  validV2Score,
  "valid v2 score must pass runtime validation",
);

assert.equal(
  auditModule.safeParsePersistedRecommendationScore({
    ...validScore,
    duplicatePenalty: -3,
  }),
  null,
  "penalties must be stored as non-negative magnitudes",
);

assert.deepEqual(auditModule.toPublicScoreSummary(normalizedLegacyScore), {
  moodScore: 35,
  conditionScore: 32,
  baseScore: 67,
  originDistanceBonus: 0,
  routeDistanceBonus: 8,
  duplicatePenalty: 3,
  exposurePenalty: 2,
  coverageBoost: 3,
  lowExposureBoost: 1,
  selectionScore: 74,
  displayScore: 72,
});

assert.throws(
  () =>
    auditModule.parseRecommendationDecisionAudit({
      schemaVersion: 2,
      policyVersion: "goat-score-v1",
      candidateCount: 10,
      fallback: { card3PurposeFallbackUsed: false },
      cardSelections: [],
    }),
  "unknown audit schema versions must be rejected",
);

console.log("Recommendation audit runtime verification passed.");
