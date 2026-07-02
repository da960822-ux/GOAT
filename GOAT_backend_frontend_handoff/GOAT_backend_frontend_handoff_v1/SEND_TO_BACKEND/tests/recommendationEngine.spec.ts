import { recommendGoatPlaces, recommendGoatPlacesFromPhotoAnalysis, normalizePhotoAnalysisForRecommendation, createGoatRecommendation, InMemoryRecommendationExposureRepository, RecommendationExposureRepository, RecommendationExposureQuery, ExposureStats, SaveRecommendationExposuresInput } from "../src";
import placesDataset from "../data/goat_simplified_scoring_tags_v10_accessibility_merged.json";
import referenceDataset from "../data/goat_reference_cards_v2_balanced.json";

declare const require: (moduleName: string) => any;
const fs = require("node:fs");
const path = require("node:path");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const seaResult = recommendGoatPlaces(
  {
    referenceCardId: "REF_SEA_02",
    travelPurpose: "사진·포토스팟",
    transportType: "자차",
      currentMonth: 7,
    debug: true,
  },
  placesDataset,
  referenceDataset,
);

assert(seaResult.status === "DONE", "seaResult.status should be DONE");
assert(seaResult.resultType === "RECOMMEND", "seaResult.resultType should be RECOMMEND");
assert(seaResult.resultData?.cards.length === 3, "must return 3 cards");
assert(seaResult.resultData?.cards[0].role === "BEST_SCENE", "card1 role mismatch");
assert(seaResult.resultData?.cards[1].role === "SAME_MOOD_ALTERNATIVE", "card2 role mismatch");
assert(seaResult.resultData?.cards[2].role === "CONDITION_FIT_ALTERNATIVE", "card3 role mismatch");
assert(seaResult.resultData?.cards[0].primaryTheme === "바다·해안 무드", "card1 primaryTheme mismatch");
assert(seaResult.resultData?.cards[0].score.routeDistanceBonus === 0, "card1 must not have route bonus");
assert((seaResult.resultData?.cards[0].score.baseScore ?? 0) <= 90, "baseScore must be <= 90");
assert((seaResult.resultData?.cards[1].score.displayScore ?? 0) <= 100, "displayScore must be <= 100");

const jpResult = recommendGoatPlaces(
  {
    referenceCardId: "REF_JP_01",
    travelPurpose: "카페·실내휴식",
    transportType: "대중교통",
      currentMonth: 10,
  },
  placesDataset,
  referenceDataset,
);

assert(jpResult.status === "DONE", "jpResult.status should be DONE");
assert(jpResult.resultData?.cards.length === 3, "JP must return 3 cards");
assert(jpResult.resultData?.cards[0].primaryTheme === "일본 소도시·골목 무드", "JP card1 theme mismatch");

const purposeResult = recommendGoatPlaces(
  {
    primaryTheme: "알프스·고원·목장 무드",
    userMoodTags: ["몽골감성", "신비로움", "탁트임"],
    userSceneTags: ["고원", "별", "은하수"],
    travelPurpose: "사진·포토스팟",
    transportType: "자차",
      currentMonth: 8,
  },
  placesDataset,
  referenceDataset,
);

assert(purposeResult.status === "DONE", "purposeResult.status should be DONE");
for (const card of purposeResult.resultData?.cards ?? []) {
  assert(card.score.baseScore <= 90, "baseScore는 90점을 넘지 않아야 한다.");
  assert(card.score.displayScore <= 100, "displayScore는 100점을 넘지 않아야 한다.");
}


const photoResult = recommendGoatPlacesFromPhotoAnalysis(
  {
    aiAnalysis: {
      status: "DONE",
      confidence: 0.86,
      summary: "바다, 해안도로, 노을 분위기가 강한 사진입니다.",
      mood_tags: ["캘리포니아감성", "로드트립감성", "청량함", "탁트임"],
      sceneTags: ["바다", "해안도로", "해변", "노을"],
      primaryThemeCandidates: [
        {
          primaryTheme: "바다·해안 무드",
          confidence: 0.91,
          reason: "사진 안에 바다와 해안도로 장면이 뚜렷합니다.",
          mood_tags: ["로드트립감성", "청량함"],
          sceneTags: ["해안도로", "바다"],
        },
        { primaryTheme: "휴양·카페·이국공간 무드", confidence: 0.63, reason: "밝은 색감과 휴양지 분위기가 있습니다." },
        { primaryTheme: "레트로·시장·항구 무드", confidence: 0.42, reason: "항구나 로컬 해안 풍경으로도 해석될 수 있습니다." },
      ],
    },
    selectedPrimaryTheme: "바다·해안 무드",
    travelPurpose: "사진·포토스팟",
    transportType: "자차",
    currentMonth: 7,
    debug: true,
    enableWarningLog: false,
  },
  placesDataset,
  referenceDataset,
);

assert(photoResult.status === "DONE", "photoResult.status should be DONE");
assert(photoResult.resultType === "RECOMMEND", "photoResult.resultType should be RECOMMEND");
assert(photoResult.resultData?.cards.length === 3, "photo mode must return 3 cards");
assert(photoResult.resultData?.request.primaryTheme === "바다·해안 무드", "photo selected theme should become engine primaryTheme");
assert(photoResult.resultData?.request.userMoodTags.includes("청량함"), "photo mood_tags should become userMoodTags");
assert(photoResult.resultData?.request.userSceneTags.includes("해안도로"), "photo sceneTags should become userSceneTags");
assert(photoResult.resultData?.debug?.photoAnalysis?.selectedPrimaryTheme === "바다·해안 무드", "photo debug should contain selected theme");

const normalizedLowConfidence = normalizePhotoAnalysisForRecommendation(
  {
    aiAnalysis: {
      status: "LOW_CONFIDENCE",
      confidence: 0.31,
      mood_tags: ["청량함"],
      sceneTags: [],
      primaryThemeCandidates: [{ primaryTheme: "바다·해안 무드", confidence: 0.31 }],
    },
    selectedPrimaryTheme: "일본 소도시·골목 무드",
    travelPurpose: "사진·포토스팟",
    transportType: "자차",
    currentMonth: 7,
  },
  placesDataset,
);
assert(
  normalizedLowConfidence.warnings.some((warning) => warning.code === "PHOTO_ANALYSIS_LOW_CONFIDENCE"),
  "LOW_CONFIDENCE photo analysis should emit warning",
);
assert(
  normalizedLowConfidence.warnings.some((warning) => warning.code === "PHOTO_SELECTED_THEME_NOT_IN_CANDIDATES"),
  "invalid selectedPrimaryTheme should fallback to AI first candidate with warning",
);


const fallbackDataset = {
  ...placesDataset,
  places: placesDataset.places.slice(0, 5).map((place) => ({
    ...place,
    purpose_tags: ["산책·힐링"],
  })),
};

const capturedServerLogs: unknown[][] = [];
const originalConsoleWarn = console.warn;
const logFilePath = path.resolve("tmp/card3-purpose-fallback-warning.jsonl");
fs.rmSync(logFilePath, { force: true });

let fallbackResult;
console.warn = (...args: unknown[]) => {
  capturedServerLogs.push(args);
};
try {
  fallbackResult = recommendGoatPlaces(
    {
      primaryTheme: "바다·해안 무드",
      userMoodTags: ["청량함"],
      userSceneTags: ["바다"],
      travelPurpose: "먹거리·야간탐방",
      transportType: "자차",
          currentMonth: 7,
      warningLogFilePath: logFilePath,
      logContext: { requestId: "test-card3-fallback" },
    },
    fallbackDataset,
    referenceDataset,
  );
} finally {
  console.warn = originalConsoleWarn;
}

assert(fallbackResult.status === "DONE", "fallbackResult.status should be DONE");
assert(
  fallbackResult.resultData?.warnings.some((warning) => warning.code === "CARD3_PURPOSE_FALLBACK"),
  "CARD3_PURPOSE_FALLBACK warning should be emitted when card3 purpose pool is empty",
);
assert(
  capturedServerLogs.some((args) => args[0] === "[GOAT_RECOMMENDATION_WARNING]" && String(JSON.stringify(args[1])).includes("CARD3_PURPOSE_FALLBACK")),
  "CARD3_PURPOSE_FALLBACK should be written to server console warning log automatically",
);
assert(fs.existsSync(logFilePath), "CARD3_PURPOSE_FALLBACK should be written to warning log file automatically");
const logFileContent = fs.readFileSync(logFilePath, "utf8");
assert(logFileContent.includes("CARD3_PURPOSE_FALLBACK"), "warning log file should contain CARD3_PURPOSE_FALLBACK");
assert(logFileContent.includes("decisionAudit"), "warning log file should contain decisionAudit for fallback/debug trace");
assert(logFileContent.includes("whySelected"), "warning log file should contain whySelected for each selected card");
assert(logFileContent.includes("scoreSummary"), "warning log file should contain scoreSummary for each selected card");
assert(logFileContent.includes("scoreDetails"), "warning log file should contain scoreDetails for each selected card");
assert(
  fallbackResult.resultData?.decisionAudit?.cardSelections.length === fallbackResult.resultData?.cards.length,
  "decisionAudit.cardSelections should match selected cards count",
);
assert(
  fallbackResult.resultData?.decisionAudit?.fallback.card3PurposeFallbackUsed === true,
  "decisionAudit fallback flag should be true when CARD3_PURPOSE_FALLBACK occurs",
);


async function runServiceExposureTests(): Promise<void> {
  const exposureRepo = new InMemoryRecommendationExposureRepository();

  const firstServiceResult = await createGoatRecommendation({
    body: {
      referenceCardId: "REF_SEA_02",
      travelPurpose: "사진·포토스팟",
      transportType: "자차",
          currentMonth: 7,
      enableWarningLog: false,
    },
    context: {
      requestId: "REQ_SERVICE_FIRST",
      userId: "user-001",
      sessionId: "session-001",
      now: new Date("2026-07-02T09:00:00.000Z"),
    },
    placesDataset,
    referenceDataset,
    exposureRepository: exposureRepo,
  });

  assert(firstServiceResult.status === "DONE", "first service recommendation should be DONE");
  const firstPlaceIds = firstServiceResult.resultData?.cards.map((card) => card.placeId) ?? [];
  assert(firstPlaceIds.length === 3, "first service recommendation should save 3 cards");

  const savedPlaceIds = await exposureRepo.findPlaceIdsByRequestId("REQ_SERVICE_FIRST");
  assert(savedPlaceIds.length === 3, "exposure repository should save first recommendation cards");
  assert(savedPlaceIds.join(",") === firstPlaceIds.join(","), "saved exposure placeIds should match first recommendation cards");

  const rerollResult = await createGoatRecommendation({
    body: {
      referenceCardId: "REF_SEA_02",
      travelPurpose: "사진·포토스팟",
      transportType: "자차",
          currentMonth: 7,
      rerollOfRequestId: "REQ_SERVICE_FIRST",
      enableWarningLog: false,
    },
    context: {
      requestId: "REQ_SERVICE_REROLL",
      userId: "user-001",
      sessionId: "session-001",
      now: new Date("2026-07-02T09:05:00.000Z"),
    },
    placesDataset,
    referenceDataset,
    exposureRepository: exposureRepo,
  });

  assert(rerollResult.status === "DONE", "reroll service recommendation should be DONE");
  const rerollPlaceIds = rerollResult.resultData?.cards.map((card) => card.placeId) ?? [];
  for (const placeId of firstPlaceIds) {
    assert(!rerollPlaceIds.includes(placeId), `reroll should exclude previous place ${placeId}`);
  }

  const statsAfterSave = await exposureRepo.getExposureStats({
    userId: "user-001",
    sessionId: "session-001",
    referenceCardId: "REF_SEA_02",
    recentLimit: 20,
  });
  for (const placeId of firstPlaceIds) {
    assert((statsAfterSave.recentExposureByPlaceId[placeId] ?? 0) >= 1, `recent exposure should include ${placeId}`);
    assert((statsAfterSave.totalExposureByPlaceId[placeId] ?? 0) >= 1, `total exposure should include ${placeId}`);
  }

  const allPlacesRecentExposure = Object.fromEntries(
    placesDataset.places.map((place) => [place.place_id, 2]),
  );
  const allPlacesTotalExposure = Object.fromEntries(
    placesDataset.places.map((place) => [place.place_id, 4]),
  );
  const spyRepo: RecommendationExposureRepository = {
    async findPlaceIdsByRequestId() {
      return [];
    },
    async getExposureStats(_query: RecommendationExposureQuery): Promise<Required<ExposureStats>> {
      return {
        recentExposureByPlaceId: allPlacesRecentExposure,
        totalExposureByPlaceId: allPlacesTotalExposure,
        themeAverageExposure: {
          "바다·해안 무드": 4,
          "일본 소도시·골목 무드": 4,
          "알프스·고원·목장 무드": 4,
          "숲·정원·자연휴식 무드": 4,
          "레트로·시장·항구 무드": 4,
          "건축·전시·랜드마크 무드": 4,
          "휴양·카페·이국공간 무드": 4,
        },
      };
    },
    async saveExposures(_input: SaveRecommendationExposuresInput) {
      return undefined;
    },
  };

  const exposureAppliedResult = await createGoatRecommendation({
    body: {
      referenceCardId: "REF_SEA_02",
      travelPurpose: "사진·포토스팟",
      transportType: "자차",
          currentMonth: 7,
      enableWarningLog: false,
    },
    context: {
      requestId: "REQ_EXPOSURE_APPLIED",
      userId: "user-002",
      sessionId: "session-002",
      now: new Date("2026-07-02T10:00:00.000Z"),
    },
    placesDataset,
    referenceDataset,
    exposureRepository: spyRepo,
  });

  const exposureAudits = exposureAppliedResult.resultData?.decisionAudit?.cardSelections ?? [];
  const secondAudit = exposureAudits.find((audit) => audit.rank === 2);
  const thirdAudit = exposureAudits.find((audit) => audit.rank === 3);
  assert(secondAudit?.scoreSummary.exposurePenalty === 2, "service should pass recentExposureByPlaceId to engine for card2 exposure penalty");
  assert(thirdAudit?.scoreSummary.exposurePenalty === 2, "service should pass recentExposureByPlaceId to engine for card3 exposure penalty");
}

runServiceExposureTests()
  .then(() => {
    console.log("All GOAT recommendation engine tests passed.");
  })
  .catch((error) => {
    throw error;
  });
