import assert from "node:assert/strict";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const canonicalRel = "lib/travel-domain/src/data/goat_simplified_scoring_tags_v10_accessibility_merged.json";
const canonicalCopies = [
  canonicalRel,
  "GOAT_backend_frontend_handoff_v1/SEND_TO_BACKEND/data/goat_simplified_scoring_tags_v10_accessibility_merged.json",
  "GOAT_backend_frontend_handoff_v1/COMMON_REFERENCE/source_files/goat_simplified_scoring_tags_v10_accessibility_merged.json",
];
const referenceRel = "lib/travel-domain/src/data/goat_reference_cards_v2_balanced.json";
const referenceCopies = [
  referenceRel,
  "GOAT_backend_frontend_handoff_v1/SEND_TO_BACKEND/data/goat_reference_cards_v2_balanced.json",
  "GOAT_backend_frontend_handoff_v1/SEND_TO_FRONTEND/data/goat_reference_cards_v2_balanced.json",
  "GOAT_backend_frontend_handoff_v1/COMMON_REFERENCE/source_files/goat_reference_cards_v2_balanced.json",
];
const structuralFiles = new Set([
  ...canonicalCopies,
  ...referenceCopies,
  "lib/travel-domain/src/data/places.json",
  "문서/goat_places_clean_db_ready.json",
  "scripts/src/fixtures/maintained-place-tags-baseline.json",
]);

const readJson = async (rel) => JSON.parse(await readFile(path.join(root, rel), "utf8"));
const writeJson = async (rel, value) => writeFile(path.join(root, rel), `${JSON.stringify(value, null, 2)}\n`, "utf8");

const original = await readJson(canonicalRel);
const originalManaged = [...original.places, ...(original.pending_places ?? [])];
const alreadyRenumbered = original.places.length === 61
  && (original.pending_places ?? []).length === 0
  && original.places.every((place, index) => place.place_id === `GOAT-${String(index + 1).padStart(3, "0")}`);

if (alreadyRenumbered) {
  console.log("Place IDs are already GOAT-001..GOAT-061 and all places are active.");
  process.exit(0);
}

assert.equal(original.places.length, 58, "Expected 58 existing recommendation candidates.");
assert.equal(original.pending_places?.length, 3, "Expected 3 pending places.");
assert.equal(originalManaged.length, 61, "Expected 61 managed places.");

const idMap = new Map(originalManaged.map((place, index) => [
  place.place_id,
  `GOAT-${String(index + 1).padStart(3, "0")}`,
]));
assert.equal(idMap.size, 61, "Original place IDs must be unique.");

function remap(value) {
  if (typeof value === "string") return idMap.get(value) ?? value;
  if (Array.isArray(value)) return value.map(remap);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [idMap.get(key) ?? key, remap(child)]));
  }
  return value;
}

const formerPending = original.pending_places.map((place) => ({
  ...place,
  verification_status: "active_verified",
}));
const canonical = remap({
  ...original,
  places: [...original.places, ...formerPending],
  pending_places: [],
});
assert.deepEqual(
  canonical.places.map((place) => place.place_id),
  Array.from({ length: 61 }, (_, index) => `GOAT-${String(index + 1).padStart(3, "0")}`),
  "Renumbered IDs must be contiguous.",
);
for (const rel of canonicalCopies) await writeJson(rel, canonical);

const references = remap(await readJson(referenceRel));
const newCoverageLinks = new Map([
  ["GOAT-059", "REF_RESORT_03"],
  ["GOAT-060", "REF_NATURE_02"],
  ["GOAT-061", "REF_ALPS_03"],
]);
for (const [placeId, referenceCardId] of newCoverageLinks) {
  const card = references.reference_cards.find((item) => item.referenceCardId === referenceCardId);
  assert.ok(card, `Missing reference card: ${referenceCardId}`);
  card.candidatePlaceIds = [...new Set([...(card.candidatePlaceIds ?? []), placeId])];
  card.coveragePlaceIds = [...new Set([...(card.coveragePlaceIds ?? []), placeId])];
  card.candidateCount = card.candidatePlaceIds.length;
  card.coverageCount = card.coveragePlaceIds.length;
}
for (const rel of referenceCopies) await writeJson(rel, references);

const baselineRel = "scripts/src/fixtures/maintained-place-tags-baseline.json";
await writeJson(baselineRel, remap(await readJson(baselineRel)));

function legacyPlace(place) {
  const searchTags = [...new Set([...(place.mood_tags ?? []), ...(place.sceneTags ?? []), ...(place.purpose_tags ?? [])])];
  const query = `${place.city} ${place.place_name}`;
  return {
    placeId: place.place_id,
    name: place.place_name,
    city: place.city,
    regionGroup: place.region_group,
    placeType: place.place_type,
    primaryMood: place.primaryTheme,
    moodTags: place.mood_tags,
    searchTags,
    photoPoint: place.photo_point,
    bestTime: [place.best_time],
    bestTimeRaw: place.best_time,
    bestSeason: place.season_tags,
    bestSeasonRaw: (place.season_tags ?? []).join(","),
    accessibility: {
      publicTransport: place.accessibility.public_transport,
      car: place.accessibility.car,
      raw: `대중교통 ${place.accessibility.public_transport} / 자차 ${place.accessibility.car}`,
    },
    dataStatus: "review_required",
    recommendationUse: place.recommendation_use,
    note: place.note,
    isRecommendationCandidate: true,
    imageUrl: place.imageUrl ?? null,
    address: place.address ?? null,
    latitude: place.latitude ?? null,
    longitude: place.longitude ?? null,
    mapSearchQuery: query,
    externalMapQueries: { kakao: query, naver: query, tmap: query },
  };
}

function dbPlace(place) {
  return {
    place_id: place.place_id,
    city: place.city,
    region_group: place.region_group,
    place_name: place.place_name,
    place_type: place.place_type,
    primary_mood: place.primaryTheme,
    primary_theme: place.primaryTheme,
    mood_tags: (place.mood_tags ?? []).join(","),
    scene_tags: (place.sceneTags ?? []).join(","),
    purpose_tags: (place.purpose_tags ?? []).join(","),
    photo_point: place.photo_point,
    best_time: place.best_time,
    best_season: (place.season_tags ?? []).join(","),
    accessibility: `대중교통 ${place.accessibility.public_transport} / 자차 ${place.accessibility.car}`,
    data_status: "review_required",
    recommendation_use: place.recommendation_use,
    note: place.note,
    address: place.address ?? null,
    latitude: place.latitude ?? null,
    longitude: place.longitude ?? null,
    coordinate_source: place.coordinateSource ?? null,
    image_url: place.imageUrl ?? null,
  };
}

const activatedIds = new Set(["GOAT-059", "GOAT-060", "GOAT-061"]);
const activatedPlaces = canonical.places.filter((place) => activatedIds.has(place.place_id));
const legacyRel = "lib/travel-domain/src/data/places.json";
const legacy = remap(await readJson(legacyRel));
await writeJson(legacyRel, [...legacy, ...activatedPlaces.map(legacyPlace)]);
const dbRel = "문서/goat_places_clean_db_ready.json";
const db = remap(await readJson(dbRel));
await writeJson(dbRel, [...db, ...activatedPlaces.map(dbPlace)]);

const textExtensions = new Set([".md", ".txt", ".ts", ".tsx", ".js", ".mjs", ".json"]);
const excludedDirectories = new Set([".git", "node_modules", "dist", "build"]);
const thisScript = path.normalize("scripts/renumber-and-activate-all-places.mjs");

async function updateRemainingTextFiles(directory = root) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (excludedDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await updateRemainingTextFiles(absolute);
      continue;
    }
    const relative = path.normalize(path.relative(root, absolute));
    if (relative === thisScript || structuralFiles.has(relative.replaceAll("\\", "/"))) continue;
    if (!textExtensions.has(path.extname(entry.name))) continue;
    const before = await readFile(absolute, "utf8");
    const after = before.replace(/GOAT-\d{3}/g, (id) => idMap.get(id) ?? id);
    if (after !== before) await writeFile(absolute, after, "utf8");
  }
}

await updateRemainingTextFiles();
console.log("Renumbered 61 places to GOAT-001..GOAT-061 and activated all candidates.");
