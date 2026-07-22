import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { recommendGoatPlaces } from "../../lib/travel-domain/src/goatRecommendationEngine";
import type {
  GoatPlaceDataset,
  GoatReferenceCard,
  GoatReferenceCardDataset,
  RecommendRequest,
  RecommendationCard,
} from "../../lib/travel-domain/src/goatRecommendationTypes";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const includeAllReferenceCards = process.argv.includes("--all-reference-cards");
const includeRows = process.argv.includes("--rows");
const writeReports = process.argv.includes("--write-reports");

/** recommendationService의 실제 moodId -> referenceCardId 매핑과 동일한 7개 UI 진입점. */
const UI_REFERENCE_CARD_IDS = new Set([
  "REF_SEA_02",
  "REF_JP_02",
  "REF_ALPS_01",
  "REF_NATURE_01",
  "REF_RETRO_01",
  "REF_ARCH_01",
  "REF_RESORT_02",
]);

async function readJson<T>(relativePath: string): Promise<T> {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8")) as T;
}

type Departure = {
  id: string;
  origin: RecommendRequest["origin"];
};

type Trigger = {
  referenceCardId: string;
  primaryTheme: string;
  moodTags: string[];
  sceneTags: string[];
  travelPurpose: string;
  transportType: string;
  companionType: string;
  season: string;
  currentDate: string;
  departure: string;
  exposureState: "none" | "recent";
  retry: boolean;
};

type PlaceCoverage = {
  total: number;
  cards: [number, number, number];
  firstTrigger?: Trigger;
  bestTrigger?: Trigger;
  maxSelectionScore: number;
  bestRank?: number;
  themes: Set<string>;
  purposes: Set<string>;
  transports: Set<string>;
  seasons: Set<string>;
  departures: Set<string>;
};

type LargeScaleAuditCounters = {
  totalTests: number;
  successTests: number;
  failedTests: number;
  thrownErrors: number;
  threeCardFailureTests: number;
  duplicatePlaceTests: number;
  duplicateCardOccurrences: number;
  unknownPlaceIdOccurrences: number;
  nanScoreValues: number;
  infinityScoreValues: number;
  undefinedScoreValues: number;
  outOfRangeScoreValues: number;
  card3PurposeFallbackTests: number;
  card1ThemeMismatchTests: number;
  card1ThemeMismatchWithEligibleThemeTests: number;
  wrongPurposeFallbackTests: number;
  missingCoordinateCardAppearances: number;
  missingImageCardAppearances: number;
  missingCoordinatePlaceIds: Set<string>;
  missingImagePlaceIds: Set<string>;
  errorMessages: string[];
};

const auditCounters: LargeScaleAuditCounters = {
  totalTests: 0,
  successTests: 0,
  failedTests: 0,
  thrownErrors: 0,
  threeCardFailureTests: 0,
  duplicatePlaceTests: 0,
  duplicateCardOccurrences: 0,
  unknownPlaceIdOccurrences: 0,
  nanScoreValues: 0,
  infinityScoreValues: 0,
  undefinedScoreValues: 0,
  outOfRangeScoreValues: 0,
  card3PurposeFallbackTests: 0,
  card1ThemeMismatchTests: 0,
  card1ThemeMismatchWithEligibleThemeTests: 0,
  wrongPurposeFallbackTests: 0,
  missingCoordinateCardAppearances: 0,
  missingImageCardAppearances: 0,
  missingCoordinatePlaceIds: new Set<string>(),
  missingImagePlaceIds: new Set<string>(),
  errorMessages: [],
};

const SCORE_RANGES: Record<string, readonly [number, number]> = {
  "moodScore.total": [0, 45],
  "moodScore.theme.score": [0, 18],
  "moodScore.moodTags.score": [0, 17],
  "moodScore.sceneTags.score": [0, 10],
  "moodScore.placeTypeHint.score": [0, 3],
  "conditionScore.total": [0, 45],
  "conditionScore.purpose.score": [0, 20],
  "conditionScore.accessibility.score": [0, 12],
  "conditionScore.season.score": [0, 13],
  baseScore: [0, 90],
  originDistanceBonus: [0, 10],
  routeDistanceBonus: [0, 10],
  duplicatePenalty: [0, 6],
  exposurePenalty: [0, 5],
  coverageBoost: [0, 3],
  lowExposureBoost: [0, 3],
  selectionScore: [-11, 116],
  displayScore: [0, 100],
};

const purposes = [
  "사진·포토스팟",
  "산책·힐링",
  "카페·실내휴식",
  "전시·건축관람",
  "체험·액티비티",
  "먹거리·야간탐방",
  "숙소·리조트",
] as const;
const transports = ["자차", "대중교통", "도보중심"] as const;
const companions = ["혼자", "친구", "연인", "가족"] as const;
const seasons = [
  { value: "봄", date: "2026-05-20" },
  { value: "여름", date: "2026-07-20" },
  { value: "가을", date: "2026-10-20" },
  { value: "겨울", date: "2026-01-20" },
] as const;
const departures: Departure[] = [
  { id: "none", origin: { type: "skip" } },
  { id: "seoul", origin: { type: "region", latitude: 37.5665, longitude: 126.978, regionName: "서울" } },
  { id: "chuncheon", origin: { type: "region", latitude: 37.8813, longitude: 127.7298, regionName: "춘천" } },
  { id: "wonju", origin: { type: "region", latitude: 37.3422, longitude: 127.9202, regionName: "원주" } },
  { id: "gangneung", origin: { type: "region", latitude: 37.7519, longitude: 128.8761, regionName: "강릉" } },
  { id: "sokcho", origin: { type: "region", latitude: 38.207, longitude: 128.5918, regionName: "속초" } },
  { id: "pyeongchang", origin: { type: "region", latitude: 37.3705, longitude: 128.3903, regionName: "평창" } },
];

function selectedIds(cards: RecommendationCard[]): string[] {
  return cards.map((card) => card.placeId);
}

function exposureFrom(cards: RecommendationCard[]): Pick<
  RecommendRequest,
  "recentExposureByPlaceId" | "totalExposureByPlaceId"
> {
  const recentExposureByPlaceId: Record<string, number> = {};
  const totalExposureByPlaceId: Record<string, number> = {};
  for (const card of cards) {
    recentExposureByPlaceId[card.placeId] = 1;
    totalExposureByPlaceId[card.placeId] = 1;
  }
  return { recentExposureByPlaceId, totalExposureByPlaceId };
}

function scoreValues(card: RecommendationCard): Array<[string, unknown]> {
  return [
    ["moodScore.total", card.score.moodScore.total],
    ["moodScore.theme.score", card.score.moodScore.theme.score],
    ["moodScore.moodTags.score", card.score.moodScore.moodTags.score],
    ["moodScore.sceneTags.score", card.score.moodScore.sceneTags.score],
    ["moodScore.placeTypeHint.score", card.score.moodScore.placeTypeHint.score],
    ["conditionScore.total", card.score.conditionScore.total],
    ["conditionScore.purpose.score", card.score.conditionScore.purpose.score],
    ["conditionScore.accessibility.score", card.score.conditionScore.accessibility.score],
    ["conditionScore.season.score", card.score.conditionScore.season.score],
    ["baseScore", card.score.baseScore],
    ["originDistanceBonus", card.score.originDistanceBonus],
    ["routeDistanceBonus", card.score.routeDistanceBonus],
    ["duplicatePenalty", card.score.duplicatePenalty],
    ["exposurePenalty", card.score.exposurePenalty],
    ["coverageBoost", card.score.coverageBoost],
    ["lowExposureBoost", card.score.lowExposureBoost],
    ["selectionScore", card.score.selectionScore],
    ["displayScore", card.score.displayScore],
  ];
}

function auditCards(
  cards: RecommendationCard[],
  normalizedPrimaryTheme: string | undefined,
  activeIds: Set<string>,
  placeById: Map<string, GoatPlaceDataset["places"][number]>,
): void {
  if (cards.length !== 3) auditCounters.threeCardFailureTests += 1;
  const uniqueCount = new Set(selectedIds(cards)).size;
  if (uniqueCount !== cards.length) {
    auditCounters.duplicatePlaceTests += 1;
    auditCounters.duplicateCardOccurrences += cards.length - uniqueCount;
  }

  if (normalizedPrimaryTheme && cards[0] && cards[0].primaryTheme !== normalizedPrimaryTheme) {
    auditCounters.card1ThemeMismatchTests += 1;
  }

  for (const card of cards) {
    if (!activeIds.has(card.placeId)) auditCounters.unknownPlaceIdOccurrences += 1;
    const place = placeById.get(card.placeId);
    if (!place || !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) {
      auditCounters.missingCoordinateCardAppearances += 1;
      auditCounters.missingCoordinatePlaceIds.add(card.placeId);
    }
    if (typeof card.imageUrl !== "string" || card.imageUrl.trim().length === 0) {
      auditCounters.missingImageCardAppearances += 1;
      auditCounters.missingImagePlaceIds.add(card.placeId);
    }

    for (const [name, value] of scoreValues(card)) {
      if (value === undefined) {
        auditCounters.undefinedScoreValues += 1;
        continue;
      }
      if (typeof value !== "number") {
        auditCounters.outOfRangeScoreValues += 1;
        continue;
      }
      if (Number.isNaN(value)) {
        auditCounters.nanScoreValues += 1;
        continue;
      }
      if (!Number.isFinite(value)) {
        auditCounters.infinityScoreValues += 1;
        continue;
      }
      const [minimum, maximum] = SCORE_RANGES[name];
      if (value < minimum || value > maximum) auditCounters.outOfRangeScoreValues += 1;
    }
  }
}

function recordCards(
  cards: RecommendationCard[],
  coverage: Map<string, PlaceCoverage>,
  trigger: Trigger,
  scenarioIds: Set<string>,
): void {
  cards.forEach((card, index) => {
    const current = coverage.get(card.placeId);
    assert.ok(current, `coverage map에 없는 장소: ${card.placeId}`);
    current.total += 1;
    current.cards[index] += 1;
    current.firstTrigger ??= trigger;
    current.bestRank = Math.min(current.bestRank ?? Number.POSITIVE_INFINITY, index + 1);
    if (card.score.selectionScore > current.maxSelectionScore) {
      current.maxSelectionScore = card.score.selectionScore;
      current.bestTrigger = trigger;
    }
    current.themes.add(trigger.primaryTheme);
    current.purposes.add(trigger.travelPurpose);
    current.transports.add(trigger.transportType);
    current.seasons.add(trigger.season);
    current.departures.add(trigger.departure);
    scenarioIds.add(card.placeId);
  });
}

function runRecommendation(
  request: RecommendRequest,
  places: GoatPlaceDataset,
  references: GoatReferenceCardDataset,
  activeIds: Set<string>,
  placeById: Map<string, GoatPlaceDataset["places"][number]>,
): RecommendationCard[] {
  auditCounters.totalTests += 1;
  let result;
  try {
    result = recommendGoatPlaces(
      { ...request, debug: false, enableWarningLog: false },
      places,
      references,
    );
  } catch (error) {
    auditCounters.failedTests += 1;
    auditCounters.thrownErrors += 1;
    if (auditCounters.errorMessages.length < 10) {
      auditCounters.errorMessages.push(error instanceof Error ? error.message : String(error));
    }
    return [];
  }

  if (result.status !== "DONE") {
    auditCounters.failedTests += 1;
    if (auditCounters.errorMessages.length < 10) {
      auditCounters.errorMessages.push(result.failReason ?? result.message);
    }
    return [];
  }
  auditCounters.successTests += 1;
  const cards = result.resultData?.cards ?? [];
  const normalizedPrimaryTheme = result.resultData?.request.primaryTheme;
  auditCards(cards, normalizedPrimaryTheme, activeIds, placeById);
  const decisionAudit = result.resultData?.decisionAudit;
  const firstSelectionAudit = decisionAudit?.cardSelections.find(({ rank }) => rank === 1);
  if (
    normalizedPrimaryTheme
    && cards[0]
    && cards[0].primaryTheme !== normalizedPrimaryTheme
    && firstSelectionAudit?.candidatePool.name === "primaryTheme 일치 후보"
  ) {
    auditCounters.card1ThemeMismatchWithEligibleThemeTests += 1;
  }
  const fallbackAudit = decisionAudit?.fallback;
  if (fallbackAudit?.card3PurposeFallbackUsed) {
    auditCounters.card3PurposeFallbackTests += 1;
    if ((fallbackAudit.strictPurposePoolSize ?? 0) > 0) {
      auditCounters.wrongPurposeFallbackTests += 1;
    }
  }
  return cards;
}

function triggerFor(
  card: GoatReferenceCard,
  travelPurpose: string,
  transportType: string,
  companionType: string,
  season: string,
  currentDate: string,
  departure: string,
  exposureState: Trigger["exposureState"],
  retry: boolean,
): Trigger {
  return {
    referenceCardId: card.referenceCardId,
    primaryTheme: String(card.primaryTheme),
    moodTags: card.mood_tags,
    sceneTags: card.sceneTags,
    travelPurpose,
    transportType,
    companionType,
    season,
    currentDate,
    departure,
    exposureState,
    retry,
  };
}

const places = await readJson<GoatPlaceDataset>(
  "lib/travel-domain/src/data/goat_simplified_scoring_tags_v10_accessibility_merged.json",
);
const references = await readJson<GoatReferenceCardDataset>(
  "lib/travel-domain/src/data/goat_reference_cards_v2_balanced.json",
);
const activeIds = new Set(places.places.map((place) => place.place_id));
const placeById = new Map(places.places.map((place) => [place.place_id, place]));
assert.equal(places.places.length, 61, "운영 장소 수가 61개가 아닙니다.");
assert.equal(activeIds.size, 61, "운영 장소 place_id가 중복됐습니다.");
assert.equal(new Set(places.places.map((place) => place.place_name)).size, 61, "운영 장소 place_name이 중복됐습니다.");
const selectedReferenceCards = includeAllReferenceCards
  ? references.reference_cards
  : references.reference_cards.filter((card) => UI_REFERENCE_CARD_IDS.has(card.referenceCardId));
assert.equal(selectedReferenceCards.length, includeAllReferenceCards ? 21 : 7, "coverage profile reference card 수 오류");
const coverage = new Map<string, PlaceCoverage>(
  places.places.map((place) => [place.place_id, {
    total: 0,
    cards: [0, 0, 0],
    maxSelectionScore: Number.NEGATIVE_INFINITY,
    themes: new Set<string>(),
    purposes: new Set<string>(),
    transports: new Set<string>(),
    seasons: new Set<string>(),
    departures: new Set<string>(),
  }]),
);
const scenarioReachability = {
  initial: new Set<string>(),
  reroll: new Set<string>(),
  recent: new Set<string>(),
  recentReroll: new Set<string>(),
};

let combinationCount = 0;
for (const referenceCard of selectedReferenceCards) {
  for (const travelPurpose of purposes) {
    for (const transportType of transports) {
      for (const companionType of companions) {
        for (const season of seasons) {
          for (const departure of departures) {
            const baseRequest: RecommendRequest = {
              referenceCardId: referenceCard.referenceCardId,
              travelPurpose,
              transportType,
              companionType,
              currentSeason: season.value,
              currentDate: season.date,
              origin: departure.origin,
              routeDistanceEnabled: departure.origin?.type !== "skip",
            };
            const initialCards = runRecommendation(baseRequest, places, references, activeIds, placeById);
            recordCards(initialCards, coverage, triggerFor(
              referenceCard,
              travelPurpose,
              transportType,
              companionType,
              season.value,
              season.date,
              departure.id,
              "none",
              false,
            ), scenarioReachability.initial);
            combinationCount += 1;

            const rerollCards = runRecommendation({
              ...baseRequest,
              excludePlaceIds: selectedIds(initialCards),
            }, places, references, activeIds, placeById);
            recordCards(rerollCards, coverage, triggerFor(
              referenceCard,
              travelPurpose,
              transportType,
              companionType,
              season.value,
              season.date,
              departure.id,
              "none",
              true,
            ), scenarioReachability.reroll);
            combinationCount += 1;

            const recentExposure = exposureFrom(initialCards);
            const recentCards = runRecommendation({
              ...baseRequest,
              ...recentExposure,
            }, places, references, activeIds, placeById);
            recordCards(recentCards, coverage, triggerFor(
              referenceCard,
              travelPurpose,
              transportType,
              companionType,
              season.value,
              season.date,
              departure.id,
              "recent",
              false,
            ), scenarioReachability.recent);
            combinationCount += 1;

            const recentRerollCards = runRecommendation({
              ...baseRequest,
              ...recentExposure,
              excludePlaceIds: selectedIds(initialCards),
            }, places, references, activeIds, placeById);
            recordCards(recentRerollCards, coverage, triggerFor(
              referenceCard,
              travelPurpose,
              transportType,
              companionType,
              season.value,
              season.date,
              departure.id,
              "recent",
              true,
            ), scenarioReachability.recentReroll);
            combinationCount += 1;
          }
        }
      }
    }
  }
}

const rows = places.places.map((place) => {
  const value = coverage.get(place.place_id)!;
  const hasCoordinates = Number.isFinite(place.latitude) && Number.isFinite(place.longitude);
  return {
    placeId: place.place_id,
    placeName: place.place_name,
    primaryTheme: place.primaryTheme,
    reachableStatus: value.total === 0
      ? "UNREACHABLE"
      : place.operatingCondition?.requiresExactDate
        ? "CONDITIONALLY_REACHABLE"
        : "REACHABLE",
    hasCoordinates,
    mapStatus: hasCoordinates ? "READY" : "MISSING_COORDINATES",
    total: value.total,
    cards: value.cards,
    firstTrigger: value.firstTrigger,
    bestTrigger: value.bestTrigger,
    maxSelectionScore: value.maxSelectionScore,
    bestRank: value.bestRank,
    primaryThemeCoverage: [...value.themes].sort(),
    purposeCoverage: [...value.purposes].sort(),
    transportCoverage: [...value.transports].sort(),
    seasonCoverage: [...value.seasons].sort(),
    departureCoverage: [...value.departures].sort(),
  };
});
const unreachable = rows.filter((row) => row.total === 0);
const cardUnique = [0, 1, 2].map((index) => rows.filter((row) => row.cards[index] > 0).length);
const counts = rows.map((row) => row.total);
const sortedByAppearance = [...rows].sort((a, b) => b.total - a.total || a.placeId.localeCompare(b.placeId));
const card1Unreachable = rows.filter((row) => row.cards[0] === 0);
const newPlaceRows = rows.filter((row) => Number(row.placeId.slice(-3)) >= 55);
const reachableStatusCounts = Object.fromEntries(
  ["REACHABLE", "CONDITIONALLY_REACHABLE", "UNREACHABLE"].map((status) => [
    status,
    rows.filter((row) => row.reachableStatus === status).length,
  ]),
);
const missingByScenario = Object.fromEntries(
  Object.entries(scenarioReachability).map(([scenario, scenarioIds]) => [
    scenario,
    rows
      .filter((row) => !scenarioIds.has(row.placeId))
      .map(({ placeId, placeName }) => ({ placeId, placeName })),
  ]),
);
const retryNewPlaceIds = [...scenarioReachability.reroll]
  .filter((placeId) => !scenarioReachability.initial.has(placeId))
  .sort();
const recentRetryNewPlaceIds = [...scenarioReachability.recentReroll]
  .filter((placeId) => !scenarioReachability.recent.has(placeId))
  .sort();
const dimensionUniqueRecommendations = {
  primaryTheme: Object.fromEntries(
    [...new Set(selectedReferenceCards.map((card) => String(card.primaryTheme)))].sort()
      .map((value) => [value, rows.filter((row) => row.primaryThemeCoverage.includes(value)).length]),
  ),
  travelPurpose: Object.fromEntries(
    purposes.map((value) => [value, rows.filter((row) => row.purposeCoverage.includes(value)).length]),
  ),
  transportType: Object.fromEntries(
    transports.map((value) => [value, rows.filter((row) => row.transportCoverage.includes(value)).length]),
  ),
  season: Object.fromEntries(
    seasons.map(({ value }) => [value, rows.filter((row) => row.seasonCoverage.includes(value)).length]),
  ),
  departure: Object.fromEntries(
    departures.map(({ id }) => [id, rows.filter((row) => row.departureCoverage.includes(id)).length]),
  ),
};
const totalAppearances = counts.reduce((sum, count) => sum + count, 0);
const appearanceAverage = totalAppearances / rows.length;
const appearanceMedian = median(counts);
const appearanceStandardDeviation = populationStandardDeviation(counts);
const top5Appearances = sortedByAppearance.slice(0, 5).reduce((sum, row) => sum + row.total, 0);
const top5SharePercent = totalAppearances === 0 ? 0 : top5Appearances / totalAppearances * 100;
const newPlacesTotalAppearances = newPlaceRows.reduce((sum, row) => sum + row.total, 0);
const cardRoleDistribution = {
  BEST_SCENE: {
    uniquePlaceCount: cardUnique[0],
    totalAppearances: rows.reduce((sum, row) => sum + row.cards[0], 0),
    places: rows.map((row) => ({ placeId: row.placeId, count: row.cards[0] })).filter(({ count }) => count > 0),
  },
  SAME_MOOD_ALTERNATIVE: {
    uniquePlaceCount: cardUnique[1],
    totalAppearances: rows.reduce((sum, row) => sum + row.cards[1], 0),
    places: rows.map((row) => ({ placeId: row.placeId, count: row.cards[1] })).filter(({ count }) => count > 0),
  },
  CONDITION_FIT_ALTERNATIVE: {
    uniquePlaceCount: cardUnique[2],
    totalAppearances: rows.reduce((sum, row) => sum + row.cards[2], 0),
    places: rows.map((row) => ({ placeId: row.placeId, count: row.cards[2] })).filter(({ count }) => count > 0),
  },
};
const largeScaleAudit = {
  counterUnits: {
    tests: "recommendGoatPlaces 호출 단위",
    duplicatePlaceTests: "중복 placeId가 한 번이라도 나온 결과 단위",
    scoreValues: "반환 카드의 필수 numeric score leaf 값 단위",
    missingMedia: "반환 카드 appearance 단위; unique placeId도 별도 제공",
  },
  totalTests: auditCounters.totalTests,
  successTests: auditCounters.successTests,
  failedTests: auditCounters.failedTests,
  thrownErrors: auditCounters.thrownErrors,
  threeCardFailureTests: auditCounters.threeCardFailureTests,
  duplicatePlaceTests: auditCounters.duplicatePlaceTests,
  duplicateCardOccurrences: auditCounters.duplicateCardOccurrences,
  unknownPlaceIdOccurrences: auditCounters.unknownPlaceIdOccurrences,
  nanScoreValues: auditCounters.nanScoreValues,
  infinityScoreValues: auditCounters.infinityScoreValues,
  undefinedScoreValues: auditCounters.undefinedScoreValues,
  outOfRangeScoreValues: auditCounters.outOfRangeScoreValues,
  scoreRanges: SCORE_RANGES,
  card3PurposeFallbackTests: auditCounters.card3PurposeFallbackTests,
  card1ThemeMismatchTests: auditCounters.card1ThemeMismatchTests,
  card1ThemeMismatchWithEligibleThemeTests: auditCounters.card1ThemeMismatchWithEligibleThemeTests,
  wrongPurposeFallbackTests: auditCounters.wrongPurposeFallbackTests,
  missingCoordinateCardAppearances: auditCounters.missingCoordinateCardAppearances,
  missingCoordinateUniquePlaces: auditCounters.missingCoordinatePlaceIds.size,
  missingCoordinatePlaceIds: [...auditCounters.missingCoordinatePlaceIds].sort(),
  missingImageCardAppearances: auditCounters.missingImageCardAppearances,
  missingImageUniquePlaces: auditCounters.missingImagePlaceIds.size,
  missingImagePlaceIds: [...auditCounters.missingImagePlaceIds].sort(),
  recommendedPlaces: rows.length - unreachable.length,
  unrecommendedPlaces: unreachable.length,
  newPlacesRecommended: newPlaceRows.filter((row) => row.total > 0).length,
  placeExposureCounts: Object.fromEntries(rows.map((row) => [row.placeId, row.total])),
  cardRoleDistribution,
  errorMessages: auditCounters.errorMessages,
};

const summary = {
  profile: includeAllReferenceCards ? "ALL_21_REFERENCE_CARDS" : "ACTUAL_UI_7_MOOD_ENTRYPOINTS",
  referenceCardIds: selectedReferenceCards.map((card) => card.referenceCardId),
  combinationCount,
  reachable: rows.length - unreachable.length,
  reachableStatusCounts,
  unreachable: unreachable.map(({ placeId, placeName, primaryTheme }) => ({ placeId, placeName, primaryTheme })),
  uniqueByCard: { card1: cardUnique[0], card2: cardUnique[1], card3: cardUnique[2] },
  card1Unreachable: card1Unreachable.map(({ placeId, placeName }) => ({ placeId, placeName })),
  reachableByScenario: Object.fromEntries(
    Object.entries(scenarioReachability).map(([scenario, ids]) => [scenario, ids.size]),
  ),
  missingByScenario,
  retryNewExposure: {
    coldStart: { count: retryNewPlaceIds.length, placeIds: retryNewPlaceIds },
    recentExposure: { count: recentRetryNewPlaceIds.length, placeIds: recentRetryNewPlaceIds },
  },
  dimensionUniqueRecommendations,
  newPlaces: {
    reachable: newPlaceRows.filter((row) => row.total > 0).length,
    missingCoordinates: newPlaceRows.filter((row) => !row.hasCoordinates).map(({ placeId, placeName }) => ({ placeId, placeName })),
  },
  appearance: {
    total: totalAppearances,
    min: Math.min(...counts),
    max: Math.max(...counts),
    average: appearanceAverage,
    median: appearanceMedian,
    populationStandardDeviation: appearanceStandardDeviation,
    top5SharePercent,
    newPlacesTotalAppearances,
    mostFrequent: sortedByAppearance.slice(0, 5).map(({ placeId, placeName, total }) => ({ placeId, placeName, total })),
    leastFrequent: sortedByAppearance.slice(-5).reverse().map(({ placeId, placeName, total }) => ({ placeId, placeName, total })),
  },
  largeScaleAudit,
};

console.log(JSON.stringify({
  ...summary,
  ...(includeRows ? { rows } : {}),
}, null, 2));

assert.equal(combinationCount, includeAllReferenceCards ? 197_568 : 65_856, "Cartesian product 실행 수 오류");
assert.equal(auditCounters.totalTests, combinationCount, "대규모 테스트 집계 수가 Cartesian 실행 수와 다릅니다.");
assert.equal(auditCounters.successTests + auditCounters.failedTests, auditCounters.totalTests, "성공/실패 집계 합계 오류");
assert.equal(auditCounters.failedTests, 0, `추천 실패: ${auditCounters.errorMessages.join(" | ")}`);
assert.equal(auditCounters.threeCardFailureTests, 0, "카드 3개 반환 실패가 있습니다.");
assert.equal(auditCounters.duplicatePlaceTests, 0, "추천 결과 내 장소 중복이 있습니다.");
assert.equal(auditCounters.unknownPlaceIdOccurrences, 0, "운영 데이터에 없는 place_id가 추천됐습니다.");
assert.equal(auditCounters.nanScoreValues, 0, "NaN 점수가 있습니다.");
assert.equal(auditCounters.infinityScoreValues, 0, "Infinity 점수가 있습니다.");
assert.equal(auditCounters.undefinedScoreValues, 0, "undefined 필수 점수가 있습니다.");
assert.equal(auditCounters.outOfRangeScoreValues, 0, "정의된 범위를 벗어난 점수가 있습니다.");
assert.equal(auditCounters.card1ThemeMismatchWithEligibleThemeTests, 0, "같은 테마 후보가 있는데 카드 1 테마가 불일치합니다.");
assert.equal(auditCounters.wrongPurposeFallbackTests, 0, "목적 일치 후보가 있는데 카드 3 fallback이 발생했습니다.");
assert.equal(unreachable.length, 0, `영구 미추천 장소: ${unreachable.map((row) => row.placeId).join(", ")}`);
assert.equal(newPlaceRows.filter((row) => row.total > 0).length, 7, "신규 7개 장소 중 추천 불가능 장소가 있습니다.");
assert.ok(rows.every((row) => row.hasCoordinates), "좌표가 없는 운영 장소가 있습니다.");

function csvCell(value: unknown): string {
  const raw = value === undefined || value === null
    ? ""
    : Array.isArray(value)
      ? value.join("|")
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  return /[",\r\n]/.test(raw) ? `"${raw.replaceAll('"', '""')}"` : raw;
}

function csv(headers: string[], values: unknown[][]): string {
  return `\uFEFF${[headers, ...values].map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

function coefficientOfVariation(values: number[]): number {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return mean === 0 ? 0 : Math.sqrt(variance) / mean;
}

function gini(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((total, value) => total + value, 0);
  if (sum === 0) return 0;
  const weighted = sorted.reduce((total, value, index) => total + (index + 1) * value, 0);
  return (2 * weighted) / (sorted.length * sum) - (sorted.length + 1) / sorted.length;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[midpoint] ?? 0;
  return ((sorted[midpoint - 1] ?? 0) + (sorted[midpoint] ?? 0)) / 2;
}

function populationStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
}

async function writeRecommendationReports(): Promise<void> {
  const reportsDir = path.join(root, "reports");
  await mkdir(reportsDir, { recursive: true });
  const generatedAt = new Date().toISOString();
  const totalAppearances = counts.reduce((sum, count) => sum + count, 0);
  const average = totalAppearances / rows.length;
  const concentration = {
    coefficientOfVariation: Number(coefficientOfVariation(counts).toFixed(4)),
    gini: Number(gini(counts).toFixed(4)),
    maxToMinRatio: Number((Math.max(...counts) / Math.max(1, Math.min(...counts))).toFixed(2)),
    maximumSharePercent: Number((Math.max(...counts) / totalAppearances * 100).toFixed(4)),
    equalSharePercent: Number((100 / rows.length).toFixed(4)),
    median: appearanceMedian,
    populationStandardDeviation: Number(appearanceStandardDeviation.toFixed(4)),
    top5SharePercent: Number(top5SharePercent.toFixed(4)),
  };

  const coverageHeaders = [
    "place_id", "place_name", "reachable_status", "total_appearances", "card1_appearances", "card2_appearances",
    "card3_appearances", "primaryTheme_coverage", "purpose_coverage", "transport_coverage", "season_coverage",
    "departure_coverage", "first_trigger_condition", "best_trigger_condition", "max_score", "best_rank", "blocked_stage",
    "blocked_reason", "recommended_fix",
  ];
  const coverageRows = rows.map((row) => {
    const conditional = row.reachableStatus === "CONDITIONALLY_REACHABLE";
    return [
      row.placeId,
      row.placeName,
      row.reachableStatus,
      row.total,
      row.cards[0],
      row.cards[1],
      row.cards[2],
      row.primaryThemeCoverage,
      row.purposeCoverage,
      row.transportCoverage,
      row.seasonCoverage,
      row.departureCoverage,
      row.firstTrigger,
      row.bestTrigger,
      row.maxSelectionScore,
      row.bestRank,
      conditional ? "OPERATING_DATE_FILTER" : "",
      conditional ? "확인된 운영일(2026-05-15~2026-06-14) 밖에서는 exact-date 자격 필터로 제외" : "",
      conditional ? "요청 currentDate를 전달하고 공식 운영기간 갱신 시 operatingCondition을 재검증" : "",
    ];
  });

  const distributionHeaders = [
    "place_id", "place_name", "total_count", "card1_count", "card2_count", "card3_count", "percentage", "theme_count",
    "purpose_count", "transport_count", "season_count", "departure_count", "is_new_place", "is_over_recommended", "is_under_recommended",
  ];
  const distributionRows = rows.map((row) => [
    row.placeId,
    row.placeName,
    row.total,
    row.cards[0],
    row.cards[1],
    row.cards[2],
    Number((row.total / totalAppearances * 100).toFixed(4)),
    row.primaryThemeCoverage.length,
    row.purposeCoverage.length,
    row.transportCoverage.length,
    row.seasonCoverage.length,
    row.departureCoverage.length,
    Number(row.placeId.slice(-3)) >= 55,
    row.total > average * 2,
    row.total < average * 0.25,
  ]);

  const resultPayload = {
    generatedAt,
    randomizationUsed: false,
    scorePolicy: {
      primaryTheme: 18,
      moodTags: { one: 6, two: 12, threeOrMore: 17 },
      sceneTags: { one: 5, twoOrMore: 10 },
      placeType: "baseScore 0; tie-break hint only",
      travelPurpose: 20,
      accessibility: { high: 12, middle: 7, low: 1, invalid: 0 },
      season: { current: 13, allSeason: 10, none: 0 },
      originDistanceBonus: { cards: [2, 3], bandsKm: { "<=5": 10, "<=10": 8, "<=20": 6, "<=40": 4, "<=70": 2, ">70": 0 } },
      routeDistanceBonus: { cards: [2, 3], max: 10, durationPreferred: true },
      duplicatePenalty: { card: 2, max: -6 },
      recentExposurePenalty: { cards: [2, 3], max: -5 },
      coverageBoost: { cards: [2, 3], points: 3 },
      lowExposureBoost: { cards: [2, 3], max: 3, emptyHistory: 0 },
      bestTime: 0,
      companionType: 0,
      displayScore: "clamp(base + originDistanceBonus + routeDistanceBonus - duplicatePenalty, 0, 100)",
      selectionScore: "base + originDistanceBonus + routeDistanceBonus - duplicatePenalty - exposurePenalty + coverageBoost + lowExposureBoost",
    },
    dimensions: {
      referenceProfiles: selectedReferenceCards.length,
      primaryThemes: 7,
      travelPurposes: purposes.length,
      transports: transports.length,
      companions: companions.length,
      seasons: seasons.length,
      departures: departures.length,
      exposureStates: 2,
      retryStates: 2,
      total: combinationCount,
      externalApiCalls: 0,
    },
    summary,
    concentration,
    diversity: {
      dimensionUniqueRecommendations,
      retryNewExposure: summary.retryNewExposure,
      cardRoleDistribution,
    },
    largeScaleAudit,
    places: rows,
  };

  const summaryMarkdown = `# 추천 엔진 테스트 요약

- 생성 시각: ${generatedAt}
- 실행 프로필: ${summary.profile}
- 실제 UI 진입 레퍼런스: ${selectedReferenceCards.map((card) => card.referenceCardId).join(", ")}
- 전체 Cartesian 조합: ${combinationCount.toLocaleString("en-US")}건
- 외부 API 호출: 0건 (순수 1차 추천 엔진 단위 테스트)
- 무작위 점수/무작위 순환: 사용하지 않음

## 도달성

- 운영 장소: 61
- REACHABLE: ${reachableStatusCounts.REACHABLE}
- CONDITIONALLY_REACHABLE: ${reachableStatusCounts.CONDITIONALLY_REACHABLE}
- UNREACHABLE: ${reachableStatusCounts.UNREACHABLE}
- 카드 1/2/3 고유 장소: ${cardUnique.join(" / ")}
- 최초 추천만 고유 장소: ${scenarioReachability.initial.size}
- 다시 추천 포함 고유 장소: ${scenarioReachability.reroll.size}
- 다시 추천으로 새롭게 노출(콜드 스타트 기준): ${retryNewPlaceIds.length}개 (${retryNewPlaceIds.join(", ") || "없음"})
- 최근 노출 상태에서 다시 추천으로 새롭게 노출: ${recentRetryNewPlaceIds.length}개 (${recentRetryNewPlaceIds.join(", ") || "없음"})
- 신규 7개 도달: ${newPlaceRows.filter((row) => row.total > 0).length}/7
- 좌표 보유: ${rows.filter((row) => row.hasCoordinates).length}/61

GOAT-058 고석정 꽃밭은 확인된 2026-05-15~2026-06-14 운영일에만 자격을 얻으므로 CONDITIONALLY_REACHABLE입니다. 최초 재현 조건의 currentDate는 ${rows.find((row) => row.placeId === "GOAT-058")?.firstTrigger?.currentDate ?? "없음"}입니다.

## 노출 분포

- 최소: ${Math.min(...counts).toLocaleString("en-US")}회 (${sortedByAppearance.at(-1)?.placeId} ${sortedByAppearance.at(-1)?.placeName})
- 최대: ${Math.max(...counts).toLocaleString("en-US")}회 (${sortedByAppearance[0]?.placeId} ${sortedByAppearance[0]?.placeName})
- 평균: ${average.toFixed(2)}회
- 중앙값: ${appearanceMedian.toLocaleString("en-US")}회
- 모집단 표준편차: ${appearanceStandardDeviation.toFixed(2)}회
- Top 5 점유율: ${top5SharePercent.toFixed(4)}%
- 신규 7개 총 추천 횟수: ${newPlacesTotalAppearances.toLocaleString("en-US")}회
- 변동계수: ${concentration.coefficientOfVariation}
- Gini: ${concentration.gini}
- 최대/최소: ${concentration.maxToMinRatio}배

## 조건 축별 고유 추천 장소 수

- 테마별: ${Object.entries(dimensionUniqueRecommendations.primaryTheme).map(([key, value]) => `${key}=${value}`).join(", ")}
- 목적별: ${Object.entries(dimensionUniqueRecommendations.travelPurpose).map(([key, value]) => `${key}=${value}`).join(", ")}
- 이동수단별: ${Object.entries(dimensionUniqueRecommendations.transportType).map(([key, value]) => `${key}=${value}`).join(", ")}
- 계절별: ${Object.entries(dimensionUniqueRecommendations.season).map(([key, value]) => `${key}=${value}`).join(", ")}
- 출발지별: ${Object.entries(dimensionUniqueRecommendations.departure).map(([key, value]) => `${key}=${value}`).join(", ")}

## 대규모 자동 테스트 집계

| 항목 | 실제 집계 |
|---|---:|
| 전체 테스트 수 | ${largeScaleAudit.totalTests.toLocaleString("en-US")} |
| 성공 / 실패 | ${largeScaleAudit.successTests.toLocaleString("en-US")} / ${largeScaleAudit.failedTests.toLocaleString("en-US")} |
| 카드 3개 반환 실패 | ${largeScaleAudit.threeCardFailureTests} |
| 장소 중복 결과 | ${largeScaleAudit.duplicatePlaceTests} |
| NaN / Infinity / undefined 필수 점수 값 | ${largeScaleAudit.nanScoreValues} / ${largeScaleAudit.infinityScoreValues} / ${largeScaleAudit.undefinedScoreValues} |
| 정의 범위 초과 점수 값 | ${largeScaleAudit.outOfRangeScoreValues} |
| CARD3_PURPOSE_FALLBACK | ${largeScaleAudit.card3PurposeFallbackTests} |
| 카드 1 테마 불일치(허용 fallback 포함) | ${largeScaleAudit.card1ThemeMismatchTests} |
| 같은 테마 후보가 있는데 카드 1 불일치 | ${largeScaleAudit.card1ThemeMismatchWithEligibleThemeTests} |
| 목적 일치 후보가 있는데 fallback | ${largeScaleAudit.wrongPurposeFallbackTests} |
| 좌표 누락 카드 appearance / 고유 장소 | ${largeScaleAudit.missingCoordinateCardAppearances} / ${largeScaleAudit.missingCoordinateUniquePlaces} |
| 이미지 누락 카드 appearance / 고유 장소 | ${largeScaleAudit.missingImageCardAppearances.toLocaleString("en-US")} / ${largeScaleAudit.missingImageUniquePlaces} |
| 추천 / 미추천 장소 | ${largeScaleAudit.recommendedPlaces} / ${largeScaleAudit.unrecommendedPlaces} |
| 신규 7개 추천 장소 | ${largeScaleAudit.newPlacesRecommended} |
| 카드 1 고유 / 총 appearance | ${cardRoleDistribution.BEST_SCENE.uniquePlaceCount} / ${cardRoleDistribution.BEST_SCENE.totalAppearances.toLocaleString("en-US")} |
| 카드 2 고유 / 총 appearance | ${cardRoleDistribution.SAME_MOOD_ALTERNATIVE.uniquePlaceCount} / ${cardRoleDistribution.SAME_MOOD_ALTERNATIVE.totalAppearances.toLocaleString("en-US")} |
| 카드 3 고유 / 총 appearance | ${cardRoleDistribution.CONDITION_FIT_ALTERNATIVE.uniquePlaceCount} / ${cardRoleDistribution.CONDITION_FIT_ALTERNATIVE.totalAppearances.toLocaleString("en-US")} |

카운터는 각 실제 recommendGoatPlaces 반환을 검사해 누적했습니다. NaN/Infinity/undefined/범위 초과는 반환 카드의 필수 numeric score leaf 값 단위이며, 누락 좌표·이미지는 반환 카드 appearance 단위입니다. 이미지 필드는 현재 61개 scoring 데이터 모두 비어 있어 모든 appearance에서 누락으로 집계되며, 추천 성공 여부와는 분리된 전달/UI 자산 이슈입니다.

## CSV 컬럼 의미

- first_trigger_condition: Cartesian 순회 중 해당 장소를 처음 관측한 조건입니다. 최초 추천 상태만을 뜻하지 않으므로 retry=true일 수 있습니다.
- best_trigger_condition: 해당 장소가 최대 selectionScore를 기록한 조건입니다.
- best_rank: 모든 appearance에서 관측한 최소 카드 순위(1이 최상)이며, best_trigger_condition의 순위와는 독립입니다.
- max_score: best_trigger_condition에서의 최대 selectionScore입니다.

## 실제 점수식

| 항목 | 점수/정책 |
|---|---|
| primaryTheme | 일치 +18 |
| mood_tags | 1/2/3개 이상 +6/+12/+17 |
| sceneTags | 1/2개 이상 +5/+10 |
| place_type | baseScore 가산 없음, 동률 보조만 사용 |
| purpose_tags | 일치 +20 |
| accessibility | 상/중/하 +12/+7/+1 |
| season_tags | 현재 계절 +13, 사계절 +10 |
| 출발지 근접 | 카드 2·3, 최대 +10 |
| 카드 1 연계 거리 | 카드 2·3, 최대 +10 |
| 장면 중복 | 카드 2, 최대 -6 |
| 최근 노출 | 카드 2·3, 최대 -5 |
| coverageBoost | 카드 2·3, +3 |
| lowExposureBoost | 카드 2·3, 최대 +3; 빈 이력 0 |
| best_time / companionType | 1차 점수 0 |

## 분류 메모

- 수정 전/후 모두 합산 61/61 도달이었으며, 도달성을 만들기 위한 random 점수는 추가하지 않았습니다.
- 수정은 출발지 민감도, explicit walk 우선, 고원·목장·산악 도보 추정 보수화, 빈 노출 이력 보정 오류, legacy breakdown 일치에 한정했습니다.
- 실서비스 /api/recommend-from-tags 라우트는 노출 repository 서비스와 연결되어 다시 추천 제외·누적 노출을 적용합니다. 현재 구현은 프로세스 메모리 저장소이므로 서버 재시작 시 기록이 유실됩니다.
`;

  const unreachableMarkdown = `# 장소 미추천 분석

- 영구 미추천(UNREACHABLE): 0개
- 조건부 도달: GOAT-058 고석정 꽃밭 1개
- 최초 추천 상태에서만 미도달: ${missingByScenario.initial.map((row) => `${row.placeId} ${row.placeName}`).join(", ") || "없음"}
- 최근 노출 상태에서만 미도달: ${missingByScenario.recent.map((row) => `${row.placeId} ${row.placeName}`).join(", ") || "없음"}
- 다시 추천 상태 미도달: ${missingByScenario.reroll.map((row) => `${row.placeId} ${row.placeName}`).join(", ") || "없음"}
- 최근 노출 + 다시 추천 상태 미도달: ${missingByScenario.recentReroll.map((row) => `${row.placeId} ${row.placeName}`).join(", ") || "없음"}

GOAT-058은 데이터/로직 오류가 아니라 공식 확인 운영기간을 강제하는 명시적 정책 필터입니다. 2026-07-21에는 추천 후보에서 제외되고, 2026-05-20 같은 확인 운영일에는 추천됩니다.
`;

  await Promise.all([
    writeFile(path.join(reportsDir, "recommendation-test-summary.md"), summaryMarkdown, "utf8"),
    writeFile(path.join(reportsDir, "recommendation-test-results.json"), `${JSON.stringify(resultPayload, null, 2)}\n`, "utf8"),
    writeFile(path.join(reportsDir, "place-recommendation-distribution.csv"), csv(distributionHeaders, distributionRows), "utf8"),
    writeFile(path.join(reportsDir, "place-coverage-report.csv"), csv(coverageHeaders, coverageRows), "utf8"),
    writeFile(path.join(reportsDir, "place-unreachable-report.md"), unreachableMarkdown, "utf8"),
  ]);
}

if (writeReports) await writeRecommendationReports();
