import { recommendGoatPlacesFromPhotoAnalysis } from "../src";
import placesDataset from "../data/goat_simplified_scoring_tags_v10_accessibility_merged.json";
import referenceDataset from "../data/goat_reference_cards_v2_balanced.json";

const result = recommendGoatPlacesFromPhotoAnalysis(
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

console.log(JSON.stringify(result, null, 2));
