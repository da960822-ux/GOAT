import moodCategoryData from "./data/mood-categories.json";
import placesDatasetData from "./data/goat_simplified_scoring_tags_v10_accessibility_merged.json";
import referenceDatasetData from "./data/goat_reference_cards_v2_balanced.json";
import { RECOMMENDATION_POLICY_VERSION, recommendGoatPlaces } from "./goatRecommendationEngine";
import type {
  GoatPlace,
  GoatPlaceDataset,
  GoatReferenceCardDataset,
  RecommendRequest,
  RecommendResult,
  RecommendationCard as GoatRecommendationCard,
} from "./goatRecommendationTypes";
import type {
  MoodCategory,
  Place,
  RecommendationCard,
  RecommendationResult,
  TravelOrigin,
  TravelPreferences,
} from "./types";

export const goatPlacesDataset = placesDatasetData as GoatPlaceDataset;
const placesDataset = goatPlacesDataset;
const referenceDataset = referenceDatasetData as GoatReferenceCardDataset;
const sourcePlaces = placesDataset.places;
export const moodCategories = moodCategoryData as MoodCategory[];

export const referenceCards = referenceDataset.reference_cards
  .filter((card) => card.isActive !== false)
  .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
  .map((card) => ({
    referenceCardId: card.referenceCardId,
    displayOrder: card.displayOrder,
    title: card.title,
    subtitle: card.subtitle,
    primaryTheme: String(card.primaryTheme),
    sceneTags: card.sceneTags,
    moodTags: card.mood_tags,
    recommendedPurpose: card.recommendedPurpose ?? [],
    recommendedBestTime: card.recommendedBestTime ?? [],
    recommendedTransport: card.recommendedTransport ?? [],
    examplePlaceIds: card.examplePlaceIds ?? [],
    uiKeywords: card.uiKeywords ?? [],
    candidateCount: card.candidateCount ?? card.candidatePlaceIds?.length ?? 0,
    coverageCount: card.coverageCount ?? card.coveragePlaceIds?.length ?? 0,
  }));

export type RecommendationRequestOptions = {
  referenceCardId?: string;
  travelPurpose?: string;
  transportType?: string;
  visitTime?: string;
  currentMonth?: number;
  origin?: TravelOrigin;
  routeDistanceEnabled?: boolean;
  routeDistanceKmByPlaceId?: Record<string, number | undefined>;
  routeDurationMinByPlaceId?: Record<string, number | undefined>;
  routeSourceByPlaceId?: Record<string, "KAKAO_ROUTE" | "HAVERSINE" | "NONE" | undefined>;
  excludeIds?: string[];
  recentExposureByPlaceId?: Record<string, number | undefined>;
  totalExposureByPlaceId?: Record<string, number | undefined>;
  themeAverageExposure?: Record<string, number | undefined>;
  debug?: boolean;
};

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const MOOD_TO_REFERENCE_CARD: Record<string, string> = {
  "sea-coast": "REF_SEA_02",
  "japan-alley": "REF_JP_02",
  "alps-ranch": "REF_ALPS_01",
  "forest-garden-rest": "REF_NATURE_01",
  "retro-market-harbor": "REF_RETRO_01",
  "architecture-exhibit-landmark": "REF_ARCH_01",
  "resort-cafe-exotic": "REF_RESORT_02",
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
  if (sourcePlaces.length !== 61) {
    throw new Error(`GOAT 장소 데이터는 61개여야 합니다. 현재: ${sourcePlaces.length}`);
  }
  if (new Set(sourcePlaces.map(({ place_id }) => place_id)).size !== 61) {
    throw new Error("GOAT 장소 ID가 중복되었습니다.");
  }
  if (!sourcePlaces.every(({ place_id }, index) => place_id === `GOAT-${String(index + 1).padStart(3, "0")}`)) {
    throw new Error("GOAT 장소 ID는 데이터 순서대로 GOAT-001부터 GOAT-061까지 연속이어야 합니다.");
  }
  if (!sourcePlaces.some(({ place_id, place_name }) => place_id === "GOAT-002" && place_name.includes("레고랜드"))) {
    throw new Error("레고랜드가 추천 후보 데이터에 없습니다.");
  }
  if (moodCategories.length !== 7 || new Set(moodCategories.map(({ id }) => id)).size !== 7) {
    throw new Error("사용자 감성 데이터는 중복 없는 7개여야 합니다.");
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
      time: 0,
      weather: 0,
      companion: 0,
      travelPurpose: card.score.conditionScore.purpose.score,
      transport: card.score.conditionScore.accessibility.score,
      dataStatus: 0,
      directMatchCount:
        card.score.moodScore.moodTags.count + card.score.moodScore.sceneTags.count,
      baseScore: card.score.baseScore,
      originDistanceBonus: card.score.originDistanceBonus,
      routeDistanceBonus: card.score.routeDistanceBonus,
      duplicatePenalty: card.score.duplicatePenalty,
      selectionScore: card.score.selectionScore,
      displayScore: card.score.displayScore,
    },
    safetyNotes: card.cautions,
    weatherFit: "보통",
    parkingInfo: card.accessibility?.car ? `자차 접근성 ${card.accessibility.car}` : "확인 필요",
    ...(card.rank > 1 && typeof card.score.routeDistanceKm === "number"
      ? {
          routeInfo: {
            from: "FIRST_CARD" as const,
            fromLabel: "1번 장소에서",
            distanceKm: card.score.routeDistanceKm,
            ...(typeof card.score.routeDurationMin === "number"
              ? { durationMin: card.score.routeDurationMin }
              : {}),
            source: card.score.routeDistanceSource === "KAKAO_ROUTE" ? "KAKAO_ROUTE" as const : "HAVERSINE" as const,
            estimated: card.score.routeDistanceSource !== "KAKAO_ROUTE",
            scoreApplied: true,
          },
        }
      : {}),
  };
}

function resolveReferenceCardId(moodId?: string, explicitReferenceCardId?: string): string | undefined {
  if (explicitReferenceCardId) return explicitReferenceCardId;
  if (!moodId) return undefined;
  return MOOD_TO_REFERENCE_CARD[moodId];
}

function toLegacyRecommendationResult(
  result: RecommendResult,
  moodId: string | undefined,
  referenceCardId: string,
): RecommendationResult {
  if (!result.resultData) throw new Error(result.failReason ?? result.message);
  return {
    requestId: result.resultData.requestId,
    moodId: moodId ?? referenceCardId,
    referenceCardId,
    appliedTags: [
      ...result.resultData.request.userMoodTags,
      ...result.resultData.request.userSceneTags,
    ],
    seedPoolSize: sourcePlaces.length,
    candidatePoolSize: result.resultData.debug?.candidatePoolSize ?? sourcePlaces.length,
    poolPolicy: "ALL61",
    poolReason: "GOAT reference card 기반 61개 장소 추천 엔진을 사용했습니다.",
    fallbackUsed: result.resultData.decisionAudit?.fallback.card3PurposeFallbackUsed ?? false,
    adaptivePoolRetryUsed: false,
    recommendations: result.resultData.cards.map(toLegacyRecommendation),
    cards: result.resultData.cards,
    alternatives: result.resultData.alternatives,
    warnings: result.resultData.warnings.map((warning) => warning.code),
    warningDetails: result.resultData.warnings,
    decisionAudit: result.resultData.decisionAudit,
    policyVersion: RECOMMENDATION_POLICY_VERSION,
  };
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
    origin: options.origin,
    routeDistanceEnabled: options.routeDistanceEnabled ?? Boolean(
      options.origin
      && options.origin.type !== "skip"
      && Number.isFinite(options.origin.latitude)
      && Number.isFinite(options.origin.longitude)
    ),
    routeDistanceKmByPlaceId: options.routeDistanceKmByPlaceId,
    routeDurationMinByPlaceId: options.routeDurationMinByPlaceId,
    routeSourceByPlaceId: options.routeSourceByPlaceId,
    recentExposureByPlaceId: options.recentExposureByPlaceId,
    totalExposureByPlaceId: options.totalExposureByPlaceId,
    themeAverageExposure: options.themeAverageExposure,
    excludePlaceIds: options.excludeIds ?? excludeIds,
    debug: options.debug,
  };

  const now = new Date();
  if (request.currentMonth === now.getMonth() + 1) {
    request.currentDate = toLocalIsoDate(now);
  }

  const result = recommendGoatPlaces(request, placesDataset, referenceDataset);
  if (!result.resultData) {
    throw new Error(result.failReason ?? result.message);
  }

  return toLegacyRecommendationResult(result, moodId, referenceCardId);
}

function placeCoordinates(place: GoatPlace): { latitude: number; longitude: number } | null {
  const latitude = typeof place.latitude === "number" ? place.latitude : place.lat;
  const longitude = typeof place.longitude === "number" ? place.longitude : place.lng;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude: Number(latitude), longitude: Number(longitude) };
}

function straightDistanceKm(a: GoatPlace, b: GoatPlace): number {
  const from = placeCoordinates(a);
  const to = placeCoordinates(b);
  if (!from || !to) return Number.POSITIVE_INFINITY;
  const radiusKm = 6371;
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLng = ((to.longitude - from.longitude) * Math.PI) / 180;
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const value = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radiusKm * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

/**
 * 카카오 길찾기 호출량을 제한하기 위한 후보 압축.
 * 1번 카드와 같은 테마 후보와 여행 목적 일치 후보를 직선거리로 먼저 좁히고,
 * 최종 점수는 엔진이 실제 길찾기 시간 또는 Haversine fallback으로 다시 계산한다.
 */
export function getRouteCandidatePlaces(params: {
  firstPlaceId: string;
  travelPurpose?: string;
  excludeIds?: string[];
  includeIds?: string[];
  limit?: number;
}): Place[] {
  const first = sourcePlaces.find((place) => place.place_id === params.firstPlaceId);
  if (!first) return [];
  const limit = Math.max(2, Math.min(params.limit ?? 8, 16));
  const blocked = new Set([params.firstPlaceId, ...(params.excludeIds ?? [])]);
  const purpose = normalizePurpose(params.travelPurpose);

  const sameTheme = sourcePlaces
    .filter((place) => !blocked.has(place.place_id) && place.primaryTheme === first.primaryTheme)
    .sort((a, b) => straightDistanceKm(first, a) - straightDistanceKm(first, b));
  const purposeMatches = sourcePlaces
    .filter((place) => !blocked.has(place.place_id) && (!purpose || place.purpose_tags?.includes(purpose)))
    .sort((a, b) => straightDistanceKm(first, a) - straightDistanceKm(first, b));
  const included = (params.includeIds ?? [])
    .map((id) => sourcePlaces.find((place) => place.place_id === id))
    .filter((place): place is GoatPlace => place !== undefined && !blocked.has(place.place_id));

  const unique = new Map<string, GoatPlace>();
  for (const place of [...included, ...sameTheme.slice(0, Math.ceil(limit / 2)), ...purposeMatches]) {
    if (!placeCoordinates(place)) continue;
    unique.set(place.place_id, place);
    if (unique.size >= limit) break;
  }
  return Array.from(unique.values()).map(toPlace);
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
