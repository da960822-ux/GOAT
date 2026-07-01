import moodCategoryData from "./data/mood-categories.json";
import placesDatasetData from "./data/goat_simplified_scoring_tags_v10_accessibility_merged.json";
import referenceDatasetData from "./data/goat_reference_cards_v2_balanced.json";
import { recommendGoatPlaces } from "./goatRecommendationEngine";
import type {
  GoatPlace,
  GoatPlaceDataset,
  GoatReferenceCardDataset,
  RecommendRequest,
  RecommendationCard as GoatRecommendationCard,
} from "./goatRecommendationTypes";
import type {
  MoodCategory,
  Place,
  RecommendationCard,
  RecommendationResult,
  TravelPreferences,
} from "./types";

const placesDataset = placesDatasetData as GoatPlaceDataset;
const referenceDataset = referenceDatasetData as GoatReferenceCardDataset;
const sourcePlaces = placesDataset.places;
export const moodCategories = moodCategoryData as MoodCategory[];

export type RecommendationRequestOptions = {
  referenceCardId?: string;
  travelPurpose?: string;
  transportType?: string;
  visitTime?: string;
  currentMonth?: number;
  excludeIds?: string[];
  debug?: boolean;
};

const MOOD_TO_REFERENCE_CARD: Record<string, string> = {
  "california-coast": "REF_SEA_02",
  "japan-small-town": "REF_JP_02",
  "alps-meadow": "REF_ALPS_01",
  "ryokan-lodging": "REF_JP_01",
  "rainy-canyon": "REF_ARCH_03",
  "nordic-winter": "REF_NATURE_01",
  "retro-night-market": "REF_RETRO_01",
  "plateau-stars": "REF_ALPS_03",
  "bali-surf": "REF_RESORT_02",
  "europe-garden": "REF_NATURE_02",
  "lake-reflection": "REF_NATURE_03",
  "japan-retro-cafe": "REF_RETRO_02",
};

const PURPOSE_MAP: Record<string, string> = {
  "사진 위주": "사진·포토스팟",
  "가볍게 산책": "산책·힐링",
  "액티비티": "체험·액티비티",
  "조용한 휴식": "산책·힐링",
};

const TIME_MAP: Record<string, string> = {
  "일몰": "저녁",
  "밤/새벽": "야간",
};

function validateData(): void {
  if (sourcePlaces.length !== 58) {
    throw new Error(`GOAT 장소 데이터는 58개여야 합니다. 현재: ${sourcePlaces.length}`);
  }
  if (new Set(sourcePlaces.map(({ place_id }) => place_id)).size !== 58) {
    throw new Error("GOAT 장소 ID가 중복되었습니다.");
  }
  if (!sourcePlaces.some(({ place_id, place_name }) => place_id === "GOAT-002" && place_name.includes("레고랜드"))) {
    throw new Error("레고랜드가 추천 후보 데이터에 없습니다.");
  }
  if (moodCategories.length !== 12 || new Set(moodCategories.map(({ id }) => id)).size !== 12) {
    throw new Error("사용자 감성 데이터는 중복 없는 12개여야 합니다.");
  }
  if (referenceDataset.reference_cards.length !== 21) {
    throw new Error(`GOAT 레퍼런스 카드는 21개여야 합니다. 현재: ${referenceDataset.reference_cards.length}`);
  }
}

validateData();

function normalizePurpose(value?: string): string | undefined {
  if (!value) return undefined;
  return PURPOSE_MAP[value] ?? value;
}

function normalizeVisitTime(value?: string | null): string | undefined {
  if (!value) return undefined;
  return TIME_MAP[value] ?? value;
}

function toPlace(place: GoatPlace): Place {
  return {
    place_id: place.place_id,
    city: place.city,
    region_group: place.region_group,
    place_name: place.place_name,
    place_type: place.place_type,
    primary_mood: String(place.primaryTheme),
    mood_tags: place.mood_tags,
    photo_point: place.photo_point ?? "",
    best_time: String(place.best_time ?? ""),
    best_season: (place.season_tags ?? []).join(", "),
    accessibility: [
      place.accessibility?.public_transport ? `대중교통 ${place.accessibility.public_transport}` : "",
      place.accessibility?.car ? `자차 ${place.accessibility.car}` : "",
      place.accessibility?.walk ? `도보 ${place.accessibility.walk}` : "",
    ].filter(Boolean).join(" / "),
    data_status: "confirmed",
    recommendation_use: place.recommendation_use ?? "",
    note: String(place.note ?? ""),
    ...(place.address ? { address: place.address } : {}),
    ...(typeof place.lat === "number" ? { lat: place.lat } : {}),
    ...(typeof place.lng === "number" ? { lng: place.lng } : {}),
    ...(typeof place.latitude === "number" ? { lat: place.latitude } : {}),
    ...(typeof place.longitude === "number" ? { lng: place.longitude } : {}),
    ...(place.imageUrl ? { imageUrl: place.imageUrl } : {}),
    description: place.recommendation_use ?? undefined,
  };
}

function toLegacyRecommendation(card: GoatRecommendationCard): RecommendationCard {
  const source = sourcePlaces.find(({ place_id }) => place_id === card.placeId);
  if (!source) throw new Error(`추천 장소 데이터를 찾을 수 없습니다: ${card.placeId}`);
  const roleMap = {
    BEST_SCENE: "장면 최적",
    SAME_MOOD_ALTERNATIVE: "같은 분위기 대안",
    CONDITION_FIT_ALTERNATIVE: "조건 맞춤",
  } as const;

  return {
    place: toPlace(source),
    role: roleMap[card.role],
    score: card.score.displayScore,
    reason: card.reasons.join(" "),
    matchedTags: [
      ...card.score.moodScore.moodTags.matched,
      ...card.score.moodScore.sceneTags.matched,
    ],
    scoreBreakdown: {
      tag: card.score.moodScore.total,
      sceneSpecific: card.score.moodScore.sceneTags.score,
      region: 0,
      lodgingIntent: 0,
      season: card.score.conditionScore.season.score,
      time: card.score.conditionScore.bestTime.score,
      weather: 0,
      companion: 0,
      travelPurpose: card.score.conditionScore.purpose.score,
      transport: card.score.conditionScore.accessibility.score,
      dataStatus: 0,
      directMatchCount:
        card.score.moodScore.moodTags.count + card.score.moodScore.sceneTags.count,
      baseScore: card.score.baseScore,
      routeDistanceBonus: card.score.routeDistanceBonus,
      duplicatePenalty: card.score.duplicatePenalty,
      selectionScore: card.score.selectionScore,
      displayScore: card.score.displayScore,
    },
    safetyNotes: card.cautions,
    weatherFit: "보통",
    parkingInfo: card.accessibility?.car ? `자차 접근성 ${card.accessibility.car}` : "확인 필요",
  };
}

function resolveReferenceCardId(moodId?: string, explicitReferenceCardId?: string): string | undefined {
  if (explicitReferenceCardId) return explicitReferenceCardId;
  if (!moodId) return undefined;
  return MOOD_TO_REFERENCE_CARD[moodId];
}

export function getRecommendations(
  moodId?: string,
  preferences?: TravelPreferences,
  excludeIds?: string[],
  options: RecommendationRequestOptions = {},
): RecommendationResult | undefined {
  if (moodId && !moodCategories.some(({ id }) => id === moodId)) return undefined;

  const referenceCardId = resolveReferenceCardId(moodId, options.referenceCardId);
  if (!referenceCardId) return undefined;
  if (!referenceDataset.reference_cards.some((card) => card.referenceCardId === referenceCardId && card.isActive !== false)) {
    return undefined;
  }

  const request: RecommendRequest = {
    referenceCardId,
    travelPurpose: normalizePurpose(options.travelPurpose ?? preferences?.purpose),
    transportType: options.transportType ?? preferences?.transport,
    visitTime: normalizeVisitTime(options.visitTime ?? preferences?.visitTime),
    currentMonth: options.currentMonth ?? new Date().getMonth() + 1,
    excludePlaceIds: options.excludeIds ?? excludeIds,
    debug: options.debug,
  };

  const result = recommendGoatPlaces(request, placesDataset, referenceDataset);
  if (!result.resultData) {
    throw new Error(result.failReason ?? result.message);
  }

  return {
    moodId: moodId ?? referenceCardId,
    referenceCardId,
    appliedTags: [
      ...result.resultData.request.userMoodTags,
      ...result.resultData.request.userSceneTags,
    ],
    seedPoolSize: sourcePlaces.length,
    candidatePoolSize: result.resultData.debug?.candidatePoolSize ?? sourcePlaces.length,
    poolPolicy: "ALL58",
    poolReason: "GOAT reference card 기반 58개 장소 추천 엔진을 사용했습니다.",
    fallbackUsed: false,
    adaptivePoolRetryUsed: false,
    recommendations: result.resultData.cards.map(toLegacyRecommendation),
    cards: result.resultData.cards,
    alternatives: result.resultData.alternatives,
    warnings: result.resultData.warnings,
  };
}

export function getPlaceById(id: string): Place | undefined {
  const place = sourcePlaces.find(({ place_id }) => place_id === id);
  return place ? toPlace(place) : undefined;
}

export function getAlternatives(placeId: string, limit = 3): Place[] {
  const target = sourcePlaces.find(({ place_id }) => place_id === placeId);
  if (!target) return [];
  return sourcePlaces
    .filter(({ place_id }) => place_id !== placeId)
    .map((place) => ({
      place,
      score:
        place.mood_tags.filter((tag) => target.mood_tags.includes(tag)).length * 2 +
        (place.primaryTheme === target.primaryTheme ? 3 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.place.place_id.localeCompare(b.place.place_id))
    .slice(0, limit)
    .map(({ place }) => toPlace(place));
}
