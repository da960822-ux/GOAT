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
