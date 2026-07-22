import { GoatPlace, GoatPlaceDataset } from "./goatRecommendationTypes";
import {
  CourseStop,
  GoatDayCourseRequest,
  GoatDayCourseResult,
  LlmCoursePlannerJson,
  TourApiNearbyCandidate,
} from "./courseRecommendationTypes";
import { callOpenRouterCoursePlanner } from "./openRouterCourseLlm";
import {
  fetchVisitKoreaContentLabNearbyCandidates,
  type VisitKoreaNearbyDiagnostics,
} from "./tourApiClient";
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

function distanceMeters(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const radiusMeters = 6_371_000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const haversine = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * radiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)));
}

function findSelectedPlace(dataset: GoatPlaceDataset, selectedPlaceId: string): GoatPlace | undefined {
  return dataset.places.find((place) => place.place_id === selectedPlaceId);
}

function localFallbackCandidates(dataset: GoatPlaceDataset, selectedPlace: GoatPlace): TourApiNearbyCandidate[] {
  const selectedCoords = getPlaceCoordinates(selectedPlace);
  return dataset.places
    .filter((place) => place.place_id !== selectedPlace.place_id)
    .filter((place) => place.city === selectedPlace.city || place.region_group === selectedPlace.region_group)
    .map((place) => {
      const coords = getPlaceCoordinates(place);
      return {
        id: place.place_id,
        title: place.place_name,
        category: place.place_type.includes("카페")
          ? "CAFE" as const
          : place.place_type.includes("시장") || place.place_type.includes("항구")
            ? "MARKET" as const
            : "TOUR" as const,
        address: typeof place.address === "string" ? place.address : undefined,
        overview: `${place.primaryTheme} / ${place.photo_point} / ${place.recommendation_use}`,
        mapX: coords?.lng,
        mapY: coords?.lat,
        distanceMeters: selectedCoords && coords ? distanceMeters(selectedCoords, coords) : undefined,
        source: "LOCAL_DB" as const,
        raw: place,
      };
    })
    .sort((a, b) => (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) - (b.distanceMeters ?? Number.MAX_SAFE_INTEGER))
    .slice(0, 12);
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
  const type = candidate.category === "CAFE"
    ? "CAFE"
    : candidate.category === "RESTAURANT" || candidate.category === "MARKET"
      ? "RESTAURANT"
      : candidate.category === "WALK"
        ? "WALK"
        : candidate.category === "PHOTO"
          ? "PHOTO"
          : candidate.category === "ETC"
            ? "ETC"
            : "TOUR";

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

/** Keeps the selected place first and orders coordinate-bearing stops by nearest neighbour. */
export function sortCourseStopsByNearestNeighbor(stops: CourseStop[]): CourseStop[] {
  if (stops.length <= 1) return stops.map((stop, index) => ({ ...stop, order: index + 1 }));
  const [start, ...remainingInput] = stops;
  const ordered = [start];
  const remaining = [...remainingInput];
  let current = start;

  while (remaining.length > 0) {
    const currentCoords = typeof current.lat === "number" && Number.isFinite(current.lat)
      && typeof current.lng === "number" && Number.isFinite(current.lng)
      ? { lat: current.lat, lng: current.lng }
      : null;
    if (!currentCoords) {
      ordered.push(...remaining);
      break;
    }

    let nearestIndex = -1;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      if (
        typeof candidate.lat !== "number" || !Number.isFinite(candidate.lat)
        || typeof candidate.lng !== "number" || !Number.isFinite(candidate.lng)
      ) continue;
      const candidateDistance = distanceMeters(currentCoords, { lat: candidate.lat, lng: candidate.lng });
      if (candidateDistance < nearestDistance) {
        nearestDistance = candidateDistance;
        nearestIndex = index;
      }
    }

    if (nearestIndex < 0) {
      ordered.push(...remaining);
      break;
    }
    current = remaining.splice(nearestIndex, 1)[0];
    ordered.push(current);
  }

  return ordered.map((stop, index) => ({ ...stop, order: index + 1 }));
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
  const picked = [tour, cafe, food]
    .filter((candidate): candidate is TourApiNearbyCandidate => Boolean(candidate))
    .slice(0, 3);
  const stops = sortCourseStopsByNearestNeighbor([
    selected,
    ...picked.map((candidate, index) => candidateToStop(candidate, index + 2)),
  ]);

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
    staticMap: buildKakaoStaticMapResult(stops, params.selectedPlace.place_name),
    llmPromptUsed: false,
    failReason: null,
    warnings: [params.warning],
  };
}

function buildStopsFromLlm(
  selectedPlace: GoatPlace,
  llm: LlmCoursePlannerJson,
  candidates: TourApiNearbyCandidate[],
): CourseStop[] {
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const selectedStop = mapSelectedPlaceToStop(selectedPlace);
  const llmStops = llm.stops
    .filter((stop) => stop.id !== selectedPlace.place_id)
    .map((stop, index) => {
      const candidate = byId.get(stop.id);
      if (!candidate) return null;
      return {
        ...candidateToStop(candidate, index + 2, stop.reason),
        stayMinutes: typeof stop.stayMinutes === "number" && Number.isFinite(stop.stayMinutes)
          ? stop.stayMinutes
          : 45,
      };
    })
    .filter((stop): stop is CourseStop => Boolean(stop));

  return sortCourseStopsByNearestNeighbor([selectedStop, ...llmStops]);
}

function normalizedTitle(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

async function resolveNearbyCandidates(params: {
  request: GoatDayCourseRequest;
  selectedPlace: GoatPlace;
  dataset: GoatPlaceDataset;
}): Promise<{
  candidates: TourApiNearbyCandidate[];
  warning?: string;
  tourApiError?: string;
  tourApiDiagnostics?: VisitKoreaNearbyDiagnostics;
}> {
  if (params.request.nearbyCandidates?.length) {
    return {
      candidates: params.request.nearbyCandidates.map((candidate) => ({
        ...candidate,
        source: candidate.source ?? "FRONTEND_PROVIDED",
      })),
    };
  }

  if (params.request.forceRuleBasedFallback) {
    return { candidates: localFallbackCandidates(params.dataset, params.selectedPlace) };
  }

  const coords = getPlaceCoordinates(params.selectedPlace);
  if (!coords) {
    return {
      candidates: localFallbackCandidates(params.dataset, params.selectedPlace),
      warning: "선택 장소 DB에 좌표가 없어 한국관광공사 반경 검색 대신 같은 city/region_group 기반 로컬 후보로 fallback했습니다.",
    };
  }

  let tourApiDiagnostics: VisitKoreaNearbyDiagnostics | undefined;
  try {
    const selectedTitle = normalizedTitle(params.selectedPlace.place_name);
    const nearby = (await fetchVisitKoreaContentLabNearbyCandidates({
      mapX: coords.lng,
      mapY: coords.lat,
      radiusMeters: params.request.radiusMeters ?? 3000,
      maxResults: 20,
      onDiagnostics: (diagnostics) => {
        tourApiDiagnostics = diagnostics;
      },
    })).filter((candidate) =>
      candidate.id !== params.selectedPlace.place_id
      && normalizedTitle(candidate.title) !== selectedTitle
    );
    if (nearby.length === 0) {
      return {
        candidates: localFallbackCandidates(params.dataset, params.selectedPlace),
        warning: "한국관광공사 OpenAPI 주변 후보가 0건이어서 로컬 후보 fallback을 사용했습니다.",
        tourApiDiagnostics,
      };
    }
    return {
      candidates: nearby,
      tourApiDiagnostics,
    };
  } catch (error) {
    return {
      candidates: localFallbackCandidates(params.dataset, params.selectedPlace),
      warning: "한국관광공사 OpenAPI 호출 실패로 로컬 후보 fallback을 사용했습니다.",
      tourApiError: error instanceof Error ? error.message : "TOUR_API_UNKNOWN_ERROR",
      tourApiDiagnostics,
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
    const fallback = buildRuleBasedCourse({
      selectedPlace,
      candidates,
      request,
      warning: request.forceRuleBasedFallback
        ? "forceRuleBasedFallback=true 요청으로 LLM을 호출하지 않았습니다."
        : "주변 후보가 없어 선택 장소 단독 코스로 fallback했습니다.",
    });
    return request.debug ? {
      ...fallback,
      debug: {
        tourApiError: resolved.tourApiError,
        tourApiDiagnostics: resolved.tourApiDiagnostics,
        candidatesPassedToLlm: candidates,
      },
    } : fallback;
  }

  try {
    const llm = await callOpenRouterCoursePlanner({
      selectedPlace,
      conditions: pickConditions(request),
      candidates,
      model: request.llmModel,
    });
    const stops = buildStopsFromLlm(selectedPlace, llm.parsed, candidates);
    return {
      status: "DONE",
      resultType: "COURSE",
      mode: "LLM_OPENROUTER",
      message: "OpenRouter LLM 프롬프트 기반 하루 코스 생성 완료",
      selectedPlace: pickSelectedPlaceSummary(selectedPlace),
      conditions: pickConditions(request),
      nearbyCandidateCount: candidates.length,
      courseTitle: llm.parsed.courseTitle,
      summary: llm.parsed.summary,
      stops,
      staticMap: buildKakaoStaticMapResult(stops, selectedPlace.place_name),
      llmPromptUsed: true,
      failReason: null,
      warnings,
      debug: request.debug ? {
        llmModel: llm.model,
        llmRequestedModel: llm.requestedModel,
        llmHttpStatus: llm.httpStatus,
        llmLatencyMs: llm.latencyMs,
        llmAttempts: llm.attempts,
        rawLlmText: llm.rawText,
        tourApiError: resolved.tourApiError,
        tourApiDiagnostics: resolved.tourApiDiagnostics,
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
        tourApiDiagnostics: resolved.tourApiDiagnostics,
        candidatesPassedToLlm: candidates,
      } : undefined,
    };
  }
}
