import { GoatPlace, GoatPlaceDataset } from "./goatRecommendationTypes";
import {
  CourseStop,
  GoatDayCourseRequest,
  GoatDayCourseResult,
  LlmCoursePlannerJson,
  TourApiNearbyCandidate,
} from "./courseRecommendationTypes";
import { callOpenRouterCoursePlanner } from "./openRouterCourseLlm";
import { fetchVisitKoreaContentLabNearbyCandidates } from "./tourApiClient";
import { buildKakaoStaticMapResult } from "./kakaoStaticMap";

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function getPlaceCoordinates(place: GoatPlace): { lat: number; lng: number } | null {
  const lat = toNumber(place.latitude ?? place.lat);
  const lng = toNumber(place.longitude ?? place.lng);
  if (lat !== undefined && lng !== undefined) return { lat, lng };
  return null;
}

function findSelectedPlace(dataset: GoatPlaceDataset, selectedPlaceId: string): GoatPlace | undefined {
  return dataset.places.find((place) => place.place_id === selectedPlaceId);
}

function localFallbackCandidates(dataset: GoatPlaceDataset, selectedPlace: GoatPlace): TourApiNearbyCandidate[] {
  return dataset.places
    .filter((place) => place.place_id !== selectedPlace.place_id)
    .filter((place) => place.city === selectedPlace.city || place.region_group === selectedPlace.region_group)
    .slice(0, 12)
    .map((place) => ({
      id: place.place_id,
      title: place.place_name,
      category: place.place_type.includes("카페") ? "CAFE" : place.place_type.includes("시장") || place.place_type.includes("항구") ? "MARKET" : "TOUR",
      address: typeof place.address === "string" ? place.address : undefined,
      overview: `${place.primaryTheme} / ${place.photo_point} / ${place.recommendation_use}`,
      mapX: toNumber(place.longitude ?? place.lng),
      mapY: toNumber(place.latitude ?? place.lat),
      source: "LOCAL_DB",
      raw: place,
    }));
}

function mapSelectedPlaceToStop(selectedPlace: GoatPlace): CourseStop {
  const coords = getPlaceCoordinates(selectedPlace);
  return {
    order: 1,
    id: selectedPlace.place_id,
    title: selectedPlace.place_name,
    type: "START_PLACE",
    category: "START_PLACE",
    address: typeof selectedPlace.address === "string" ? selectedPlace.address : undefined,
    lat: coords?.lat,
    lng: coords?.lng,
    stayMinutes: 60,
    reason: `사용자가 1차 추천 카드에서 선택한 기준 장소입니다. 포토포인트: ${selectedPlace.photo_point}`,
    source: "GOAT_DB",
  };
}

function candidateToStop(candidate: TourApiNearbyCandidate, order: number, reason?: string): CourseStop {
  const type = candidate.category === "CAFE" ? "CAFE" : candidate.category === "RESTAURANT" || candidate.category === "MARKET" ? "RESTAURANT" : candidate.category === "WALK" ? "WALK" : candidate.category === "PHOTO" ? "PHOTO" : candidate.category === "ETC" ? "ETC" : "TOUR";
  return {
    order,
    id: candidate.id,
    title: candidate.title,
    type,
    category: candidate.category,
    address: candidate.address,
    lat: candidate.mapY,
    lng: candidate.mapX,
    stayMinutes: type === "CAFE" ? 45 : type === "RESTAURANT" ? 60 : 50,
    reason: reason ?? candidate.overview ?? "선택 장소 주변에서 이어가기 좋은 후보입니다.",
    source: candidate.source,
  };
}

function buildRuleBasedCourse(params: {
  selectedPlace: GoatPlace;
  candidates: TourApiNearbyCandidate[];
  request: GoatDayCourseRequest;
  warning: string;
}): GoatDayCourseResult {
  const selected = mapSelectedPlaceToStop(params.selectedPlace);
  const preferred = [...params.candidates]
    .sort((a, b) => (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) - (b.distanceMeters ?? Number.MAX_SAFE_INTEGER));

  const cafe = preferred.find((candidate) => candidate.category === "CAFE");
  const food = preferred.find((candidate) => candidate.category === "RESTAURANT" || candidate.category === "MARKET");
  const tour = preferred.find((candidate) => ![cafe?.id, food?.id].includes(candidate.id));
  const picked = [tour, cafe, food].filter((candidate): candidate is TourApiNearbyCandidate => Boolean(candidate)).slice(0, 3);
  const stops = [selected, ...picked.map((candidate, index) => candidateToStop(candidate, index + 2))]
    .map((stop, index) => ({ ...stop, order: index + 1 }));

  const staticMap = buildKakaoStaticMapResult(stops, params.selectedPlace.place_name);
  return {
    status: "DONE",
    resultType: "COURSE",
    mode: "RULE_BASED_FALLBACK",
    message: "LLM 또는 외부 API를 사용할 수 없어 규칙 기반 하루 코스를 생성했습니다.",
    selectedPlace: pickSelectedPlaceSummary(params.selectedPlace),
    conditions: pickConditions(params.request),
    nearbyCandidateCount: params.candidates.length,
    courseTitle: `${params.selectedPlace.place_name} 중심 하루 코스`,
    summary: "선택 장소를 기준으로 가까운 관광·카페·먹거리 후보를 순서대로 묶은 백업 코스입니다.",
    stops,
    staticMap,
    llmPromptUsed: false,
    failReason: null,
    warnings: [params.warning],
  };
}

function pickConditions(request: GoatDayCourseRequest) {
  return {
    primaryTheme: request.primaryTheme,
    userMoodTags: request.userMoodTags,
    userSceneTags: request.userSceneTags,
    companionType: request.companionType,
    travelPurpose: request.travelPurpose,
    transportType: request.transportType,
  };
}

function pickSelectedPlaceSummary(place: GoatPlace) {
  return {
    place_id: place.place_id,
    place_name: place.place_name,
    city: place.city,
    region_group: place.region_group,
    primaryTheme: place.primaryTheme,
    photo_point: place.photo_point,
    place_type: place.place_type,
  };
}

function buildStopsFromLlm(selectedPlace: GoatPlace, llm: LlmCoursePlannerJson, candidates: TourApiNearbyCandidate[]): CourseStop[] {
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const selectedStop = mapSelectedPlaceToStop(selectedPlace);
  const llmStops = llm.stops
    .filter((stop) => stop.id !== selectedPlace.place_id)
    .map((stop, index) => {
      const candidate = byId.get(stop.id);
      if (!candidate) return null;
      return {
        ...candidateToStop(candidate, index + 2, stop.reason),
        stayMinutes: typeof stop.stayMinutes === "number" && Number.isFinite(stop.stayMinutes) ? stop.stayMinutes : 45,
      };
    })
    .filter((stop): stop is CourseStop => Boolean(stop));
  return [selectedStop, ...llmStops].map((stop, index) => ({ ...stop, order: index + 1 }));
}

async function resolveNearbyCandidates(params: {
  request: GoatDayCourseRequest;
  selectedPlace: GoatPlace;
  dataset: GoatPlaceDataset;
}): Promise<{ candidates: TourApiNearbyCandidate[]; warning?: string; tourApiError?: string }> {
  if (params.request.nearbyCandidates?.length) {
    return { candidates: params.request.nearbyCandidates.map((candidate) => ({ ...candidate, source: candidate.source ?? "FRONTEND_PROVIDED" })) };
  }

  const coords = getPlaceCoordinates(params.selectedPlace);
  if (!coords) {
    return {
      candidates: localFallbackCandidates(params.dataset, params.selectedPlace),
      warning: "선택 장소 DB에 좌표가 없어 한국관광콘텐츠랩 OpenAPI 반경 검색 대신 같은 city/region_group 기반 로컬 후보로 fallback했습니다.",
    };
  }

  try {
    return {
      candidates: await fetchVisitKoreaContentLabNearbyCandidates({
        mapX: coords.lng,
        mapY: coords.lat,
        radiusMeters: params.request.radiusMeters ?? 3000,
        maxResults: 20,
      }),
    };
  } catch (error) {
    return {
      candidates: localFallbackCandidates(params.dataset, params.selectedPlace),
      warning: "한국관광콘텐츠랩 OpenAPI 호출 실패로 로컬 후보 fallback을 사용했습니다.",
      tourApiError: error instanceof Error ? error.message : "TOUR_API_UNKNOWN_ERROR",
    };
  }
}

export async function createGoatDayCourse(
  request: GoatDayCourseRequest,
  placesDataset: GoatPlaceDataset,
): Promise<GoatDayCourseResult> {
  const selectedPlace = findSelectedPlace(placesDataset, request.selectedPlaceId);
  if (!selectedPlace) {
    return {
      status: "FAILED",
      resultType: "UNKNOWN",
      mode: "RULE_BASED_FALLBACK",
      message: "선택한 장소 ID를 GOAT 장소 DB에서 찾지 못했습니다.",
      selectedPlace: {
        place_id: request.selectedPlaceId,
        place_name: "UNKNOWN",
        city: "UNKNOWN",
        region_group: "UNKNOWN",
        primaryTheme: request.primaryTheme,
        photo_point: "UNKNOWN",
        place_type: "UNKNOWN",
      },
      conditions: pickConditions(request),
      nearbyCandidateCount: 0,
      stops: [],
      staticMap: { provider: "NONE", reason: "selectedPlaceId를 찾지 못했습니다." },
      llmPromptUsed: false,
      failReason: "SELECTED_PLACE_NOT_FOUND",
      warnings: [],
    };
  }

  const resolved = await resolveNearbyCandidates({ request, selectedPlace, dataset: placesDataset });
  const candidates = resolved.candidates.slice(0, request.maxCandidatesForLlm ?? 12);
  const warnings = resolved.warning ? [resolved.warning] : [];

  if (request.forceRuleBasedFallback || candidates.length === 0) {
    return buildRuleBasedCourse({
      selectedPlace,
      candidates,
      request,
      warning: request.forceRuleBasedFallback ? "forceRuleBasedFallback=true 요청으로 LLM을 호출하지 않았습니다." : "주변 후보가 없어 선택 장소 단독 코스로 fallback했습니다.",
    });
  }

  try {
    const llm = await callOpenRouterCoursePlanner({
      selectedPlace,
      conditions: pickConditions(request),
      candidates,
      model: request.llmModel,
    });
    const stops = buildStopsFromLlm(selectedPlace, llm.parsed, candidates);
    const staticMap = buildKakaoStaticMapResult(stops, selectedPlace.place_name);
    return {
      status: "DONE",
      resultType: "COURSE",
      mode: "LLM_OPENROUTER",
      message: "OpenRouter GPT-4o mini LLM 프롬프트 기반 하루 코스 생성 완료",
      selectedPlace: pickSelectedPlaceSummary(selectedPlace),
      conditions: pickConditions(request),
      nearbyCandidateCount: candidates.length,
      courseTitle: llm.parsed.courseTitle,
      summary: llm.parsed.summary,
      stops,
      staticMap,
      llmPromptUsed: true,
      failReason: null,
      warnings,
      debug: request.debug ? {
        llmModel: llm.model,
        rawLlmText: llm.rawText,
        tourApiError: resolved.tourApiError,
        candidatesPassedToLlm: candidates,
      } : undefined,
    };
  } catch (error) {
    const fallback = buildRuleBasedCourse({
      selectedPlace,
      candidates,
      request,
      warning: "OpenRouter LLM 호출 또는 JSON 파싱 실패로 규칙 기반 fallback 코스를 생성했습니다.",
    });
    return {
      ...fallback,
      warnings: [...warnings, ...fallback.warnings],
      debug: request.debug ? {
        llmModel: request.llmModel ?? "openai/gpt-4o-mini",
        llmError: error instanceof Error ? error.message : "LLM_UNKNOWN_ERROR",
        tourApiError: resolved.tourApiError,
        candidatesPassedToLlm: candidates,
      } : undefined,
    };
  }
}
