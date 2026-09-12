import assert from "node:assert/strict";
import placesData from "../../lib/travel-domain/src/data/goat_simplified_scoring_tags_v10_accessibility_merged.json";
import {
  buildDiscoverySession,
  computeSelectionAvailability,
  derivePlaceRelation,
  getPhotoSearchHints,
  getReplacementCandidates,
  normalizePlaceFeatures,
  rankDiscoveryCandidates,
  replaceDiscoveryCard,
  type DiscoveryPlace,
  type SelectionDefinition,
} from "../../lib/travel-domain/src/discoveryRecommendation";
import {
  DISCOVERY_CATALOG_VERSION,
  discoverySelectionCatalog,
  publicDiscoverySelections,
} from "../../lib/travel-domain/src/catalog";

const SNAPSHOT_AT = "2026-09-13T00:00:00.000Z";

const selection: SelectionDefinition = {
  selectionId: "test-scene",
  kind: "SCENE",
  title: "테스트 장면",
  description: "관계와 교체 규칙 회귀용",
  featuredOrder: 1,
  parentMoodId: null,
  protectedFeatures: ["바다"],
  requiredFeatures: ["바다", "철길", "카페"],
  supportingFeatures: ["조용함", "일몰"],
  allowedExpansion: [
    {
      ruleId: "coast-road",
      relaxedFeatures: ["철길", "카페"],
      substituteFeatures: ["해안도로"],
      explanation: "철길과 카페 대신 해안도로까지 넓혔어요.",
    },
  ],
  sceneCoverCandidates: [],
  sceneCoverToken: "test",
};

const place = (
  placeId: string,
  features: string[],
  accessibility: DiscoveryPlace["accessibility"] = {},
): DiscoveryPlace => ({
  place_id: placeId,
  place_name: placeId,
  city: "테스트시",
  region_group: "테스트권",
  primaryTheme: "테스트",
  mood_tags: features,
  sceneTags: [],
  place_type: "테스트",
  photo_point: "",
  purpose_tags: [],
  season_tags: [],
  best_time: "오후",
  accessibility,
  recommendation_use: "",
});

const A = place("A", ["바다", "철길", "카페", "조용함"]);
const B = place("B", ["바다", "철길"]);
const C = place("C", ["바다", "해안도로"]);
const D = place("D", ["바다", "해안도로"]);

assert.equal(
  normalizePlaceFeatures(place("mood-only", ["일본감성"]), ["철길"]).철길
    ?.state,
  "UNCONFIRMED",
  "무드 태그만으로 물리 특징을 만들면 안 된다.",
);
assert.equal(
  normalizePlaceFeatures(
    { ...place("legacy-use", []), recommendation_use: "바다 추천" },
    ["바다"],
  ).바다?.state,
  "UNCONFIRMED",
  "구 추천 용도 문구를 관계 사실로 순환 사용하면 안 된다.",
);

assert.deepEqual(
  [A, B, C, place("N", ["산"])].map(
    (candidate) => derivePlaceRelation(selection, candidate).matchType,
  ),
  ["EXACT", "SIMILAR", "EXPANDED", "NONE"],
);
assert.equal(derivePlaceRelation(selection, A).sceneFitBand, "RICH");
assert.equal(derivePlaceRelation(selection, B).sceneFitBand, "BASE");
assert.match(
  derivePlaceRelation(selection, C).differenceNote ?? "",
  /해안도로/,
);
assert.equal(
  derivePlaceRelation(selection, { ...B, contradictedFeatures: ["카페"] })
    .matchType,
  "NONE",
  "필수 특징의 명시적 부정은 SIMILAR가 될 수 없다.",
);
assert.equal(
  derivePlaceRelation(selection, { ...C, contradictedFeatures: ["바다"] })
    .matchType,
  "NONE",
  "확장도 protected 특징을 버릴 수 없다.",
);
assert.equal(
  normalizePlaceFeatures({ ...C, contradictedFeatures: ["바다"] }, ["바다"])
    .바다?.state,
  "UNCONFIRMED",
  "같은 특징의 긍정·부정 충돌은 긍정으로 선택하지 않는다.",
);
assert.equal(
  computeSelectionAvailability({ ...selection, protectedFeatures: [] }, [
    A,
    B,
    C,
  ]).availability,
  "RULE_INCOMPLETE",
);
assert.equal(
  computeSelectionAvailability(
    { ...selection, supportingFeatures: ["조용함", "조용함"] },
    [A, B, C],
  ).availability,
  "RULE_INCOMPLETE",
  "카탈로그 특징 집합의 중복은 규칙 불완전이다.",
);
assert.deepEqual(
  getPhotoSearchHints(selection, { ...A, sceneTags: ["조용함"] }),
  {
    kind: "SEARCH_HINT",
    selectionId: "test-scene",
    placeId: "A",
    requiredTags: ["바다", "철길", "카페"],
    preferredTags: ["조용함"],
    avoidTags: ["지도", "메뉴", "안내판"],
    cropHint: "CENTER",
    heroAspect: "4:5",
  },
);

assert.deepEqual(computeSelectionAvailability(selection, [A, B, C, D]), {
  enabled: true,
  availability: "AVAILABLE",
  exactCount: 1,
  exactOrSimilarCount: 2,
  eligibleCount: 4,
});
assert.equal(
  computeSelectionAvailability(selection, [
    { ...A, contentId: "same" },
    { ...B, contentId: "same" },
    C,
    D,
  ]).eligibleCount,
  3,
  "확인된 동일 contentId만 중복 장소로 제외한다.",
);

const initial = buildDiscoverySession({
  selection,
  places: [D, C, B, A],
  request: { selectionId: selection.selectionId, mode: "SCENE" },
  snapshotAt: SNAPSHOT_AT,
  revision: 4,
});
assert.deepEqual(
  initial.cards.map(({ placeId }) => placeId),
  ["A", "B", "C"],
);
assert.deepEqual(
  initial.cards.map(({ replacementCount }) => replacementCount),
  [0, 0, 1],
);
assert.deepEqual(
  initial.cards.map(({ canReplace }) => canReplace),
  [false, false, true],
);
assert.deepEqual(initial.cards[2]?.replaceOptions, ["ANY"]);
assert.deepEqual(initial.seenIds, ["A", "B", "C"]);
assert.equal(initial.revision, 4);
assert.equal(initial.todayStatus, "NOT_REQUESTED");
assert.deepEqual(initial.appliedFactors, []);
assert.equal(initial.partialApplied, false);

const replacementCandidates = getReplacementCandidates({
  selection,
  places: [A, B, C, D],
  currentPlaceIds: ["A", "B", "C"],
  targetSlot: 3,
  seenIds: ["A", "B", "C"],
  mode: "SCENE",
  replaceReason: "ANY",
});
assert.deepEqual(
  replacementCandidates.map(({ placeId }) => placeId),
  ["D"],
);

const replaced = replaceDiscoveryCard({
  selection,
  places: [A, B, C, D],
  session: initial,
  request: {
    selectionId: selection.selectionId,
    mode: "SCENE",
    snapshotAt: SNAPSHOT_AT,
    revision: 4,
    currentPlaceIds: ["A", "B", "C"],
    targetSlot: 3,
    seenIds: ["A", "B", "C"],
    replaceReason: "ANY",
  },
});
assert.equal(replaced.ok, true);
if (replaced.ok) {
  assert.deepEqual(
    replaced.session.cards.map(({ placeId }) => placeId),
    ["A", "B", "D"],
  );
  assert.deepEqual(replaced.session.seenIds, ["A", "B", "C", "D"]);
  assert.equal(replaced.session.revision, 5);
}

const stale = replaceDiscoveryCard({
  selection,
  places: [A, B, C, D],
  session: initial,
  request: {
    selectionId: selection.selectionId,
    mode: "SCENE",
    snapshotAt: SNAPSHOT_AT,
    revision: 3,
    currentPlaceIds: ["A", "B", "C"],
    targetSlot: 3,
    seenIds: ["A", "B", "C"],
    replaceReason: "ANY",
  },
});
assert.deepEqual(stale, {
  ok: false,
  code: "REVISION_CONFLICT",
  session: initial,
});

const staleSeenIds = replaceDiscoveryCard({
  selection,
  places: [A, B, C, D],
  session: initial,
  request: {
    selectionId: selection.selectionId,
    mode: "SCENE",
    snapshotAt: SNAPSHOT_AT,
    revision: 4,
    currentPlaceIds: ["A", "B", "C"],
    targetSlot: 3,
    seenIds: ["A", "B"],
    replaceReason: "ANY",
  },
});
assert.deepEqual(staleSeenIds, {
  ok: false,
  code: "STALE_REQUEST",
  session: initial,
});
const staleSnapshot = replaceDiscoveryCard({
  selection,
  places: [A, B, C, D],
  session: initial,
  request: {
    selectionId: selection.selectionId,
    mode: "SCENE",
    snapshotAt: "2026-09-12T00:00:00.000Z",
    revision: 4,
    currentPlaceIds: ["A", "B", "C"],
    targetSlot: 3,
    seenIds: ["A", "B", "C"],
    replaceReason: "ANY",
  },
});
assert.deepEqual(staleSnapshot, {
  ok: false,
  code: "STALE_REQUEST",
  session: initial,
});

const exhaustedSpecificReason = replaceDiscoveryCard({
  selection,
  places: [A, B, C, D],
  session: initial,
  request: {
    selectionId: selection.selectionId,
    mode: "SCENE",
    snapshotAt: SNAPSHOT_AT,
    revision: 4,
    currentPlaceIds: ["A", "B", "C"],
    targetSlot: 1,
    seenIds: ["A", "B", "C"],
    replaceReason: "LESS_RAIN",
  },
});
assert.deepEqual(exhaustedSpecificReason, {
  ok: false,
  code: "NO_REPLACEMENT",
  session: initial,
});

const transportSelection: SelectionDefinition = {
  ...selection,
  requiredFeatures: ["바다"],
  supportingFeatures: [],
  allowedExpansion: [],
};
const transportPlaces = [
  place("A", ["바다"], { public_transport: "하", car: "상" }),
  place("B", ["바다"], { public_transport: "상", car: "하" }),
  place("C", ["바다"], { public_transport: "중", car: "중" }),
];
assert.deepEqual(
  rankDiscoveryCandidates({
    selection: transportSelection,
    places: transportPlaces,
    mode: "SCENE",
  }).map(({ placeId }) => placeId),
  ["A", "B", "C"],
  "이동수단 미선택은 자차나 대중교통으로 간주하지 않는다.",
);
assert.deepEqual(
  rankDiscoveryCandidates({
    selection: transportSelection,
    places: transportPlaces,
    mode: "SCENE",
    unavailablePlaceIds: ["A"],
  }).map(({ placeId }) => placeId),
  ["B", "C"],
  "정규화된 이용 불가 ID는 후보에서 제외한다.",
);
assert.deepEqual(
  rankDiscoveryCandidates({
    selection: transportSelection,
    places: [
      {
        ...transportPlaces[0]!,
        operatingCondition: {
          type: "date_ranges",
          status: "verified",
          timezone: "Asia/Seoul",
          openDateRanges: [],
          requiresExactDate: true,
          unknownDatePolicy: "exclude",
        },
      },
      transportPlaces[1]!,
      transportPlaces[2]!,
    ],
    mode: "SCENE",
  }).map(({ placeId }) => placeId),
  ["B", "C"],
  "정규화된 운영 조건이 날짜 없음을 제외로 규정하면 후보에서 뺀다.",
);
assert.deepEqual(
  rankDiscoveryCandidates({
    selection: transportSelection,
    places: transportPlaces,
    mode: "SCENE",
    transportType: "PUBLIC_TRANSIT",
  }).map(({ placeId }) => placeId),
  ["B", "C", "A"],
  "이동수단은 같은 관계/적합성 묶음 안에서만 재정렬한다.",
);
assert.deepEqual(
  rankDiscoveryCandidates({
    selection: transportSelection,
    places: [
      place("A", ["바다"], { car: "상" }),
      place("B", ["바다"], { car: null }),
      place("C", ["바다"], { car: "하" }),
    ],
    mode: "SCENE",
    transportType: "CAR",
  }).map(({ placeId }) => placeId),
  ["A", "B", "C"],
  "묶음에 미확인 접근성이 있으면 이동수단 재정렬 전체를 건너뛴다.",
);

const fitBoundarySelection = {
  ...transportSelection,
  supportingFeatures: ["조용함"],
};
assert.deepEqual(
  rankDiscoveryCandidates({
    selection: fitBoundarySelection,
    places: [
      place("A", ["바다"], { car: "상" }),
      place("B", ["바다", "조용함"], { car: "하" }),
      place("C", ["바다"], { car: "중" }),
    ],
    mode: "SCENE",
    transportType: "CAR",
  }).map(({ placeId }) => placeId),
  ["B", "A", "C"],
  "이동수단은 RICH/BASE 경계를 넘지 않는다.",
);

const todayBaseline = rankDiscoveryCandidates({
  selection: transportSelection,
  places: transportPlaces,
  mode: "TODAY",
  normalizedConditions: {
    A: {
      weather: {
        status: "COMPARABLE",
        comparisonKey: "same-hour",
        preference: 1,
      },
    },
    B: { weather: { status: "UNAVAILABLE" } },
    C: {
      weather: {
        status: "COMPARABLE",
        comparisonKey: "same-hour",
        preference: 3,
      },
    },
  },
});
assert.deepEqual(
  todayBaseline.map(({ placeId }) => placeId),
  ["A", "B", "C"],
);
assert.deepEqual(
  rankDiscoveryCandidates({
    selection: transportSelection,
    places: transportPlaces,
    mode: "TODAY",
    normalizedConditions: Object.fromEntries(
      transportPlaces.map((candidate, index) => [
        candidate.place_id,
        {
          weather: {
            status: "COMPARABLE",
            comparisonKey: "same-hour",
            preference: index + 1,
          },
        },
      ]),
    ),
  }).map(({ placeId }) => placeId),
  ["C", "B", "A"],
);
const todaySession = buildDiscoverySession({
  selection: transportSelection,
  places: transportPlaces,
  request: {
    selectionId: transportSelection.selectionId,
    mode: "TODAY",
    normalizedConditions: Object.fromEntries(
      transportPlaces.map((candidate, index) => [
        candidate.place_id,
        {
          weather: {
            status: "COMPARABLE",
            comparisonKey: "same-hour",
            preference: index + 1,
          },
        },
      ]),
    ),
  },
  snapshotAt: SNAPSHOT_AT,
});
assert.equal(todaySession.todayStatus, "APPLIED");
assert.deepEqual(todaySession.appliedFactors, ["WEATHER"]);
assert.deepEqual(todaySession.skippedFactors, [
  { factor: "VISIT_CONCENTRATION", reason: "NO_DATA" },
]);
assert.equal(todaySession.partialApplied, true);
const unavailableTodaySession = buildDiscoverySession({
  selection: transportSelection,
  places: transportPlaces,
  request: {
    selectionId: transportSelection.selectionId,
    mode: "TODAY",
    normalizedConditions: {
      A: {
        weather: {
          status: "COMPARABLE",
          comparisonKey: "same-hour",
          preference: 1,
        },
      },
      B: { weather: { status: "UNAVAILABLE", reason: "NO_DATA" } },
      C: {
        weather: {
          status: "COMPARABLE",
          comparisonKey: "same-hour",
          preference: 3,
        },
      },
    },
  },
  snapshotAt: SNAPSHOT_AT,
});
assert.equal(unavailableTodaySession.todayStatus, "UNAVAILABLE");
assert.deepEqual(
  unavailableTodaySession.cards.map(({ placeId }) => placeId),
  ["A", "B", "C"],
);
assert.deepEqual(unavailableTodaySession.appliedFactors, []);
assert.deepEqual(unavailableTodaySession.skippedFactors, [
  { factor: "WEATHER", reason: "NO_DATA" },
  { factor: "VISIT_CONCENTRATION", reason: "NO_DATA" },
]);
assert.equal(unavailableTodaySession.partialApplied, false);

const noChangeTodaySession = buildDiscoverySession({
  selection: transportSelection,
  places: transportPlaces,
  request: {
    selectionId: transportSelection.selectionId,
    mode: "TODAY",
    normalizedConditions: Object.fromEntries(
      transportPlaces.map((candidate) => [
        candidate.place_id,
        {
          weather: {
            status: "COMPARABLE",
            comparisonKey: "same-hour",
            preference: 1,
          },
        },
      ]),
    ),
  },
  snapshotAt: SNAPSHOT_AT,
});
assert.equal(noChangeTodaySession.todayStatus, "NO_CHANGE");
assert.deepEqual(noChangeTodaySession.appliedFactors, ["WEATHER"]);

const fourthTodayPlace = place("D", ["바다"]);
const replaceableTodayPlaces = [...transportPlaces, fourthTodayPlace];
const replaceableTodaySession = buildDiscoverySession({
  selection: transportSelection,
  places: replaceableTodayPlaces,
  request: {
    selectionId: transportSelection.selectionId,
    mode: "TODAY",
    normalizedConditions: Object.fromEntries(
      replaceableTodayPlaces.map((candidate) => [
        candidate.place_id,
        {
          weather: {
            status: "COMPARABLE",
            comparisonKey: "same-hour",
            preference: 1,
          },
        },
      ]),
    ),
  },
  snapshotAt: SNAPSHOT_AT,
});
const todayReplaced = replaceDiscoveryCard({
  selection: transportSelection,
  places: replaceableTodayPlaces,
  session: replaceableTodaySession,
  request: {
    selectionId: transportSelection.selectionId,
    mode: "TODAY",
    snapshotAt: SNAPSHOT_AT,
    revision: 0,
    currentPlaceIds: ["A", "B", "C"],
    targetSlot: 3,
    seenIds: ["A", "B", "C"],
    replaceReason: "ANY",
  },
});
assert.equal(todayReplaced.ok, true);
if (todayReplaced.ok) {
  assert.equal(todayReplaced.session.mode, "TODAY");
  assert.equal(todayReplaced.session.todayStatus, "NO_CHANGE");
}

const tenPlaces = "ABCDEFGHIJ".split("").map((id) => place(id, ["바다"]));
assert.deepEqual(
  rankDiscoveryCandidates({
    selection: transportSelection,
    places: tenPlaces,
    mode: "TODAY",
    normalizedConditions: Object.fromEntries(
      tenPlaces.map((candidate, index) => [
        candidate.place_id,
        {
          weather: {
            status: "COMPARABLE",
            comparisonKey: "same-hour",
            preference: index + 1,
          },
        },
      ]),
    ),
  }).map(({ placeId }) => placeId),
  ["H", "G", "F", "E", "D", "C", "B", "A", "I", "J"],
  "오늘 조건은 분위기 우선 앞 8개만 비교하고 범위 밖 위치를 유지한다.",
);

const nineTransportPlaces = "ABCDEFGHI"
  .split("")
  .map((id, index) =>
    place(id, ["바다"], { car: index === 8 ? null : index < 4 ? "하" : "상" }),
  );
assert.deepEqual(
  rankDiscoveryCandidates({
    selection: transportSelection,
    places: nineTransportPlaces,
    mode: "TODAY",
    transportType: "CAR",
    normalizedConditions: Object.fromEntries(
      nineTransportPlaces.slice(0, 8).map((candidate) => [
        candidate.place_id,
        {
          weather: {
            status: "COMPARABLE",
            comparisonKey: "same-hour",
            preference: 1,
          },
        },
      ]),
    ),
  }).map(({ placeId }) => placeId),
  ["A", "B", "C", "D", "E", "F", "G", "H", "I"],
  "TODAY top8도 전체 관계/적합성 묶음의 접근성 미확인을 무시하면 안 된다.",
);

const reasonSession = buildDiscoverySession({
  selection: transportSelection,
  places: [
    ...transportPlaces,
    place("D", ["바다"], { public_transport: "상", car: "중" }),
  ],
  request: { selectionId: transportSelection.selectionId, mode: "SCENE" },
  snapshotAt: SNAPSHOT_AT,
});
assert.deepEqual(reasonSession.cards[0]?.replaceOptions, [
  "ANY",
  "BETTER_PUBLIC_TRANSIT",
]);
const reasonReplaced = replaceDiscoveryCard({
  selection: transportSelection,
  places: [
    ...transportPlaces,
    place("D", ["바다"], { public_transport: "상", car: "중" }),
  ],
  session: reasonSession,
  request: {
    selectionId: transportSelection.selectionId,
    mode: "SCENE",
    snapshotAt: SNAPSHOT_AT,
    revision: 0,
    currentPlaceIds: ["A", "B", "C"],
    targetSlot: 1,
    seenIds: ["A", "B", "C"],
    replaceReason: "BETTER_PUBLIC_TRANSIT",
  },
});
assert.equal(reasonReplaced.ok, true);
if (reasonReplaced.ok)
  assert.deepEqual(
    reasonReplaced.session.cards.map(({ placeId }) => placeId),
    ["D", "B", "C"],
  );
const noImprovement = replaceDiscoveryCard({
  selection: transportSelection,
  places: [
    ...transportPlaces,
    place("D", ["바다"], { public_transport: "상", car: "중" }),
  ],
  session: reasonSession,
  request: {
    selectionId: transportSelection.selectionId,
    mode: "SCENE",
    snapshotAt: SNAPSHOT_AT,
    revision: 0,
    currentPlaceIds: ["A", "B", "C"],
    targetSlot: 2,
    seenIds: ["A", "B", "C"],
    replaceReason: "BETTER_PUBLIC_TRANSIT",
  },
});
assert.deepEqual(noImprovement, {
  ok: false,
  code: "NO_IMPROVING_CANDIDATE",
  session: reasonSession,
});

const realPlaces = placesData.places as DiscoveryPlace[];
assert.equal(realPlaces.length, 61);
assert.deepEqual(
  realPlaces.map(({ place_id }) => place_id),
  Array.from(
    { length: 61 },
    (_, index) => `GOAT-${String(index + 1).padStart(3, "0")}`,
  ),
);
assert.ok(DISCOVERY_CATALOG_VERSION.length > 0);
assert.equal(discoverySelectionCatalog.length, 28);
assert.deepEqual(
  publicDiscoverySelections.map(({ selectionId }) => selectionId).sort(),
  [
    "REF_ALPS_01",
    "REF_JP_01",
    "REF_JP_02",
    "REF_NATURE_01",
    "REF_NATURE_02",
    "REF_SEA_01",
    "REF_SEA_02",
    "REF_SEA_03",
    "alps-ranch",
    "architecture-exhibit-landmark",
    "forest-garden-rest",
    "japan-alley",
    "resort-cafe-exotic",
    "retro-market-harbor",
    "sea-coast",
  ],
);
for (const catalogSelection of discoverySelectionCatalog) {
  assert.ok(!catalogSelection.sceneCoverCandidates.includes("GOAT-058"));
  for (const placeId of catalogSelection.sceneCoverCandidates) {
    const coverPlace = realPlaces.find(
      (candidate) => candidate.place_id === placeId,
    );
    assert.ok(coverPlace);
    assert.equal(
      derivePlaceRelation(catalogSelection, coverPlace).matchType,
      "EXACT",
    );
  }
}
for (const catalogSelection of publicDiscoverySelections) {
  const session = buildDiscoverySession({
    selection: catalogSelection,
    places: realPlaces,
    request: { selectionId: catalogSelection.selectionId, mode: "SCENE" },
    snapshotAt: SNAPSHOT_AT,
  });
  assert.equal(
    session.cards.length,
    3,
    `${catalogSelection.selectionId}는 서로 다른 정상 3개를 반환해야 한다.`,
  );
  assert.equal(new Set(session.cards.map(({ placeId }) => placeId)).size, 3);
}

const seaMood = publicDiscoverySelections.find(
  ({ selectionId }) => selectionId === "sea-coast",
);
assert.ok(seaMood);
const withoutPhotos = buildDiscoverySession({
  selection: seaMood,
  places: realPlaces,
  request: { selectionId: seaMood.selectionId, mode: "SCENE" },
  snapshotAt: SNAPSHOT_AT,
});
assert.ok(
  withoutPhotos.cards.every(({ matchedFeatures }) =>
    matchedFeatures.every((feature) => !feature.startsWith("theme:")),
  ),
);
const withPhotos = buildDiscoverySession({
  selection: seaMood,
  places: realPlaces.map((candidate, index) => ({
    ...candidate,
    imageUrl:
      index % 2 ? `https://example.com/${candidate.place_id}.jpg` : null,
    photoScore: 10_000 - index,
  })),
  request: { selectionId: seaMood.selectionId, mode: "SCENE" },
  snapshotAt: SNAPSHOT_AT,
});
assert.deepEqual(
  withPhotos.cards.map(({ placeId }) => placeId),
  withoutPhotos.cards.map(({ placeId }) => placeId),
  "사진 존재 여부와 사진 점수는 장소 추천 순위를 바꾸면 안 된다.",
);

console.log(
  `discovery recommendation verified: ${realPlaces.length} places, ${publicDiscoverySelections.length} public selections`,
);
