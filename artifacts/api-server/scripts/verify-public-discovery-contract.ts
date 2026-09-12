import assert from "node:assert/strict";
import {
  createPublicRecommendationSchema,
  getPlacePhotosSchema,
  getSceneCoverSchema,
  replacePublicRecommendationCardSchema,
} from "../src/contracts/public-discovery";

assert.equal(
  createPublicRecommendationSchema.safeParse({ selectionId: "scene-a" })
    .success,
  true,
);
assert.equal(
  createPublicRecommendationSchema.safeParse({
    selectionId: "scene-a",
    companion: "친구",
  }).success,
  false,
);
assert.equal(
  getSceneCoverSchema.safeParse({ selectionId: "scene-a" }).success,
  true,
);
assert.equal(
  getPlacePhotosSchema.safeParse({ placeId: "place-a", selectionId: "scene-a" })
    .success,
  true,
);

const replacement = {
  selectionId: "scene-a",
  mode: "SCENE",
  revision: 1,
  snapshotAt: "2026-09-12T10:00:00.000Z",
  currentPlaceIds: ["a", "b", "c"],
  targetSlot: 3,
  seenIds: ["a", "b", "c"],
  replaceReason: "ANY",
};
assert.equal(
  replacePublicRecommendationCardSchema.safeParse(replacement).success,
  true,
);
assert.equal(
  replacePublicRecommendationCardSchema.safeParse({
    ...replacement,
    currentPlaceIds: ["a", "a", "c"],
  }).success,
  false,
);
assert.equal(
  replacePublicRecommendationCardSchema.safeParse({
    ...replacement,
    targetSlot: 1.5,
  }).success,
  false,
);

console.log("server public discovery schemas verified");
