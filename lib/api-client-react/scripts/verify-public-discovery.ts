import assert from "node:assert/strict";
import {
  CreatePublicRecommendationBody,
  CreatePublicRecommendationResponse,
  GetSceneCoverResponse,
  ReplacePublicRecommendationCardBody,
} from "../../api-zod/src/index";
import { createLatestRequest } from "../src/latest-request";
import { getPhotoCachePolicy } from "../src/photo-cache-policy";
import { buildPublicPlaceShare } from "../src/public-place-share";

assert.deepEqual(
  CreatePublicRecommendationBody.parse({ selectionId: "scene-a" }),
  {
    selectionId: "scene-a",
  },
);
assert.equal(
  CreatePublicRecommendationBody.safeParse({
    selectionId: "scene-a",
    transportType: "UNSELECTED",
  }).success,
  false,
);
assert.equal(
  CreatePublicRecommendationBody.safeParse({
    selectionId: "scene-a",
    transportType: "CAR",
  }).success,
  true,
);

assert.equal(
  ReplacePublicRecommendationCardBody.safeParse({
    selectionId: "scene-a",
    mode: "SCENE",
    revision: 1,
    snapshotAt: "2026-09-12T10:00:00.000Z",
    currentPlaceIds: ["a", "b", "c"],
    targetSlot: 3,
    seenIds: ["a", "b", "c"],
    replaceReason: "ANY",
  }).success,
  true,
);

const response = CreatePublicRecommendationResponse.parse({
  success: true,
  code: "SUCCESS",
  message: "추천 장소를 조회했습니다.",
  data: {
    policyVersion: "goat-discovery-r4",
    catalogVersion: "catalog-1",
    selectionId: "scene-a",
    mode: "SCENE",
    cards: [1, 2, 3].map((slot) => ({
      placeId: `place-${slot}`,
      matchType: slot === 3 ? "EXPANDED" : "EXACT",
      sceneFitBand: "RICH",
      matchedFeatures: ["coast"],
      differenceNote: slot === 3 ? "범위를 넓혔어요" : null,
      placeHero: null,
      galleryStatus: "NOT_REQUESTED",
      conditions: [],
      sourceAttributions: [],
      replacementCount: slot === 3 ? 1 : 0,
      replaceOptions: slot === 3 ? ["ANY"] : [],
      canReplace: slot === 3,
    })),
    revision: 1,
    snapshotAt: "2026-09-12T10:00:00.000Z",
    todayStatus: "NOT_REQUESTED",
    appliedFactors: [],
    skippedFactors: [],
    partialApplied: false,
  },
});
assert.equal(response.data.cards.length, 3);
assert.equal(response.data.cards[2]?.replacementCount, 1);

const photoCover = {
  success: true,
  code: "SUCCESS",
  message: "장면 커버를 조회했습니다.",
  data: {
    selectionId: "scene-a",
    kind: "PHOTO",
    photo: {
      photoId: "photo-a",
      placeId: "place-a",
      provider: "KTO_PHOTO",
      sourceRef: "source-a",
      url: "https://images.example/photo.jpg",
      keywords: [],
      attribution: { label: "출처: ⓒ한국관광공사" },
      licenseStatus: "CONFIRMED",
      cropPermission: "DENIED",
      identityStatus: "MATCHED",
      contentFit: "contain",
      cacheEnabled: false,
      shareAllowed: false,
    },
    picturedPlaceId: "place-a",
    picturedPlaceName: "장소 A",
    sourceAttributions: [{ label: "출처: ⓒ한국관광공사" }],
  },
};
assert.equal(GetSceneCoverResponse.safeParse(photoCover).success, true);
assert.equal(
  GetSceneCoverResponse.safeParse({
    ...photoCover,
    data: {
      ...photoCover.data,
      photo: { ...photoCover.data.photo, cacheEnabled: undefined },
    },
  }).success,
  false,
);
assert.equal(getPhotoCachePolicy(photoCover.data.photo), "none");
assert.equal(getPhotoCachePolicy({ cacheEnabled: true }), "memory-disk");

const latest = createLatestRequest();
const first = latest.begin();
const second = latest.begin();
assert.equal(latest.isLatest(first), false);
assert.equal(latest.isLatest(second), true);

assert.deepEqual(
  buildPublicPlaceShare("https://goat.example/app", "place a", "장소명"),
  {
    title: "장소명",
    url: "https://goat.example/detail/place%20a",
    message: "장소명\nhttps://goat.example/detail/place%20a",
  },
);

console.log("public discovery contract verified");
