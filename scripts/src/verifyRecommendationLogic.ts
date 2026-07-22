import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { recommendGoatPlaces } from "../../lib/travel-domain/src/goatRecommendationEngine";
import {
  createGoatRecommendation,
} from "../../lib/travel-domain/src/recommendationService";
import { InMemoryRecommendationExposureRepository } from "../../lib/travel-domain/src/recommendationExposureRepository";
import type {
  GoatPlace,
  GoatPlaceDataset,
  GoatReferenceCardDataset,
  RecommendRequest,
  RecommendResult,
  RecommendationCard,
  ScoreBreakdown,
} from "../../lib/travel-domain/src/goatRecommendationTypes";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function readJson<T>(relativePath: string): Promise<T> {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8")) as T;
}

const places = await readJson<GoatPlaceDataset>(
  "lib/travel-domain/src/data/goat_simplified_scoring_tags_v10_accessibility_merged.json",
);
const references = await readJson<GoatReferenceCardDataset>(
  "lib/travel-domain/src/data/goat_reference_cards_v2_balanced.json",
);

function run(request: RecommendRequest, dataset: GoatPlaceDataset = places): RecommendResult {
  const result = recommendGoatPlaces(
    { ...request, debug: true, enableWarningLog: false },
    dataset,
    references,
  );
  assert.equal(result.status, "DONE", result.failReason ?? result.message);
  assert.ok(result.resultData, "추천 결과 데이터가 없습니다.");
  return result;
}

function cards(result: RecommendResult): RecommendationCard[] {
  assert.ok(result.resultData);
  return result.resultData.cards;
}

function ids(result: RecommendResult): string[] {
  return cards(result).map((card) => card.placeId);
}

function scoreOf(result: RecommendResult, placeId: string): ScoreBreakdown {
  const scored = result.resultData?.debug?.scoredCandidates.find((candidate) => candidate.placeId === placeId);
  assert.ok(scored, `${placeId}: debug 점수 내역이 없습니다.`);
  return scored.scoreBreakdown;
}

function scoreSnapshot(result: RecommendResult) {
  return result.resultData?.debug?.scoredCandidates.map((candidate) => ({
    placeId: candidate.placeId,
    score: candidate.scoreBreakdown,
  }));
}

function assertCardsValid(result: RecommendResult): void {
  const resultCards = cards(result);
  assert.equal(resultCards.length, 3, "카드 3장을 반환하지 않았습니다.");
  assert.equal(new Set(ids(result)).size, 3, "카드 placeId가 중복됐습니다.");
  const activeIds = new Set(places.places.map((place) => place.place_id));
  for (const card of resultCards) {
    assert.ok(activeIds.has(card.placeId), `운영 데이터 밖 장소가 추천됐습니다: ${card.placeId}`);
    for (const value of [
      card.score.moodScore.total,
      card.score.conditionScore.total,
      card.score.baseScore,
      card.score.originDistanceBonus,
      card.score.routeDistanceBonus,
      card.score.duplicatePenalty,
      card.score.exposurePenalty,
      card.score.coverageBoost,
      card.score.lowExposureBoost,
      card.score.selectionScore,
      card.score.displayScore,
    ]) assert.ok(Number.isFinite(value), `${card.placeId}: finite가 아닌 점수 ${String(value)}`);
    assert.ok(card.score.displayScore >= 0 && card.score.displayScore <= 100, `${card.placeId}: displayScore 범위 오류`);
  }
}

const baseRequest: RecommendRequest = {
  candidatePlaceIds: places.places.map((place) => place.place_id),
  referenceCardId: "REF_SEA_02",
  travelPurpose: "사진·포토스팟",
  transportType: "자차",
  companionType: "혼자",
  currentSeason: "여름",
  currentDate: "2026-07-20",
};

assert.equal(places.places.length, 61, "운영 장소 수가 61개가 아닙니다.");

const base = run(baseRequest);
assertCardsValid(base);
assert.deepEqual(cards(base).map((card) => card.role), [
  "BEST_SCENE",
  "SAME_MOOD_ALTERNATIVE",
  "CONDITION_FIT_ALTERNATIVE",
]);
assert.equal(cards(base)[0].primaryTheme, "바다·해안 무드", "카드 1이 선택 테마와 다릅니다.");
assert.equal(cards(base)[1].primaryTheme, cards(base)[0].primaryTheme, "카드 2가 같은 테마 우선 규칙을 지키지 않았습니다.");
assert.ok(cards(base)[2].purposeTags.includes("사진·포토스팟"), "목적 일치 후보가 있는데 카드 3이 목적 불일치입니다.");
assert.equal(base.resultData?.decisionAudit?.fallback.card3PurposeFallbackUsed, false, "잘못된 카드 3 purpose fallback입니다.");
for (const correction of [
  cards(base)[0].score.originDistanceBonus,
  cards(base)[0].score.routeDistanceBonus,
  cards(base)[0].score.exposurePenalty,
  cards(base)[0].score.coverageBoost,
  cards(base)[0].score.lowExposureBoost,
]) assert.equal(correction, 0, "카드 1에 금지된 거리/노출/coverage 보정이 적용됐습니다.");

const deterministic = run(baseRequest);
assert.deepEqual(
  cards(deterministic).map((card) => [card.placeId, card.score.selectionScore, card.score.displayScore]),
  cards(base).map((card) => [card.placeId, card.score.selectionScore, card.score.displayScore]),
  "같은 입력과 노출 상태에서 결과가 결정적이지 않습니다.",
);

const companionChanged = run({ ...baseRequest, companionType: "가족" });
assert.deepEqual(scoreSnapshot(companionChanged), scoreSnapshot(base), "동행자가 1차 점수에 잘못 반영됐습니다.");
assert.deepEqual(ids(companionChanged), ids(base), "동행자가 1차 추천 카드에 잘못 반영됐습니다.");

const morning = run({ ...baseRequest, visitTime: "오전" });
const night = run({ ...baseRequest, visitTime: "야간" });
assert.deepEqual(scoreSnapshot(morning), scoreSnapshot(night), "visitTime이 1차 점수에 반영됐습니다.");

const changedBestTimeDataset = structuredClone(places);
for (const place of changedBestTimeDataset.places) {
  place.best_time = place.best_time === "오전" ? "야간" : "오전";
}
const changedBestTime = run(baseRequest, changedBestTimeDataset);
assert.deepEqual(scoreSnapshot(changedBestTime), scoreSnapshot(base), "best_time 데이터가 1차 점수에 반영됐습니다.");

const duplicateTagRequest: RecommendRequest = {
  primaryTheme: "바다·해안 무드",
  userMoodTags: ["청량함", "청량함", "청량함"],
  userSceneTags: ["바다", "바다"],
  currentSeason: "여름",
};
const duplicateTags = run(duplicateTagRequest);
const uniqueTags = run({
  ...duplicateTagRequest,
  userMoodTags: ["청량함"],
  userSceneTags: ["바다"],
});
assert.deepEqual(scoreSnapshot(duplicateTags), scoreSnapshot(uniqueTags), "중복 입력 태그가 이중 배점됐습니다.");

const invalidTags = run({
  primaryTheme: "바다·해안 무드",
  userMoodTags: ["존재하지 않는 무드"],
  userSceneTags: ["존재하지 않는 장면"],
});
assert.ok(cards(invalidTags).length === 3, "허용 목록 밖 태그에서 추천이 실패했습니다.");

const directBase: RecommendRequest = {
  candidatePlaceIds: places.places.map((place) => place.place_id),
  primaryTheme: "바다·해안 무드",
  travelPurpose: "사진·포토스팟",
  transportType: "자차",
  currentSeason: "여름",
  currentDate: "2026-07-20",
};
const themeSea = run(directBase);
const themeAlps = run({ ...directBase, primaryTheme: "알프스·고원·목장 무드" });
assert.equal(scoreOf(themeSea, "GOAT-024").moodScore.theme.score, 18);
assert.equal(scoreOf(themeAlps, "GOAT-024").moodScore.theme.score, 0);
assert.notDeepEqual(ids(themeSea), ids(themeAlps), "테마를 바꿔도 추천 카드가 바뀌지 않았습니다.");

const moodMatched = run({ ...directBase, userMoodTags: ["휴양감"] });
const moodUnmatched = run({ ...directBase, userMoodTags: ["로드트립감성"] });
assert.ok(scoreOf(moodMatched, "GOAT-024").moodScore.moodTags.score > scoreOf(moodUnmatched, "GOAT-024").moodScore.moodTags.score);

const sceneMatched = run({ ...directBase, userSceneTags: ["카페"] });
const sceneUnmatched = run({ ...directBase, userSceneTags: ["암석"] });
assert.ok(scoreOf(sceneMatched, "GOAT-024").moodScore.sceneTags.score > scoreOf(sceneUnmatched, "GOAT-024").moodScore.sceneTags.score);

const purposeMatched = run({ ...directBase, travelPurpose: "사진·포토스팟" });
const purposeUnmatched = run({ ...directBase, travelPurpose: "숙소·리조트" });
assert.equal(scoreOf(purposeMatched, "GOAT-024").conditionScore.purpose.score, 20);
assert.equal(scoreOf(purposeUnmatched, "GOAT-024").conditionScore.purpose.score, 0);

const publicTransport = run({ ...directBase, transportType: "대중교통" });
const car = run({ ...directBase, transportType: "자차" });
assert.equal(scoreOf(publicTransport, "GOAT-024").conditionScore.accessibility.score, 12);
assert.equal(scoreOf(car, "GOAT-024").conditionScore.accessibility.score, 7);
assert.equal(scoreOf(publicTransport, "GOAT-030").conditionScore.accessibility.score, 1);
assert.equal(scoreOf(car, "GOAT-030").conditionScore.accessibility.score, 12);

const summer = run({ ...directBase, primaryTheme: "알프스·고원·목장 무드", currentSeason: "여름" });
const winter = run({ ...directBase, primaryTheme: "알프스·고원·목장 무드", currentSeason: "겨울" });
assert.equal(scoreOf(summer, "GOAT-015").conditionScore.season.score, 13);
assert.equal(scoreOf(winter, "GOAT-015").conditionScore.season.score, 0);
assert.equal(scoreOf(summer, "GOAT-014").conditionScore.season.score, 0);
assert.equal(scoreOf(winter, "GOAT-014").conditionScore.season.score, 13);

const fromGangneung = run({
  ...directBase,
  origin: { type: "region", latitude: 37.7519, longitude: 128.8761, regionName: "강릉" },
  routeDistanceEnabled: true,
});
const fromSokcho = run({
  ...directBase,
  origin: { type: "region", latitude: 38.207, longitude: 128.5918, regionName: "속초" },
  routeDistanceEnabled: true,
});
assert.notEqual(
  scoreOf(fromGangneung, "GOAT-024").originDistanceBonus,
  scoreOf(fromSokcho, "GOAT-024").originDistanceBonus,
  "출발지를 바꿔도 originDistanceBonus가 바뀌지 않았습니다.",
);
assert.equal(cards(fromGangneung)[0].score.originDistanceBonus, 0, "카드 1에 출발지 거리가 반영됐습니다.");
assert.ok(cards(fromGangneung).slice(1).some((card) => card.score.originDistanceBonus > 0), "카드 2·3에 출발지 근접 보너스가 반영되지 않았습니다.");

const emptyExposure = run({ ...baseRequest, totalExposureByPlaceId: {} });
assert.ok(
  emptyExposure.resultData?.debug?.scoredCandidates.every((candidate) => candidate.scoreBreakdown.lowExposureBoost === 0),
  "빈 누적 노출 이력에서 모든 후보가 저노출 보너스를 받습니다.",
);

const firstIds = ids(base);
const recentExposureByPlaceId = Object.fromEntries(firstIds.map((placeId) => [placeId, 1]));
const totalExposureByPlaceId = { ...recentExposureByPlaceId };
const withExposure = run({ ...baseRequest, recentExposureByPlaceId, totalExposureByPlaceId });
for (const placeId of firstIds) {
  assert.equal(scoreOf(withExposure, placeId).exposurePenalty, 1, `${placeId}: 최근 노출 페널티 누락`);
}
assert.ok(
  withExposure.resultData?.debug?.scoredCandidates.some((candidate) => candidate.scoreBreakdown.lowExposureBoost === 3),
  "실제 노출 편차가 있는데 저노출 후보 보너스가 적용되지 않았습니다.",
);

const reroll = run({ ...baseRequest, excludePlaceIds: firstIds });
assert.equal(ids(reroll).filter((placeId) => firstIds.includes(placeId)).length, 0, "다시 추천에서 직전 카드가 제외되지 않았습니다.");

function controlledPlace(source: GoatPlace, index: number): GoatPlace {
  return {
    ...structuredClone(source),
    place_id: `CONTROL-${index}`,
    place_name: `통제 장소 ${index}`,
    primaryTheme: "바다·해안 무드",
    mood_tags: ["청량함"],
    sceneTags: ["바다"],
    place_type: "해변",
    photo_point: "바다",
    purpose_tags: ["사진·포토스팟"],
    season_tags: ["사계절"],
    accessibility: { public_transport: "중", car: "중", walk: (["상", "중", "하"] as const)[index - 1] },
    latitude: 37 + index * 0.01,
    longitude: 127 + index * 0.01,
    operatingCondition: undefined,
  };
}

const walkFixture: GoatPlaceDataset = {
  ...structuredClone(places),
  places: places.places.slice(0, 3).map((place, index) => controlledPlace(place, index + 1)),
  pending_places: [],
};
const explicitWalk = run({ primaryTheme: "바다·해안 무드", transportType: "도보중심" }, walkFixture);
for (const [index, expected] of [12, 7, 1].entries()) {
  const score = scoreOf(explicitWalk, `CONTROL-${index + 1}`).conditionScore.accessibility;
  assert.equal(score.score, expected, `accessibility.walk ${["상", "중", "하"][index]} 배점 오류`);
  assert.equal(score.inferred, false, "명시적 accessibility.walk 값을 추정값으로 덮어썼습니다.");
}

const inferredWalkFixture = structuredClone(walkFixture);
const inferenceCases = [
  { placeType: "해안산책로", sceneTags: ["바다", "해안산책로"], expected: 12 },
  { placeType: "리조트/숙소", sceneTags: ["정원", "리조트"], expected: 7 },
  { placeType: "고원/풍력발전", sceneTags: ["고원", "풍력발전기"], expected: 1 },
];
inferredWalkFixture.places.forEach((place, index) => {
  delete place.accessibility.walk;
  place.place_type = inferenceCases[index].placeType;
  place.sceneTags = inferenceCases[index].sceneTags;
});
const inferredWalk = run({ primaryTheme: "바다·해안 무드", transportType: "도보중심" }, inferredWalkFixture);
inferenceCases.forEach(({ expected }, index) => {
  const score = scoreOf(inferredWalk, `CONTROL-${index + 1}`).conditionScore.accessibility;
  assert.equal(score.score, expected, `도보중심 추정 ${index + 1} 배점 오류`);
  assert.equal(score.inferred, true, "walk 원천 필드 누락 상태가 추정으로 표시되지 않았습니다.");
});

const noPurposeFixture = structuredClone(walkFixture);
for (const place of noPurposeFixture.places) place.purpose_tags = ["사진·포토스팟"];
const purposeFallback = run({
  primaryTheme: "바다·해안 무드",
  travelPurpose: "숙소·리조트",
}, noPurposeFixture);
assert.equal(purposeFallback.resultData?.decisionAudit?.fallback.card3PurposeFallbackUsed, true);
assert.ok(purposeFallback.resultData?.warnings.some((warning) => warning.code === "CARD3_PURPOSE_FALLBACK"));

const repository = new InMemoryRecommendationExposureRepository();
const serviceTestNow = new Date();
const serviceFirst = await createGoatRecommendation({
  body: baseRequest,
  context: { requestId: "REQ-COVERAGE-1", sessionId: "SESSION-COVERAGE", now: serviceTestNow },
  placesDataset: places,
  referenceDataset: references,
  exposureRepository: repository,
});
assert.equal(serviceFirst.resultData?.requestId, "REQ-COVERAGE-1");
assert.equal(repository.getRecords().length, 3, "첫 추천 노출 3건이 누적되지 않았습니다.");

const serviceReroll = await createGoatRecommendation({
  body: { ...baseRequest, rerollOfRequestId: "REQ-COVERAGE-1" },
  context: {
    requestId: "REQ-COVERAGE-2",
    sessionId: "SESSION-COVERAGE",
    now: new Date(serviceTestNow.getTime() + 60_000),
  },
  placesDataset: places,
  referenceDataset: references,
  exposureRepository: repository,
});
assert.equal(repository.getRecords().length, 6, "다시 추천 노출 3건이 누적되지 않았습니다.");
assert.equal(
  (serviceReroll.resultData?.cards ?? []).filter((card) => (serviceFirst.resultData?.cards ?? []).some((first) => first.placeId === card.placeId)).length,
  0,
  "service reroll이 직전 requestId의 카드 3개를 제외하지 않았습니다.",
);
const accumulatedStats = await repository.getExposureStats({ sessionId: "SESSION-COVERAGE" });
assert.equal(Object.values(accumulatedStats.totalExposureByPlaceId).reduce<number>((sum, count) => sum + (count ?? 0), 0), 6);

console.log(JSON.stringify({
  status: "PASS",
  places: places.places.length,
  scorePolicy: {
    primaryTheme: 18,
    moodTags: { one: 6, two: 12, threeOrMore: 17 },
    sceneTags: { one: 5, twoOrMore: 10 },
    purpose: 20,
    accessibility: { "상": 12, "중": 7, "하": 1, invalid: 0 },
    season: { current: 13, allSeason: 10, none: 0 },
    originDistanceBonus: { max: 10, cards: [2, 3] },
    routeDistanceBonus: { max: 10, cards: [2, 3] },
    duplicatePenalty: { maxObservedRule: 6, card: 2 },
    recentExposurePenalty: { max: 5, cards: [2, 3] },
    coverageBoost: { points: 3, cards: [2, 3] },
    lowExposureBoost: { max: 3, cards: [2, 3] },
    bestTime: 0,
    companion: 0,
    placeType: "tie-break only (0 base points)",
  },
  verified: [
    "card roles and uniqueness",
    "finite bounded scores",
    "deterministic tie-break",
    "best_time excluded",
    "companion excluded",
    "tag deduplication and invalid tag fallback",
    "theme/mood/scene/purpose/transport/season sensitivity",
    "departure sensitivity on cards 2 and 3",
    "explicit and inferred walk accessibility",
    "empty and accumulated exposure behavior",
    "reroll exclusion and exposure persistence service",
    "card 3 purpose fallback audit",
  ],
}, null, 2));
