import assert from "node:assert/strict";
import { selectPlacePhotos, selectSceneCover } from "../src/services/place-photo-service";

const input = {
  placeId: "GOAT-001",
  placeName: "테스트 숲",
  city: "춘천시",
  selectionId: "quiet-forest",
  requiredPhotoTerms: ["숲"],
  preferredPhotoTerms: ["산책"],
};

const photos = [
  {
    provider: "KTO_PHOTO" as const,
    sourceRef: "1",
    url: "https://example.com/general.jpg",
    placeVerified: true,
    rightsConfirmed: true,
    title: "테스트 숲",
    photographyLocation: "춘천시 테스트 숲",
  },
  {
    provider: "KTO_PHOTO" as const,
    sourceRef: "2",
    url: "https://example.com/walk.jpg",
    placeVerified: true,
    rightsConfirmed: true,
    title: "테스트 숲 산책",
    photographyLocation: "춘천시 테스트 숲",
    keywords: ["숲", "산책"],
  },
];

const place = selectPlacePhotos(input, photos);
assert.equal(place.placeHero?.url, "https://example.com/walk.jpg");
assert.equal(place.galleryStatus, "AVAILABLE");

const cover = selectSceneCover(input, photos);
assert.equal(cover.kind, "PHOTO");
if (cover.kind === "PHOTO") assert.equal(cover.picturedPlaceId, input.placeId);

const fallback = selectSceneCover(input, [{ ...photos[0], url: "http://example.com/nope.jpg" }]);
assert.equal(fallback.kind, "EDITORIAL");

const rejected = selectPlacePhotos(input, [{ ...photos[0], placeVerified: false }]);
assert.equal(rejected.placeHero, null);

console.log("place photo selector verified");
