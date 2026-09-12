import moodCategoryData from "./data/mood-categories.json";
import placesDatasetData from "./data/goat_simplified_scoring_tags_v10_accessibility_merged.json";
import referenceDatasetData from "./data/goat_reference_cards_v2_balanced.json";
import {
  buildDiscoverySession,
  canonicalFeatureId,
  computeSelectionAvailability,
  rankDiscoveryCandidates,
  type CatalogSelection,
  type DiscoveryPlace,
  type SelectionDefinition,
} from "./discoveryRecommendation";
import type {
  GoatPlaceDataset,
  GoatReferenceCardDataset,
} from "./goatRecommendationTypes";

export const MOOD_IDS = [
  "sea-coast",
  "japan-alley",
  "alps-ranch",
  "forest-garden-rest",
  "retro-market-harbor",
  "architecture-exhibit-landmark",
  "resort-cafe-exotic",
] as const;

export type MoodId = (typeof MOOD_IDS)[number];

export const REFERENCE_CARD_IDS = [
  "REF_SEA_01",
  "REF_SEA_02",
  "REF_SEA_03",
  "REF_JP_01",
  "REF_JP_02",
  "REF_JP_03",
  "REF_ALPS_01",
  "REF_ALPS_02",
  "REF_ALPS_03",
  "REF_NATURE_01",
  "REF_NATURE_02",
  "REF_NATURE_03",
  "REF_RETRO_01",
  "REF_RETRO_02",
  "REF_RETRO_03",
  "REF_ARCH_01",
  "REF_ARCH_02",
  "REF_ARCH_03",
  "REF_RESORT_01",
  "REF_RESORT_02",
  "REF_RESORT_03",
] as const;

export type ReferenceCardId = (typeof REFERENCE_CARD_IDS)[number];

const SCENE_PROTECTED_FEATURES = {
  REF_SEA_01: ["바다"],
  REF_SEA_02: ["바다"],
  REF_SEA_03: ["바다"],
  REF_JP_01: ["정원"],
  REF_JP_02: ["바다"],
  REF_JP_03: ["골목"],
  REF_ALPS_01: ["목장"],
  REF_ALPS_02: ["고원"],
  REF_ALPS_03: ["고원"],
  REF_NATURE_01: ["숲"],
  REF_NATURE_02: ["정원"],
  REF_NATURE_03: ["호수"],
  REF_RETRO_01: ["항구"],
  REF_RETRO_02: ["카페"],
  REF_RETRO_03: ["산업유산"],
  REF_ARCH_01: ["미술관"],
  REF_ARCH_02: ["랜드마크"],
  REF_ARCH_03: ["협곡"],
  REF_RESORT_01: ["카페"],
  REF_RESORT_02: ["카페"],
  REF_RESORT_03: ["숙소"],
} as const satisfies Record<ReferenceCardId, readonly string[]>;

export type RecommendationSelection =
  | {
      method: "mood";
      moodId: MoodId;
      referenceCardId?: never;
    }
  | {
      method: "reference";
      referenceCardId: ReferenceCardId;
      moodId?: never;
    };

/** The HTTP shape deliberately omits the UI-only `method` discriminator. */
export type RecommendationSelectionInput =
  | {
      moodId: MoodId;
      referenceCardId?: never;
    }
  | {
      referenceCardId: ReferenceCardId;
      moodId?: never;
    };

export type CatalogOption<Value extends string> = Readonly<{
  label: string;
  value: Value;
}>;

export const COMPANION_OPTIONS = [
  { label: "나 혼자", value: "혼자" },
  { label: "연인과", value: "연인" },
  { label: "친구와", value: "친구" },
  { label: "가족과", value: "가족" },
] as const satisfies readonly CatalogOption<string>[];

export const TRANSPORT_OPTIONS = [
  { label: "자가용", value: "자차" },
  { label: "대중교통", value: "대중교통" },
  { label: "도보 중심", value: "도보중심" },
] as const satisfies readonly CatalogOption<string>[];

export const VISIT_TIME_OPTIONS = [
  { label: "아침", value: "오전" },
  { label: "낮", value: "한낮" },
  { label: "해질녘", value: "저녁" },
  { label: "밤", value: "야간" },
] as const satisfies readonly CatalogOption<string>[];

export const TRAVEL_PURPOSE_OPTIONS = [
  { label: "산책과 힐링", value: "가볍게 산책" },
  { label: "사진과 기록", value: "사진 위주" },
  { label: "가벼운 활동", value: "액티비티" },
  { label: "조용한 휴식", value: "조용한 휴식" },
] as const satisfies readonly CatalogOption<string>[];

export const RECOMMENDATION_PURPOSE_OPTIONS = [
  { label: "사진과 기록", value: "사진·포토스팟" },
  { label: "산책과 힐링", value: "산책·힐링" },
  { label: "카페·실내 휴식", value: "카페·실내휴식" },
  { label: "전시·건축 관람", value: "전시·건축관람" },
  { label: "가벼운 활동", value: "체험·액티비티" },
  { label: "먹거리·야간 탐방", value: "먹거리·야간탐방" },
  { label: "숙소·리조트", value: "숙소·리조트" },
] as const satisfies readonly CatalogOption<string>[];

export type CompanionValue = (typeof COMPANION_OPTIONS)[number]["value"];
export type TransportValue = (typeof TRANSPORT_OPTIONS)[number]["value"];
export type VisitTimeValue = (typeof VISIT_TIME_OPTIONS)[number]["value"];
export type TravelPurposeValue =
  (typeof TRAVEL_PURPOSE_OPTIONS)[number]["value"];
export type RecommendationPurposeValue =
  (typeof RECOMMENDATION_PURPOSE_OPTIONS)[number]["value"];

export function isMoodId(value: string): value is MoodId {
  return (MOOD_IDS as readonly string[]).includes(value);
}

export function isReferenceCardId(value: string): value is ReferenceCardId {
  return (REFERENCE_CARD_IDS as readonly string[]).includes(value);
}

export const DISCOVERY_CATALOG_VERSION = "goat-catalog-r4" as const;

const discoveryPlaces = (placesDatasetData as GoatPlaceDataset)
  .places as DiscoveryPlace[];
const discoveryReferenceCards = (
  referenceDatasetData as GoatReferenceCardDataset
).reference_cards;
const themeToMoodId = new Map(
  moodCategoryData.map(({ id, name }) => [name, id]),
);

function selectionFeatures(values: string[]): string[] {
  return Array.from(new Set(values.map(canonicalFeatureId).filter(Boolean)));
}

function withoutRequired(required: string[], supporting: string[]): string[] {
  const requiredSet = new Set(required);
  return selectionFeatures(supporting).filter(
    (feature) => !requiredSet.has(feature),
  );
}

function exactCoverCandidates(selection: SelectionDefinition): string[] {
  return rankDiscoveryCandidates({
    selection,
    places: discoveryPlaces,
    mode: "SCENE",
  })
    .filter(({ matchType }) => matchType === "EXACT")
    .map(({ placeId }) => placeId)
    .slice(0, 2);
}

const moodSelections: SelectionDefinition[] = moodCategoryData.map(
  (mood, index) => {
    const themeFeature = `theme:${mood.name}`;
    const selection: SelectionDefinition = {
      selectionId: mood.id,
      kind: "MOOD",
      title: mood.name,
      description: mood.description,
      featuredOrder: index + 1,
      parentMoodId: null,
      protectedFeatures: [themeFeature],
      requiredFeatures: [themeFeature],
      supportingFeatures: withoutRequired(
        [themeFeature],
        [
          ...(mood.engineInput.sceneTags ?? []),
          ...(mood.engineInput.moodTags ?? []),
        ],
      ),
      allowedExpansion: [],
      sceneCoverCandidates: [],
      sceneCoverToken: mood.id,
    };
    selection.sceneCoverCandidates = exactCoverCandidates(selection);
    return selection;
  },
);

const sceneSelections: SelectionDefinition[] = discoveryReferenceCards.map(
  (card) => {
    const requiredFeatures = selectionFeatures(card.sceneTags);
    const selection: SelectionDefinition = {
      selectionId: card.referenceCardId,
      kind: "SCENE",
      title: card.title,
      description: card.subtitle ?? "",
      featuredOrder: card.displayOrder ?? Number.MAX_SAFE_INTEGER,
      parentMoodId: themeToMoodId.get(String(card.primaryTheme)) ?? null,
      protectedFeatures: isReferenceCardId(card.referenceCardId)
        ? [...SCENE_PROTECTED_FEATURES[card.referenceCardId]]
        : [],
      requiredFeatures,
      supportingFeatures: withoutRequired(requiredFeatures, [
        ...card.mood_tags,
        ...(card.uiKeywords ?? []),
      ]),
      // 확장은 의미를 바꾸는 규칙이므로 추정 생성하지 않는다. 합의된 규칙만 여기에 추가한다.
      allowedExpansion: [],
      sceneCoverCandidates: [],
      sceneCoverToken:
        themeToMoodId.get(String(card.primaryTheme)) ?? card.referenceCardId,
    };
    selection.sceneCoverCandidates = exactCoverCandidates(selection);
    return selection;
  },
);

export const discoverySelectionCatalog: CatalogSelection[] = [
  ...moodSelections,
  ...sceneSelections,
].map((selection) => {
  const availability = computeSelectionAvailability(selection, discoveryPlaces);
  let initialReplacementAvailable = false;
  if (availability.enabled) {
    const session = buildDiscoverySession({
      selection,
      places: discoveryPlaces,
      request: { selectionId: selection.selectionId, mode: "SCENE" },
      snapshotAt: "1970-01-01T00:00:00.000Z",
    });
    initialReplacementAvailable = session.cards.some(
      ({ canReplace }) => canReplace,
    );
  }
  return { ...selection, ...availability, initialReplacementAvailable };
});

export const publicDiscoverySelections = discoverySelectionCatalog
  .filter(({ enabled }) => enabled)
  .sort(
    (a, b) =>
      Number(b.initialReplacementAvailable) -
        Number(a.initialReplacementAvailable) ||
      a.featuredOrder - b.featuredOrder ||
      a.selectionId.localeCompare(b.selectionId),
  );

export function getDiscoverySelection(
  selectionId: string,
): CatalogSelection | undefined {
  return discoverySelectionCatalog.find(
    (selection) => selection.selectionId === selectionId,
  );
}
