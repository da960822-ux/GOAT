import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { recommendGoatPlaces } from "../../lib/travel-domain/src/goatRecommendationEngine";
import type {
  GoatPlaceDataset,
  GoatReferenceCardDataset,
  RecommendRequest,
  RecommendResult,
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
const candidatePlaceIds = places.places.map((place) => place.place_id);

function run(request: RecommendRequest): RecommendResult {
  const result = recommendGoatPlaces({
    ...request,
    candidatePlaceIds,
    debug: true,
    enableWarningLog: false,
  }, places, references);
  assert.equal(result.status, "DONE", result.failReason ?? result.message);
  assert.equal(result.resultData?.cards.length, 3);
  return result;
}

function cardIds(result: RecommendResult): string[] {
  return result.resultData?.cards.map((card) => card.placeId) ?? [];
}

function score(result: RecommendResult, placeId: string): ScoreBreakdown {
  const candidate = result.resultData?.debug?.scoredCandidates.find((item) => item.placeId === placeId);
  assert.ok(candidate, `${placeId}: debug candidate 누락`);
  return candidate.scoreBreakdown;
}

function rank(result: RecommendResult, placeId: string): number {
  const value = result.resultData?.debug?.scoredCandidates.findIndex((item) => item.placeId === placeId) ?? -1;
  assert.notEqual(value, -1, `${placeId}: debug rank 누락`);
  return value + 1;
}

function snapshot(result: RecommendResult) {
  return result.resultData?.debug?.scoredCandidates.map((candidate) => ({
    placeId: candidate.placeId,
    score: candidate.scoreBreakdown.selectionScore,
  }));
}

function comparison(before: RecommendResult, after: RecommendResult, placeId: string) {
  const project = (value: ScoreBreakdown) => ({
    theme: value.moodScore.theme.score,
    moodTags: value.moodScore.moodTags.score,
    sceneTags: value.moodScore.sceneTags.score,
    purpose: value.conditionScore.purpose.score,
    accessibility: value.conditionScore.accessibility.score,
    season: value.conditionScore.season.score,
    originDistanceBonus: value.originDistanceBonus,
    routeDistanceBonus: value.routeDistanceBonus,
    exposurePenalty: value.exposurePenalty,
    lowExposureBoost: value.lowExposureBoost,
    selectionScore: value.selectionScore,
  });
  return {
    trackedPlaceId: placeId,
    beforeCards: cardIds(before),
    afterCards: cardIds(after),
    beforeRank: rank(before, placeId),
    afterRank: rank(after, placeId),
    beforeScore: project(score(before, placeId)),
    afterScore: project(score(after, placeId)),
  };
}

const baselineRequest: RecommendRequest = {
  primaryTheme: "바다·해안 무드",
  userMoodTags: ["청량함"],
  userSceneTags: ["바다"],
  travelPurpose: "사진·포토스팟",
  transportType: "자차",
  companionType: "혼자",
  currentSeason: "여름",
  currentDate: "2026-07-20",
  origin: { type: "region", latitude: 37.7519, longitude: 128.8761, regionName: "강릉" },
  routeDistanceEnabled: true,
};

const baseline = run(baselineRequest);
const themeChanged = run({ ...baselineRequest, primaryTheme: "알프스·고원·목장 무드" });
const moodChanged = run({ ...baselineRequest, userMoodTags: ["레트로"] });
const sceneChanged = run({ ...baselineRequest, userSceneTags: ["암석"] });
const purposeChanged = run({ ...baselineRequest, travelPurpose: "숙소·리조트" });
const transportChanged = run({ ...baselineRequest, transportType: "대중교통" });
const companionChanged = run({ ...baselineRequest, companionType: "가족" });
const seasonChanged = run({ ...baselineRequest, currentSeason: "겨울", currentDate: "2026-01-20" });
const departureChanged = run({
  ...baselineRequest,
  origin: { type: "region", latitude: 38.207, longitude: 128.5918, regionName: "속초" },
});

const baselineIds = cardIds(baseline);
const recentExposureByPlaceId = Object.fromEntries(baselineIds.map((placeId) => [placeId, 1]));
const exposureChanged = run({
  ...baselineRequest,
  recentExposureByPlaceId,
  totalExposureByPlaceId: { ...recentExposureByPlaceId },
});
const retryChanged = run({ ...baselineRequest, excludePlaceIds: baselineIds });

assert.notDeepEqual(cardIds(themeChanged), cardIds(baseline), "테마 변경이 카드에 반영되지 않았습니다.");
assert.notEqual(score(themeChanged, "GOAT-024").moodScore.theme.score, score(baseline, "GOAT-024").moodScore.theme.score);
assert.notEqual(score(moodChanged, "GOAT-024").moodScore.moodTags.score, score(baseline, "GOAT-024").moodScore.moodTags.score);
assert.notEqual(score(sceneChanged, "GOAT-024").moodScore.sceneTags.score, score(baseline, "GOAT-024").moodScore.sceneTags.score);
assert.notEqual(score(purposeChanged, "GOAT-024").conditionScore.purpose.score, score(baseline, "GOAT-024").conditionScore.purpose.score);
assert.notEqual(score(transportChanged, "GOAT-024").conditionScore.accessibility.score, score(baseline, "GOAT-024").conditionScore.accessibility.score);
assert.deepEqual(snapshot(companionChanged), snapshot(baseline), "동행자가 1차 점수에 영향을 줬습니다.");
assert.deepEqual(cardIds(companionChanged), cardIds(baseline), "동행자가 1차 카드에 영향을 줬습니다.");
assert.notEqual(score(seasonChanged, "GOAT-041").conditionScore.season.score, score(baseline, "GOAT-041").conditionScore.season.score);
assert.notEqual(score(departureChanged, "GOAT-024").originDistanceBonus, score(baseline, "GOAT-024").originDistanceBonus);
assert.ok(baselineIds.some((placeId) => score(exposureChanged, placeId).exposurePenalty > 0), "최근 노출 페널티가 반영되지 않았습니다.");
assert.equal(cardIds(retryChanged).filter((placeId) => baselineIds.includes(placeId)).length, 0, "재추천에서 직전 카드가 남았습니다.");

const observations = {
  primaryTheme: comparison(baseline, themeChanged, "GOAT-024"),
  moodTags: comparison(baseline, moodChanged, "GOAT-024"),
  sceneTags: comparison(baseline, sceneChanged, "GOAT-024"),
  travelPurpose: comparison(baseline, purposeChanged, "GOAT-024"),
  transportType: comparison(baseline, transportChanged, "GOAT-024"),
  companionType: {
    beforeCards: cardIds(baseline),
    afterCards: cardIds(companionChanged),
    scoreChanged: JSON.stringify(snapshot(companionChanged)) !== JSON.stringify(snapshot(baseline)),
    expectedPolicy: "1차 점수 미반영",
  },
  season: comparison(baseline, seasonChanged, "GOAT-041"),
  departure: comparison(baseline, departureChanged, "GOAT-024"),
  exposureHistory: comparison(baseline, exposureChanged, baselineIds[0]),
  retry: {
    beforeCards: baselineIds,
    afterCards: cardIds(retryChanged),
    overlap: cardIds(retryChanged).filter((placeId) => baselineIds.includes(placeId)),
  },
};

console.log(JSON.stringify({
  status: "PASS",
  policy: "동행자는 1차 점수 미반영, 나머지 지정 요인은 관련 breakdown 또는 재추천 제외에 반영",
  observations,
}, null, 2));

if (process.argv.includes("--write-report")) {
  const reportDir = path.join(root, "reports");
  await mkdir(reportDir, { recursive: true });
  const cardsText = (values: string[]) => values.join(" → ");
  const report = `# 조건 변경 민감도 보고서

- 상태: PASS
- 방식: 한 번에 한 조건만 바꾸는 OFAT
- 후보: 운영 61개 전체
- 기준 입력: 바다·해안 무드 / 청량함 / 바다 / 사진·포토스팟 / 자차 / 혼자 / 여름 / 강릉
- 동행자 정책: 1차 추천 점수 미반영

| 변경 요인 | 추적 장소 | 관련 점수 전 → 후 | 순위 전 → 후 | 카드 전 | 카드 후 | 판정 |
|---|---|---:|---:|---|---|---|
| primaryTheme | GOAT-024 | theme ${observations.primaryTheme.beforeScore.theme} → ${observations.primaryTheme.afterScore.theme} | ${observations.primaryTheme.beforeRank} → ${observations.primaryTheme.afterRank} | ${cardsText(observations.primaryTheme.beforeCards)} | ${cardsText(observations.primaryTheme.afterCards)} | PASS |
| mood_tags | GOAT-024 | mood ${observations.moodTags.beforeScore.moodTags} → ${observations.moodTags.afterScore.moodTags} | ${observations.moodTags.beforeRank} → ${observations.moodTags.afterRank} | ${cardsText(observations.moodTags.beforeCards)} | ${cardsText(observations.moodTags.afterCards)} | PASS |
| sceneTags | GOAT-024 | scene ${observations.sceneTags.beforeScore.sceneTags} → ${observations.sceneTags.afterScore.sceneTags} | ${observations.sceneTags.beforeRank} → ${observations.sceneTags.afterRank} | ${cardsText(observations.sceneTags.beforeCards)} | ${cardsText(observations.sceneTags.afterCards)} | PASS |
| travelPurpose | GOAT-024 | purpose ${observations.travelPurpose.beforeScore.purpose} → ${observations.travelPurpose.afterScore.purpose} | ${observations.travelPurpose.beforeRank} → ${observations.travelPurpose.afterRank} | ${cardsText(observations.travelPurpose.beforeCards)} | ${cardsText(observations.travelPurpose.afterCards)} | PASS |
| transportType | GOAT-024 | accessibility ${observations.transportType.beforeScore.accessibility} → ${observations.transportType.afterScore.accessibility} | ${observations.transportType.beforeRank} → ${observations.transportType.afterRank} | ${cardsText(observations.transportType.beforeCards)} | ${cardsText(observations.transportType.afterCards)} | PASS |
| companionType | 전체 | 점수 변경 ${observations.companionType.scoreChanged} | 동일 | ${cardsText(observations.companionType.beforeCards)} | ${cardsText(observations.companionType.afterCards)} | PASS(정책대로 미반영) |
| season | GOAT-041 | season ${observations.season.beforeScore.season} → ${observations.season.afterScore.season} | ${observations.season.beforeRank} → ${observations.season.afterRank} | ${cardsText(observations.season.beforeCards)} | ${cardsText(observations.season.afterCards)} | PASS |
| departure | GOAT-024 | originDistanceBonus ${observations.departure.beforeScore.originDistanceBonus} → ${observations.departure.afterScore.originDistanceBonus} | ${observations.departure.beforeRank} → ${observations.departure.afterRank} | ${cardsText(observations.departure.beforeCards)} | ${cardsText(observations.departure.afterCards)} | PASS |
| exposure history | ${observations.exposureHistory.trackedPlaceId} | exposurePenalty ${observations.exposureHistory.beforeScore.exposurePenalty} → ${observations.exposureHistory.afterScore.exposurePenalty} | ${observations.exposureHistory.beforeRank} → ${observations.exposureHistory.afterRank} | ${cardsText(observations.exposureHistory.beforeCards)} | ${cardsText(observations.exposureHistory.afterCards)} | PASS |
| retry | 전체 | 직전 카드 중복 ${observations.retry.overlap.length} | - | ${cardsText(observations.retry.beforeCards)} | ${cardsText(observations.retry.afterCards)} | PASS |

출발지는 카드 1 점수에는 적용하지 않고 카드 2·3의 originDistanceBonus에만 반영합니다. 카드 1 기준 연계 거리는 별도 routeDistanceBonus로 유지됩니다. 모든 계산은 결정적이며 random 점수를 사용하지 않습니다.
`;
  await writeFile(path.join(reportDir, "condition-sensitivity-report.md"), report, "utf8");
}
