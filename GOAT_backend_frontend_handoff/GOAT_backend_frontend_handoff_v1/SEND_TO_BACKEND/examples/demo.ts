import { recommendGoatPlaces } from "../src";
import placesDataset from "../data/goat_simplified_scoring_tags_v10_accessibility_merged.json";
import referenceDataset from "../data/goat_reference_cards_v2_balanced.json";
import samples from "./sampleRequests.json";

for (const sample of samples as Array<{ name: string; request: Record<string, unknown> }>) {
  const result = recommendGoatPlaces(sample.request, placesDataset, referenceDataset);
  console.log(`\n# ${sample.name}`);
  console.log(result.message, "평균점수:", result.score);
  for (const card of result.resultData?.cards ?? []) {
    console.log(`${card.rank}. [${card.roleLabel}] ${card.placeId} ${card.placeName} / ${card.score.displayScore}점`);
    console.log(`   이유: ${card.reasons.join(" | ")}`);
  }
}
