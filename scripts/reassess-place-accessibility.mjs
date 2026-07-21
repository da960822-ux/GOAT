import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const datasetPaths = [
  "lib/travel-domain/src/data/goat_simplified_scoring_tags_v10_accessibility_merged.json",
  "GOAT_backend_frontend_handoff_v1/COMMON_REFERENCE/source_files/goat_simplified_scoring_tags_v10_accessibility_merged.json",
  "GOAT_backend_frontend_handoff_v1/SEND_TO_BACKEND/data/goat_simplified_scoring_tags_v10_accessibility_merged.json",
].map((path) => resolve(root, path));

const grades = {
  "GOAT-001": ["중", "상"], "GOAT-002": ["상", "상"], "GOAT-003": ["중", "상"],
  "GOAT-004": ["하", "중"], "GOAT-005": ["하", "상"], "GOAT-006": ["중", "상"],
  "GOAT-007": ["하", "상"], "GOAT-008": ["하", "상"], "GOAT-009": ["하", "상"],
  "GOAT-010": ["상", "상"], "GOAT-011": ["하", "중"], "GOAT-012": ["하", "중"],
  "GOAT-013": ["상", "상"], "GOAT-014": ["중", "상"], "GOAT-015": ["하", "하"],
  "GOAT-016": ["중", "상"], "GOAT-017": ["하", "상"], "GOAT-018": ["하", "상"],
  "GOAT-019": ["중", "상"], "GOAT-020": ["중", "상"], "GOAT-021": ["상", "중"],
  "GOAT-022": ["하", "중"], "GOAT-023": ["하", "하"], "GOAT-024": ["상", "중"],
  "GOAT-025": ["중", "상"], "GOAT-026": ["중", "상"], "GOAT-027": ["중", "중"],
  "GOAT-028": ["상", "중"], "GOAT-029": ["하", "하"], "GOAT-030": ["하", "상"],
  "GOAT-031": ["상", "중"], "GOAT-032": ["하", "상"], "GOAT-033": ["하", "상"],
  "GOAT-034": ["중", "상"], "GOAT-035": ["중", "중"], "GOAT-036": ["상", "중"],
  "GOAT-037": ["중", "중"], "GOAT-038": ["상", "중"], "GOAT-039": ["중", "상"],
  "GOAT-040": ["중", "중"], "GOAT-041": ["중", "중"], "GOAT-042": ["중", "상"],
  "GOAT-043": ["중", "상"], "GOAT-044": ["중", "중"], "GOAT-045": ["하", "상"],
  "GOAT-046": ["하", "상"], "GOAT-047": ["중", "중"], "GOAT-048": ["하", "상"],
  "GOAT-049": ["중", "상"], "GOAT-050": ["중", "상"], "GOAT-051": ["중", "중"],
  "GOAT-052": ["중", "중"], "GOAT-053": ["중", "상"], "GOAT-054": ["중", "상"],
  "GOAT-055": ["중", "상"], "GOAT-056": ["중", "중"], "GOAT-057": ["하", "중"],
  "GOAT-058": ["중", "상"], "GOAT-059": ["중", "상"], "GOAT-060": ["중", "상"],
  "GOAT-061": ["중", "상"],
};

const allowedGrades = new Set(["상", "중", "하"]);
const apply = process.argv.includes("--apply");

function immutableProjection(place) {
  const { accessibility: _accessibility, ...immutable } = place;
  return immutable;
}

const sourceTexts = await Promise.all(datasetPaths.map((path) => readFile(path, "utf8")));
assert.equal(new Set(sourceTexts).size, 1, "수정 전 장소 데이터 복제본이 서로 다릅니다.");

const dataset = JSON.parse(sourceTexts[0]);
const managedPlaces = [...dataset.places, ...dataset.pending_places];
assert.equal(dataset.places.length, 61, "활성 장소 수는 61개여야 합니다.");
assert.equal(dataset.pending_places.length, 0, "추천에서 제외되는 검증 대기 장소가 없어야 합니다.");
assert.equal(managedPlaces.length, 61, "전체 관리 장소 수는 61개여야 합니다.");
assert.equal(new Set(managedPlaces.map(({ place_id }) => place_id)).size, 61, "place_id가 중복되었습니다.");
assert.equal(new Set(managedPlaces.map(({ place_name }) => place_name)).size, 61, "place_name이 중복되었습니다.");
assert.deepEqual(new Set(Object.keys(grades)), new Set(managedPlaces.map(({ place_id }) => place_id)), "등급표가 61개 장소를 정확히 포괄하지 않습니다.");

const beforeImmutable = managedPlaces.map(immutableProjection);
const changes = [];
for (const place of managedPlaces) {
  const [publicTransport, car] = grades[place.place_id];
  assert.ok(allowedGrades.has(publicTransport), `${place.place_id}.public_transport 등급이 잘못되었습니다.`);
  assert.ok(allowedGrades.has(car), `${place.place_id}.car 등급이 잘못되었습니다.`);
  const previous = { ...place.accessibility };
  place.accessibility = { public_transport: publicTransport, car };
  if (previous.public_transport !== publicTransport || previous.car !== car) {
    changes.push({ place_id: place.place_id, place_name: place.place_name, previous, next: place.accessibility });
  }
}

assert.deepEqual(managedPlaces.map(immutableProjection), beforeImmutable, "accessibility 이외의 값이 변경되었습니다.");
assert.deepEqual(managedPlaces.map(({ place_id }) => place_id), [...dataset.places, ...dataset.pending_places].map(({ place_id }) => place_id), "장소 순서가 변경되었습니다.");

if (apply) {
  const output = `${JSON.stringify(dataset, null, 2)}\n`;
  await Promise.all(datasetPaths.map((path) => writeFile(path, output, "utf8")));
}

console.log(`Accessibility reassessment ${apply ? "applied" : "checked"}: 61 managed places, ${changes.length} changed.`);
for (const change of changes) {
  console.log(`${change.place_id}\t${change.place_name}\t${change.previous.public_transport ?? "null"}/${change.previous.car ?? "null"}\t->\t${change.next.public_transport}/${change.next.car}`);
}
