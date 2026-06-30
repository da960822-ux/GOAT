import { recommendGoatPlaces } from "../src";
import placesDataset from "../data/goat_simplified_scoring_tags_v10_accessibility_merged.json";
import referenceDataset from "../data/goat_reference_cards_v2_balanced.json";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const seaResult = recommendGoatPlaces(
  {
    referenceCardId: "REF_SEA_02",
    travelPurpose: "사진·포토스팟",
    transportType: "자차",
    visitTime: "오후",
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
    visitTime: "오후",
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
    visitTime: "야간",
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

console.log("All GOAT recommendation engine tests passed.");
