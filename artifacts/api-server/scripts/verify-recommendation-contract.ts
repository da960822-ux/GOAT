import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  COMPANION_OPTIONS,
  MOOD_IDS,
  REFERENCE_CARD_IDS,
  TRANSPORT_OPTIONS,
  TRAVEL_PURPOSE_OPTIONS,
  VISIT_TIME_OPTIONS,
  type RecommendationSelection,
} from "@workspace/travel-domain/catalog";
import { CreateRecommendationBody } from "@workspace/api-zod";
import type { CreateRecommendationRequest } from "@workspace/api-client-react";

const moodSelection = {
  method: "mood",
  moodId: "sea-coast",
} satisfies RecommendationSelection;
const referenceSelection = {
  method: "reference",
  referenceCardId: "REF_SEA_01",
} satisfies RecommendationSelection;
const moodRequest = {
  moodId: moodSelection.moodId,
} satisfies CreateRecommendationRequest;
const referenceRequest = {
  referenceCardId: referenceSelection.referenceCardId,
} satisfies CreateRecommendationRequest;

assert.equal(MOOD_IDS.length, 7);
assert.equal(new Set(MOOD_IDS).size, 7);
assert.equal(REFERENCE_CARD_IDS.length, 21);
assert.equal(new Set(REFERENCE_CARD_IDS).size, 21);

const moodCatalog = JSON.parse(
  await readFile(
    new URL(
      "../../../lib/travel-domain/src/data/mood-categories.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as Array<{ id: string }>;
const referenceCatalog = JSON.parse(
  await readFile(
    new URL(
      "../../../lib/travel-domain/src/data/goat_reference_cards_v2_balanced.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as { reference_cards: Array<{ referenceCardId: string }> };

assert.deepEqual(
  moodCatalog.map(({ id }) => id),
  [...MOOD_IDS],
);
assert.deepEqual(
  referenceCatalog.reference_cards.map(
    ({ referenceCardId }) => referenceCardId,
  ),
  [...REFERENCE_CARD_IDS],
);

assert.equal(CreateRecommendationBody.safeParse(moodRequest).success, true);
assert.equal(
  CreateRecommendationBody.safeParse(referenceRequest).success,
  true,
);
assert.equal(CreateRecommendationBody.safeParse({}).success, false);
assert.equal(
  CreateRecommendationBody.safeParse({
    moodId: "sea-coast",
    referenceCardId: "REF_SEA_01",
  }).success,
  false,
);
assert.equal(
  CreateRecommendationBody.safeParse({ moodId: "not-a-mood" }).success,
  false,
);
assert.equal(
  CreateRecommendationBody.safeParse({
    referenceCardId: "REF_NOT_REAL",
  }).success,
  false,
);

assert.deepEqual(COMPANION_OPTIONS, [
  { label: "나 혼자", value: "혼자" },
  { label: "연인과", value: "연인" },
  { label: "친구와", value: "친구" },
  { label: "가족과", value: "가족" },
]);
assert.deepEqual(TRANSPORT_OPTIONS, [
  { label: "자가용", value: "자차" },
  { label: "대중교통", value: "대중교통" },
  { label: "도보 중심", value: "도보중심" },
]);
assert.deepEqual(VISIT_TIME_OPTIONS, [
  { label: "아침", value: "오전" },
  { label: "낮", value: "한낮" },
  { label: "해질녘", value: "저녁" },
  { label: "밤", value: "야간" },
]);
assert.deepEqual(TRAVEL_PURPOSE_OPTIONS, [
  { label: "산책과 힐링", value: "가볍게 산책" },
  { label: "사진과 기록", value: "사진 위주" },
  { label: "가벼운 활동", value: "액티비티" },
  { label: "조용한 휴식", value: "조용한 휴식" },
]);

console.log("Recommendation domain/API contract verification passed.");
