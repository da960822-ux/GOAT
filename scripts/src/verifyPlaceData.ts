import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { recommendGoatPlaces } from "../../lib/travel-domain/src/goatRecommendationEngine";
import {
  evaluateCarAccessibility,
  evaluatePublicTransportAccessibility,
  getAccessibilityRecommendationScore,
} from "../../lib/travel-domain/src/accessibilityScoringPolicy";
import type {
  GoatPlace,
  GoatPlaceDataset,
  GoatReferenceCardDataset,
} from "../../lib/travel-domain/src/goatRecommendationTypes";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const activeAdditionIds = [55, 56, 57, 58].map((value) => `GOAT-${String(value).padStart(3, "0")}`);
const activatedFormerPendingIds = [59, 60, 61].map((value) => `GOAT-${String(value).padStart(3, "0")}`);
const controlledPlaceFields = [
  "primaryTheme",
  "mood_tags",
  "sceneTags",
  "place_type",
  "purpose_tags",
  "season_tags",
  "best_time",
  "city",
  "region_group",
  "recommendation_use",
] as const;
const requiredFields = [
  "place_id", "place_name", "city", "region_group", "primaryTheme", "mood_tags", "sceneTags", "place_type",
  "photo_point", "purpose_tags", "season_tags", "best_time", "accessibility", "recommendation_use", "note",
  "latitude", "longitude", "address", "coordinateSource",
] as const;

async function readJson<T>(rel: string): Promise<T> {
  return JSON.parse(await readFile(path.join(root, rel), "utf8")) as T;
}

function assertNoDuplicates(values: string[], label: string): void {
  assert.equal(new Set(values).size, values.length, `${label} 중복이 있습니다.`);
}

function assertPlaceSchema(place: GoatPlace, tagSets: Record<string, string[]>): void {
  for (const field of requiredFields) {
    assert.ok(Object.prototype.hasOwnProperty.call(place, field), `${place.place_id}: ${field} 필드가 없습니다.`);
  }
  for (const field of controlledPlaceFields) {
    const allowed = new Set(tagSets[field] ?? []);
    const rawValue = place[field];
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const value of values) {
      assert.equal(typeof value, "string", `${place.place_id}: ${field} 값이 문자열이 아닙니다.`);
      assert.ok(allowed.has(value), `${place.place_id}: ${field}의 통제어휘 밖 값 ${String(value)}`);
    }
  }
  const { latitude, longitude } = place;
  if (latitude != null || longitude != null) {
    assert.ok(typeof latitude === "number" && typeof longitude === "number", `${place.place_id}: latitude/longitude는 함께 숫자이거나 함께 null이어야 합니다.`);
    assert.ok(latitude >= -90 && latitude <= 90, `${place.place_id}: 위도 범위 오류`);
    assert.ok(longitude >= -180 && longitude <= 180, `${place.place_id}: 경도 범위 오류`);
  }
  assert.ok(["상", "중", "하"].includes(String(place.accessibility?.public_transport)), `${place.place_id}: public_transport 등급 오류`);
  assert.ok(["상", "중", "하"].includes(String(place.accessibility?.car)), `${place.place_id}: car 등급 오류`);
}

function allReferenceIds(dataset: GoatReferenceCardDataset): string[] {
  return dataset.reference_cards.flatMap((card) => [
    ...(card.examplePlaceIds ?? []),
    ...(card.coveragePlaceIds ?? []),
    ...(card.candidatePlaceIds ?? []),
  ]);
}

const canonical = await readJson<GoatPlaceDataset>("lib/travel-domain/src/data/goat_simplified_scoring_tags_v10_accessibility_merged.json");
const references = await readJson<GoatReferenceCardDataset>("lib/travel-domain/src/data/goat_reference_cards_v2_balanced.json");
const baseline = await readJson<Array<Record<string, unknown>>>("scripts/src/fixtures/maintained-place-tags-baseline.json");
const legacyPlaces = await readJson<Array<{ placeId: string; name: string }>>("lib/travel-domain/src/data/places.json");
const dbReady = await readJson<Array<{ place_id: string; place_name: string }>>("문서/goat_places_clean_db_ready.json");
const pending = canonical.pending_places ?? [];
const managed = [...canonical.places, ...pending];
const activeIds = canonical.places.map((place) => place.place_id);
const activeIdSet = new Set(activeIds);
const tagSets = canonical.tag_sets ?? {};

assert.equal(canonical.places.length, 61, "활성 장소 수");
assert.equal(pending.length, 0, "추천 제외 장소 수");
assert.equal(managed.length, 61, "전체 관리 장소 수");
assertNoDuplicates(managed.map((place) => place.place_id), "전체 place_id");
assertNoDuplicates(managed.map((place) => place.place_name), "전체 place_name");
assert.deepEqual(activeIds, Array.from({ length: 61 }, (_, index) => `GOAT-${String(index + 1).padStart(3, "0")}`), "place_id가 GOAT-001부터 GOAT-061까지 연속적이지 않음");

assert.equal(baseline.length, 54, "유지 장소 기준선 수");
for (const expected of baseline) {
  const actual = canonical.places.find((place) => place.place_id === expected.place_id);
  assert.ok(actual, `유지 장소가 없습니다: ${String(expected.place_id)}`);
  const baselineKeys = Object.keys(expected).filter((key) => key !== "accessibility");
  const comparable = Object.fromEntries(baselineKeys.map((key) => [key, actual[key]]));
  const expectedWithoutAccessibility = Object.fromEntries(baselineKeys.map((key) => [key, expected[key]]));
  assert.deepEqual(comparable, expectedWithoutAccessibility, `유지 장소 ID/태그가 변경됨: ${String(expected.place_id)}`);
}
for (const id of activeAdditionIds) assert.ok(activeIdSet.has(id), `즉시 활성 장소 누락: ${id}`);
for (const id of activatedFormerPendingIds) assert.ok(activeIdSet.has(id), `신규 활성 장소 누락: ${id}`);

for (const place of managed) assertPlaceSchema(place, tagSets);
for (const id of activatedFormerPendingIds) {
  assert.equal(canonical.places.find((place) => place.place_id === id)?.verification_status, "active_verified", `${id}: 활성 상태 누락`);
}

assert.equal(references.reference_cards.length, 21, "레퍼런스 카드 수");
const referenceIds = allReferenceIds(references);
for (const id of referenceIds) {
  assert.ok(activeIdSet.has(id), `레퍼런스 카드가 비활성/대기/존재하지 않는 ID를 참조함: ${id}`);
}
const candidateIds = new Set(references.reference_cards.flatMap((card) => card.candidatePlaceIds ?? []));
for (const id of activeIds) assert.ok(candidateIds.has(id), `추천 candidatePlaceIds에 연결되지 않은 장소: ${id}`);
for (const card of references.reference_cards) {
  assert.equal(card.candidateCount, card.candidatePlaceIds?.length ?? 0, `${card.referenceCardId}: candidateCount 불일치`);
  assert.equal(card.coverageCount, card.coveragePlaceIds?.length ?? 0, `${card.referenceCardId}: coverageCount 불일치`);
  assertNoDuplicates(card.candidatePlaceIds ?? [], `${card.referenceCardId} candidatePlaceIds`);
  assertNoDuplicates(card.coveragePlaceIds ?? [], `${card.referenceCardId} coveragePlaceIds`);
}
const coverageIds = references.reference_cards.flatMap((card) => card.coveragePlaceIds ?? []);
assert.equal(coverageIds.length, 61, "coverage 전체 수");
assertNoDuplicates(coverageIds, "coveragePlaceIds 전체");
assert.deepEqual([...coverageIds].sort(), [...activeIds].sort(), "coverage가 활성 61개를 정확히 한 번씩 포함하지 않음");

const requiredNewLinks: Record<string, string> = {
  [activeAdditionIds[0]]: "REF_RESORT_01",
  [activeAdditionIds[1]]: "REF_NATURE_02",
  [activeAdditionIds[2]]: "REF_NATURE_01",
  [activeAdditionIds[3]]: "REF_NATURE_02",
  [activatedFormerPendingIds[0]]: "REF_RESORT_03",
  [activatedFormerPendingIds[1]]: "REF_NATURE_02",
  [activatedFormerPendingIds[2]]: "REF_ALPS_03",
};
for (const [placeId, cardId] of Object.entries(requiredNewLinks)) {
  const card = references.reference_cards.find((item) => item.referenceCardId === cardId);
  assert.ok(card?.candidatePlaceIds?.includes(placeId), `${placeId}: 의미상 대표 카드 candidate 연결 누락`);
  assert.ok(card?.coveragePlaceIds?.includes(placeId), `${placeId}: 의미상 대표 카드 coverage 연결 누락`);
}

assert.deepEqual(legacyPlaces.map(({ placeId }) => placeId).sort(), [...activeIds].sort(), "places.json 활성 ID 불일치");
assert.deepEqual(dbReady.map(({ place_id }) => place_id).sort(), [...activeIds].sort(), "DB-ready JSON 활성 ID 불일치");
for (const rel of [
  "GOAT_backend_frontend_handoff_v1/SEND_TO_BACKEND/data/goat_simplified_scoring_tags_v10_accessibility_merged.json",
  "GOAT_backend_frontend_handoff_v1/COMMON_REFERENCE/source_files/goat_simplified_scoring_tags_v10_accessibility_merged.json",
]) assert.deepEqual(await readJson(rel), canonical, `${rel}: canonical 복제본 불일치`);
for (const rel of [
  "GOAT_backend_frontend_handoff_v1/SEND_TO_BACKEND/data/goat_reference_cards_v2_balanced.json",
  "GOAT_backend_frontend_handoff_v1/SEND_TO_FRONTEND/data/goat_reference_cards_v2_balanced.json",
  "GOAT_backend_frontend_handoff_v1/COMMON_REFERENCE/source_files/goat_reference_cards_v2_balanced.json",
]) assert.deepEqual(await readJson(rel), references, `${rel}: reference card 복제본 불일치`);

const themes = tagSets.primaryTheme ?? [];
assert.equal(themes.length, 7, "primaryTheme 수");
for (const theme of themes) {
  const referenceCard = references.reference_cards.find((card) => card.primaryTheme === theme);
  assert.ok(referenceCard, `${theme}: 레퍼런스 카드 없음`);
  const result = recommendGoatPlaces({
    referenceCardId: referenceCard.referenceCardId,
    currentMonth: 7,
    currentDate: "2026-07-14",
    debug: true,
    enableWarningLog: false,
  }, canonical, references);
  assert.equal(result.status, "DONE", `${theme}: 추천 실패`);
  assert.equal(result.resultData?.cards.length, 3, `${theme}: 카드 3개 미반환`);
  assert.deepEqual(result.resultData?.cards.map((card) => card.role), ["BEST_SCENE", "SAME_MOOD_ALTERNATIVE", "CONDITION_FIT_ALTERNATIVE"], `${theme}: 카드 역할/순서 변경`);
  assertNoDuplicates(result.resultData?.cards.map((card) => card.placeId) ?? [], `${theme} 추천 카드 ID`);
  for (const card of result.resultData?.cards ?? []) {
    assert.ok(card.score.baseScore <= 90, `${theme}: 기존 baseScore 상한 초과`);
    assert.ok(card.score.displayScore <= 100, `${theme}: 기존 displayScore 상한 초과`);
  }
}

const natureCard = references.reference_cards.find((card) => card.referenceCardId === "REF_NATURE_02");
assert.ok(natureCard, "고석정 조건 테스트용 레퍼런스 카드 누락");
const natureCardId = natureCard.referenceCardId;
function scoredIds(currentDate?: string): string[] {
  const result = recommendGoatPlaces({
    referenceCardId: natureCardId,
    currentMonth: currentDate ? Number(currentDate.slice(5, 7)) : 5,
    currentDate,
    debug: true,
    enableWarningLog: false,
  }, canonical, references);
  assert.equal(result.status, "DONE", `고석정 운영조건 테스트 실패: ${currentDate ?? "날짜 미상"}`);
  return result.resultData?.debug?.scoredCandidates.map((candidate) => candidate.placeId) ?? [];
}
assert.ok(scoredIds("2026-05-20").includes(activeAdditionIds[3]), "고석정 꽃밭이 확인된 운영기간에 후보로 포함되지 않음");
assert.ok(!scoredIds("2026-07-14").includes(activeAdditionIds[3]), "고석정 꽃밭이 비운영기간에 후보로 노출됨");
assert.ok(!scoredIds().includes(activeAdditionIds[3]), "고석정 꽃밭이 날짜 미상 상태에서 후보로 노출됨");

const scoringFixture = structuredClone(canonical);
scoringFixture.places = canonical.places.slice(0, 3).map((place, index) => ({
  ...structuredClone(place),
  place_id: `ACCESS-${index + 1}`,
  place_name: `접근성 검증 ${index + 1}`,
  primaryTheme: canonical.places[0].primaryTheme,
  accessibility: {
    public_transport: ["상", "중", "하"][index],
    car: ["하", "중", "상"][index],
  },
}));
scoringFixture.pending_places = [];

for (const transportType of ["대중교통", "자차"] as const) {
  const accessResult = recommendGoatPlaces({
    primaryTheme: scoringFixture.places[0].primaryTheme,
    transportType,
    currentDate: "2026-07-14",
    debug: true,
    enableWarningLog: false,
  }, scoringFixture);
  assert.equal(accessResult.status, "DONE", `${transportType} 접근성 점수 검증 실패`);
  assert.ok(accessResult.resultData, `${transportType} 접근성 결과 누락`);
  for (const card of accessResult.resultData.cards) {
    const grade = transportType === "자차" ? card.accessibility.car : card.accessibility.public_transport;
    assert.equal(card.score.conditionScore.accessibility.grade, grade, `${transportType} 필드 선택 오류`);
    assert.equal(card.score.conditionScore.accessibility.score, { 상: 12, 중: 7, 하: 1 }[grade as "상" | "중" | "하"], `${grade} 접근성 배점 오류`);
  }
}

const invalidFixture = structuredClone(scoringFixture);
invalidFixture.places[0].accessibility.car = "INVALID";
const invalidAccessResult = recommendGoatPlaces({
  primaryTheme: invalidFixture.places[0].primaryTheme,
  transportType: "자차",
  currentDate: "2026-07-14",
  enableWarningLog: false,
}, invalidFixture);
assert.ok(invalidAccessResult.resultData, "비정상 접근성 fallback 결과 누락");
const invalidAccessCard = invalidAccessResult.resultData.cards.find(({ placeId }) => placeId === "ACCESS-1");
assert.ok(invalidAccessCard, "비정상 접근성 검증 카드 누락");
assert.equal(invalidAccessCard.score.conditionScore.accessibility.score, 0, "잘못된 접근성 값은 안전한 0점 fallback이어야 함");

const timeRequest = {
  primaryTheme: scoringFixture.places[0].primaryTheme,
  currentDate: "2026-07-14",
  enableWarningLog: false,
};
const morningResult = recommendGoatPlaces({ ...timeRequest, visitTime: "오전" }, scoringFixture);
const nightResult = recommendGoatPlaces({ ...timeRequest, visitTime: "야간" }, scoringFixture);
assert.deepEqual(
  morningResult.resultData?.cards.map(({ placeId, score }) => [placeId, score.baseScore]),
  nightResult.resultData?.cards.map(({ placeId, score }) => [placeId, score.baseScore]),
  "visitTime/best_time이 점수 계산에 영향을 줌",
);

const walkResult = recommendGoatPlaces({
  ...timeRequest,
  transportType: "도보중심",
}, scoringFixture);
assert.ok(walkResult.resultData?.cards.every((card) => card.score.conditionScore.accessibility.inferred === true), "도보중심이 별도 기존 추론 로직을 사용하지 않음");

assert.equal(evaluatePublicTransportAccessibility({
  hubConnection: "easy",
  transfers: 1,
  typicalHeadwayMinutes: 30,
  finalWalkMinutes: 15,
  finalWalkCondition: "safe",
  taxiDependency: "none",
  serviceStability: "stable",
}).grade, "상", "대중교통 상 기준 오류");
assert.equal(evaluatePublicTransportAccessibility({
  hubConnection: "transfer_required",
  transfers: 2,
  typicalHeadwayMinutes: 45,
  finalWalkMinutes: 25,
  finalWalkCondition: "difficult",
  taxiDependency: "optional",
  serviceStability: "limited",
}).grade, "중", "대중교통 중 기준 오류");
assert.equal(evaluatePublicTransportAccessibility({
  hubConnection: "easy",
  transfers: 3,
  typicalHeadwayMinutes: 30,
  finalWalkMinutes: 10,
  finalWalkCondition: "safe",
  taxiDependency: "none",
  serviceStability: "stable",
}).grade, "하", "대중교통 과다 환승 하향 기준 오류");
assert.equal(evaluatePublicTransportAccessibility({
  hubConnection: "easy",
  transfers: 0,
  typicalHeadwayMinutes: 20,
  finalWalkMinutes: 35,
  finalWalkCondition: "safe",
  taxiDependency: "none",
  serviceStability: "stable",
}).grade, "하", "대중교통 마지막 도보 하향 기준 오류");
assert.equal(evaluatePublicTransportAccessibility({ transfers: 1 }).reviewRequired, true, "대중교통 정보 부족 검토 처리 오류");

assert.equal(evaluateCarAccessibility({
  roadAccess: "easy",
  parking: "ample",
  walkFromParkingMinutes: 10,
  generalVehicleAccess: "allowed",
  seasonalRestriction: "none",
}).grade, "상", "자차 상 기준 오류");
assert.equal(evaluateCarAccessibility({
  roadAccess: "narrow_or_steep",
  parking: "limited",
  walkFromParkingMinutes: 20,
  generalVehicleAccess: "caution",
  seasonalRestriction: "possible",
}).grade, "중", "자차 중 기준 오류");
assert.equal(evaluateCarAccessibility({
  roadAccess: "difficult_or_unpaved",
  parking: "ample",
  walkFromParkingMinutes: 5,
  generalVehicleAccess: "allowed",
  seasonalRestriction: "none",
}).grade, "하", "자차 험로 하향 기준 오류");
assert.equal(evaluateCarAccessibility({ parking: "ample" }).reviewRequired, true, "자차 정보 부족 검토 처리 오류");
assert.deepEqual(
  ["상", "중", "하", "INVALID"].map(getAccessibilityRecommendationScore),
  [12, 7, 1, 0],
  "접근성 추천 배점 또는 fallback 오류",
);

console.log("Place data verification passed: active=61, pending=0, managed=61, contiguous IDs=61, candidates=61, coverage=61 unique, cards=21, themes=7.");
