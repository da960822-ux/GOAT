import moodCategoryData from "./data/mood-categories.json";
import placeData from "./data/places.json";
import tagDictionaryData from "./data/tag-dictionary.json";
import {
  getGoatRecommendations,
  type GoatPlace,
  type RecommendationInput,
} from "./v13Engine";
import type {
  MoodCategory,
  Place,
  RecommendationCard,
  RecommendationResult,
  TravelPreferences,
} from "./types";

type SourcePlace = GoatPlace & {
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

const sourcePlaces = placeData as SourcePlace[];
export const moodCategories = moodCategoryData as MoodCategory[];

function isLodgingOrResort(place: SourcePlace): boolean {
  if (place.placeId === "GOAT-002") return false;
  const text = [
    place.placeType,
    place.primaryMood,
    place.recommendationUse,
    place.note,
    ...(place.searchTags ?? []),
    ...(place.moodTags ?? []),
  ].join(" ");
  return ["숙소", "숙박", "리조트", "료칸", "풀빌라", "자쿠지", "카라반"].some(
    (keyword) => text.includes(keyword),
  );
}

function validateData(): void {
  if (sourcePlaces.length !== 58) {
    throw new Error(`GOAT 장소 데이터는 58개여야 합니다. 현재: ${sourcePlaces.length}`);
  }
  if (new Set(sourcePlaces.map(({ placeId }) => placeId)).size !== 58) {
    throw new Error("GOAT 장소 ID가 중복되었습니다.");
  }
  if (!sourcePlaces.some(({ placeId, name }) => placeId === "GOAT-002" && name.includes("레고랜드"))) {
    throw new Error("레고랜드가 추천 후보 데이터에 없습니다.");
  }
  const primaryCount = sourcePlaces.filter(
    (place) => place.dataStatus === "confirmed" && !isLodgingOrResort(place),
  ).length;
  if (primaryCount !== 43) {
    throw new Error(`PRIMARY43 후보는 43개여야 합니다. 현재: ${primaryCount}`);
  }
  if (moodCategories.length !== 12 || new Set(moodCategories.map(({ id }) => id)).size !== 12) {
    throw new Error("사용자 감성 데이터는 중복 없는 12개여야 합니다.");
  }
  const dictionary = tagDictionaryData as {
    aliases?: unknown;
    relatedTags?: unknown;
    moodExpansion?: unknown;
    weakStandaloneTags?: unknown;
  };
  if (
    !dictionary.aliases ||
    !dictionary.relatedTags ||
    !dictionary.moodExpansion ||
    !Array.isArray(dictionary.weakStandaloneTags)
  ) {
    throw new Error("태그 사전 구조가 올바르지 않습니다.");
  }
}

validateData();

function toPlace(place: SourcePlace): Place {
  return {
    place_id: place.placeId,
    city: place.city,
    region_group: place.regionGroup,
    place_name: place.name,
    place_type: place.placeType,
    primary_mood: place.primaryMood,
    mood_tags: place.moodTags,
    photo_point: place.photoPoint ?? "",
    best_time: place.bestTimeRaw ?? place.bestTime?.join(", ") ?? "",
    best_season: place.bestSeasonRaw ?? place.bestSeason?.join(", ") ?? "",
    accessibility: place.accessibility?.raw ?? "",
    data_status: place.dataStatus as Place["data_status"],
    recommendation_use: place.recommendationUse ?? "",
    note: place.note ?? "",
    ...(place.address ? { address: place.address } : {}),
    ...(place.latitude != null ? { lat: place.latitude } : {}),
    ...(place.longitude != null ? { lng: place.longitude } : {}),
    ...(place.imageUrl ? { imageUrl: place.imageUrl } : {}),
    description: place.recommendationUse ?? undefined,
  };
}

export function getRecommendations(
  moodId: string,
  preferences?: TravelPreferences,
  excludeIds?: string[],
): RecommendationResult | undefined {
  const mood = moodCategories.find(({ id }) => id === moodId);
  if (!mood) return undefined;

  const input: RecommendationInput = {
    ...mood.engineInput,
    source: "reference-card",
    companionType: preferences?.companion,
    travelPurpose: preferences?.purpose,
    transportType: preferences?.transport,
    preferredTime: preferences?.visitTime ?? mood.engineInput.preferredTime,
    excludeIds,
    limit: 3,
    poolMode: "auto",
  };

  const result = getGoatRecommendations(input, sourcePlaces);
  if (!result.resultData) {
    throw new Error(result.failReason ?? result.message);
  }

  const recommendations: RecommendationCard[] = result.resultData.recommendations.map((card) => {
    const source = sourcePlaces.find(({ placeId }) => placeId === card.placeId);
    if (!source) throw new Error(`추천 장소 데이터를 찾을 수 없습니다: ${card.placeId}`);
    return {
      place: toPlace(source),
      role: card.cardLabel as RecommendationCard["role"],
      score: card.score,
      reason: card.reason,
      matchedTags: card.matchedTags,
      scoreBreakdown: card.scoreBreakdown,
      safetyNotes: card.safetyNotes,
      weatherFit: card.weatherFit,
      parkingInfo: card.parkingInfo,
    };
  });

  return {
    moodId: mood.id,
    appliedTags: result.resultData.inputTags,
    seedPoolSize: result.resultData.seedPoolSize,
    candidatePoolSize: result.resultData.candidatePoolSize,
    poolPolicy: result.resultData.poolPolicy,
    poolReason: result.resultData.poolReason,
    fallbackUsed: result.resultData.fallbackUsed,
    adaptivePoolRetryUsed: result.resultData.adaptivePoolRetryUsed,
    recommendations,
  };
}

export function getPlaceById(id: string): Place | undefined {
  const place = sourcePlaces.find(({ placeId }) => placeId === id);
  return place ? toPlace(place) : undefined;
}

export function getAlternatives(placeId: string, limit = 3): Place[] {
  const target = sourcePlaces.find(({ placeId: candidateId }) => candidateId === placeId);
  if (!target) return [];
  return sourcePlaces
    .filter(({ placeId: candidateId }) => candidateId !== placeId)
    .map((place) => ({
      place,
      score:
        place.moodTags.filter((tag) => target.moodTags.includes(tag)).length * 2 +
        (place.primaryMood === target.primaryMood ? 3 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.place.placeId.localeCompare(b.place.placeId))
    .slice(0, limit)
    .map(({ place }) => toPlace(place));
}
