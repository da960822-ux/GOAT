import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [
  schema,
  routes,
  travelRoutes,
  openapi,
  recommendationStore,
  visitConcentration,
] = await Promise.all([
  readFile(
    new URL("../../../lib/db/src/schema/index.ts", import.meta.url),
    "utf8",
  ),
  readFile(new URL("../src/routes/index.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/routes/travel.ts", import.meta.url), "utf8"),
  readFile(
    new URL("../../../lib/api-spec/openapi.yaml", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL("../src/lib/recommendation-store.ts", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL("../src/lib/kto-visit-concentration.ts", import.meta.url),
    "utf8",
  ),
]);

for (const table of [
  "recommendation_sessions",
  "recommendation_requests",
  "recommendation_session_places",
  "recommendation_session_warnings",
  "recommended_courses",
  "recommendation_feedback",
]) {
  assert.match(
    schema,
    new RegExp(`"${table}"`),
    `missing schema table ${table}`,
  );
}

for (const schemaField of [
  'policyVersion: text("policy_version")',
  'decisionAudit: jsonb("decision_audit")',
  'originStatus: text("origin_status")',
  'moodScore: integer("mood_score")',
  'originDistanceBonus: integer("origin_distance_bonus")',
  'routeInfo: jsonb("route_info")',
  'cautions: jsonb("cautions")',
]) {
  assert.ok(
    schema.includes(schemaField),
    `missing audit schema field ${schemaField}`,
  );
}

for (const routerName of [
  "bookmarksRouter",
  "feedbackRouter",
  "recommendationsRouter",
]) {
  assert.match(
    routes,
    new RegExp(`router\\.use\\(${routerName}\\)`),
    `missing router ${routerName}`,
  );
}

for (const path of [
  "/recommendations:",
  "/recommendations/recent:",
  "/bookmarks:",
  "/recommendations/{recommendationId}/places/{placeId}/feedback:",
]) {
  assert.ok(openapi.includes(path), `missing OpenAPI path ${path}`);
}

for (const component of [
  "RecommendationScoreSummary:",
  "RecommendationScoreDetails:",
  "RecommendationCardResponse:",
]) {
  assert.ok(
    openapi.includes(component),
    `missing typed OpenAPI component ${component}`,
  );
}

for (const responseField of [
  "scoreSummary:",
  "scoreDetails:",
  "reasons:",
  "cautions:",
]) {
  assert.ok(
    openapi.includes(responseField),
    `missing recommendation response field ${responseField}`,
  );
}

assert.ok(
  !openapi.includes("/analyze-image"),
  "photo analysis endpoint must be removed",
);
assert.ok(
  recommendationStore.includes("getVisitConcentration("),
  "recommendation responses must enrich cards with current visit concentration",
);
assert.ok(
  !recommendationStore.includes("crowd: null"),
  "recommendation crowd must not be hard-coded to null",
);
assert.ok(travelRoutes.includes('res.setHeader("Deprecation", "true")'));
assert.ok(travelRoutes.includes('rel="successor-version"'));
assert.ok(
  recommendationStore.includes("safeParsePersistedRecommendationScore"),
  "persisted recommendation score JSON must be runtime-validated",
);
assert.ok(
  recommendationStore.includes("decisionAudit"),
  "recommendation decision audit must be persisted",
);
assert.ok(
  visitConcentration.includes("TatsCnctrRateService/tatsCnctrRatedList"),
  "KTO visit concentration endpoint must remain connected",
);
console.log("Persistence contract verification passed.");
