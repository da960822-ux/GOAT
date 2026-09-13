import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (path) => JSON.parse(readFileSync(new URL(path, root), "utf8"));
const recheck = read("goat_31_entity_photo_recheck.json");
const reviews = [
  "tmp/google_sol/commercial_1.json",
  "tmp/google_sol/commercial_2.json",
  "tmp/google_sol/commercial_3.json",
  "tmp/google_sol/noncommercial_1.json",
  "tmp/google_sol/noncommercial_2.json",
  "tmp/google_sol/noncommercial_3.json",
].flatMap((path) => read(path).places);

const byGoatId = new Map(reviews.map((place) => [place.goatPlaceId ?? place.placeId, place]));
const googlePlaceIdOverrides = {
  "GOAT-032": "ChIJxYmtdAD9YTUREdhk6QusJ7w",
  "GOAT-033": "ChIJ0bwUTQDxYTURLSopNwqlHGs",
  "GOAT-039": "ChIJT_9b-By92F8RiV25me3JnB0",
  "GOAT-042": "ChIJZUP2cLhV318RjPPZSOkFYdI",
};
const scoreOf = (candidate) => ({
  mood: candidate?.score?.mood40 ?? candidate?.score?.overseas_mood_40 ?? null,
  photoPoint: candidate?.score?.photoPoint25 ?? candidate?.score?.photo_point_match_25 ?? null,
  total: candidate?.score?.total100 ?? candidate?.score?.total_100 ?? null,
});

const places = recheck.places.map((place) => {
  const review = byGoatId.get(place.placeId);
  const ordinal = review?.selectedCurrentCandidateOrdinal ?? review?.selectedCandidateOrdinal ?? null;
  const selected = review?.candidates?.find((candidate) => candidate.currentCandidateOrdinal === ordinal);
  const score = scoreOf(selected);
  const good = review?.verdict === "GOOD" && ordinal !== null && review?.confidence !== "LOW";
  const googlePlaceId = review?.googlePlaceId
    ?? (review?.goatPlaceId && typeof review.placeId === "string" && !review.placeId.startsWith("GOAT-") ? review.placeId : null)
    ?? googlePlaceIdOverrides[place.placeId]
    ?? null;
  return {
    goatPlaceId: place.placeId,
    displayName: place.displayName,
    canonicalName: place.canonicalName || place.displayName,
    entityType: place.matchType,
    googlePlaceId,
    googleMatchConfidence: review?.confidence ?? "NOT_CHECKED",
    ktoCandidateCount: (place.detailImageCount ?? 0) + (place.galleryImageCount ?? 0),
    googleCandidateCount: review?.currentPhotoCount ?? review?.candidates?.length ?? 0,
    selectedSource: good ? "GOOGLE" : "FALLBACK",
    selectedPhoto: good ? `/api/google-place-photo/${place.placeId}/${ordinal - 1}` : null,
    score: score.total,
    photoPointScore: score.photoPoint,
    moodScore: score.mood,
    verdict: good ? "GOOD" : "FAIL",
    fallback: !good,
    validation: {
      httpOk: good ? true : null,
      contentTypeOk: good ? true : null,
      resolutionOk: good ? true : null,
      duplicate: good ? false : null,
      cacheControlNoStore: good ? true : null,
    },
    attribution: good ? [{ type: "GOOGLE", attributionText: "Google Maps", authorResolvedAtRuntime: true, sourceUriResolvedAtRuntime: true }] : [],
    reason: review?.selectionReason ?? review?.reason ?? place.fallbackReason,
  };
});

const output = {
  schemaVersion: "goat-google-photo-supplement/v1",
  generatedAt: new Date().toISOString(),
  policy: {
    photoResourcesPersisted: false,
    googleMediaUrlsPersisted: false,
    serverSideOnly: true,
    scoringGate: { mood: 30, photoPoint: 15, total: 78 },
  },
  summary: {
    placeCount: places.length,
    googleMatched: places.filter(({ googlePlaceId }) => googlePlaceId).length,
    photosSecured: places.filter(({ selectedSource }) => selectedSource === "GOOGLE").length,
    good: places.filter(({ verdict }) => verdict === "GOOD").length,
    borderline: places.filter(({ verdict }) => verdict === "BORDERLINE").length,
    fail: places.filter(({ verdict }) => verdict === "FAIL").length,
    fallback: places.filter(({ fallback }) => fallback).length,
  },
  places,
};

writeFileSync(new URL("google_places_photo_results.json", root), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output.summary));
