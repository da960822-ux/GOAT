import { recommendGoatPlaces, createGoatDayCourse } from "../src";
import placesDataset from "../data/goat_simplified_scoring_tags_v10_accessibility_merged.json";
import referenceDataset from "../data/goat_reference_cards_v2_balanced.json";

declare const process: { exit: (code?: number) => never };

async function main() {
  // 1~3단계: 사용자가 무드/태그/여행조건을 고르면 추천 카드 3개 생성
  const cardResult = recommendGoatPlaces({
    primaryTheme: "바다·해안 무드",
    userMoodTags: ["청량함", "캘리포니아감성", "로드트립감성"],
    userSceneTags: ["바다", "해안도로", "해변"],
    companionType: "친구",
    travelPurpose: "사진·포토스팟",
    transportType: "자차",
    currentMonth: 7,
    debug: true,
    enableWarningLog: false,
  }, placesDataset, referenceDataset);

  console.log("\n[1차 추천 카드]");
  console.log(JSON.stringify(cardResult, null, 2));

  const selectedPlaceId = cardResult.resultData?.cards[0]?.placeId;
  if (!selectedPlaceId) throw new Error("NO_SELECTED_PLACE");

  // 4~8단계: 사용자가 카드 1개를 선택하면 주변 후보를 LLM 코스 큐레이션에 넘김
  // 실제 서비스에서는 nearbyCandidates 자리에 한국관광콘텐츠랩 OpenAPI 좌표 반경 후보를 넣거나, selectedPlace 좌표가 있으면 fetchVisitKoreaContentLabNearbyCandidates가 내부에서 자동 호출된다.
  const courseResult = await createGoatDayCourse({
    selectedPlaceId,
    primaryTheme: cardResult.resultData?.request.primaryTheme ?? "바다·해안 무드",
    userMoodTags: cardResult.resultData?.request.userMoodTags ?? [],
    userSceneTags: cardResult.resultData?.request.userSceneTags ?? [],
    companionType: "친구",
    travelPurpose: "사진·포토스팟",
    transportType: "자차",
    forceRuleBasedFallback: true,
    nearbyCandidates: [
      { id: "TOUR-001", title: "해안 전망 산책로", category: "WALK", address: "강원특별자치도 강릉시", distanceMeters: 620, source: "MOCK" },
      { id: "CAFE-001", title: "오션뷰 감성 카페", category: "CAFE", address: "강원특별자치도 강릉시", distanceMeters: 850, source: "MOCK" },
      { id: "FOOD-001", title: "로컬 해산물 맛집", category: "RESTAURANT", address: "강원특별자치도 강릉시", distanceMeters: 1100, source: "MOCK" },
    ],
  }, placesDataset);

  console.log("\n[선택 장소 기반 하루 코스]");
  console.log(JSON.stringify(courseResult, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
