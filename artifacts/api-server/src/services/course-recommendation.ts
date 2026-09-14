import {
  goatPlacesDataset,
  isFirstReleaseCandidate,
  type GoatPlace,
  type GoatPlaceDataset,
  CourseStop,
  GoatDayCourseRequest,
  GoatDayCourseResult,
  TourApiNearbyCandidate,
} from "@workspace/travel-domain";
import { buildKakaoStaticMapResult } from "./kakao-static-map";
import { callOpenRouterCoursePlanner } from "./openrouter-course-llm";
import {
  fetchVisitKoreaContentLabNearbyCandidates,
  type VisitKoreaNearbyDiagnostics,
} from "./tour-api-client";
import { logger } from "../lib/logger";

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
    .filter((place) => isFirstReleaseCandidate(place.place_id))
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
    .slice(0, 3);
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
    .slice(0, 12);
  const stops = sortCourseStopsByNearestNeighbor([
    selected,
    ...picked.map((candidate, index) => candidateToStop(candidate, index + 2)),
  ]);

  return {
    status: "DONE",
    resultType: "COURSE",
    mode: "RULE_BASED_FALLBACK",
    message: "선택한 장소와 가까운 후보를 바탕으로 하루 코스를 준비했습니다.",
    selectedPlace: pickSelectedPlaceSummary(params.selectedPlace),
    conditions: pickConditions(params.request),
    nearbyCandidateCount: params.candidates.length,
    courseTitle: `${params.selectedPlace.place_name} 중심 하루 코스`,
    summary: "선택 장소를 기준으로 가까운 관광·카페·먹거리 후보를 이동하기 좋은 순서로 묶었습니다.",
    stops,
    staticMap: buildKakaoStaticMapResult(stops, params.selectedPlace.place_name),
    llmPromptUsed: false,
    failReason: null,
    warnings: [params.warning],
  };
}

function normalizedTitle(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

async function resolveNearbyCandidates(params: {
  selectedPlace: GoatPlace;
  dataset: GoatPlaceDataset;
  request: GoatDayCourseRequest;
}): Promise<{
  candidates: TourApiNearbyCandidate[];
  warning?: string;
  tourApiError?: string;
  tourApiDiagnostics?: VisitKoreaNearbyDiagnostics;
}> {
  // Client-provided candidates are deliberately ignored: a public course
  // request must attempt the KTO locationBasedList2 call first. Forced local
  // mode is reserved for explicitly enabled non-production diagnostics.
  const allowForcedFallback = process.env.GOAT_ALLOW_FORCE_FALLBACK === "true";
  if (params.request.forceRuleBasedFallback && allowForcedFallback) {
    return { candidates: localFallbackCandidates(params.dataset, params.selectedPlace) };
  }
  const coords = getPlaceCoordinates(params.selectedPlace);
  if (!coords) {
    return {
      candidates: localFallbackCandidates(params.dataset, params.selectedPlace),
      warning: "선택 장소 좌표가 없어 한국관광공사 주변 검색 대신 로컬 후보를 사용했습니다.",
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
      onDiagnostics: (diagnostics) => { tourApiDiagnostics = diagnostics; },
    })).filter((candidate) =>
      isFirstReleaseCandidate(candidate.id)
      && candidate.id !== params.selectedPlace.place_id
      && normalizedTitle(candidate.title) !== selectedTitle,
    );
    if (nearby.length) return { candidates: nearby, tourApiDiagnostics };
    return {
      candidates: localFallbackCandidates(params.dataset, params.selectedPlace),
      warning: "한국관광공사 주변 후보가 없어 로컬 후보를 사용했습니다.",
      tourApiDiagnostics,
    };
  } catch (error) {
    return {
      candidates: localFallbackCandidates(params.dataset, params.selectedPlace),
      warning: "한국관광공사 주변 검색에 실패해 로컬 후보를 사용했습니다.",
      tourApiError: error instanceof Error ? error.message : "TOUR_API_UNKNOWN_ERROR",
      tourApiDiagnostics,
    };
  }
}

function buildLlmCourse(params: {
  selectedPlace: GoatPlace;
  candidates: TourApiNearbyCandidate[];
  request: GoatDayCourseRequest;
  planner: Awaited<ReturnType<typeof callOpenRouterCoursePlanner>>;
  warnings?: string[];
}): GoatDayCourseResult {
  const selected = mapSelectedPlaceToStop(params.selectedPlace);
  const byId = new Map(params.candidates.map((candidate) => [candidate.id, candidate]));
  const stops = params.planner.parsed.stops.map((stop, index) => {
    if (stop.id === params.selectedPlace.place_id) {
      return { ...selected, order: index + 1, stayMinutes: stop.stayMinutes, reason: stop.reason };
    }
    const candidate = byId.get(stop.id);
    if (!candidate) throw new Error("LLM_SCHEMA_UNKNOWN_STOP_ID");
    return { ...candidateToStop(candidate, index + 1, stop.reason), title: candidate.title, stayMinutes: stop.stayMinutes };
  });
  if (stops[0]?.id !== params.selectedPlace.place_id) {
    throw new Error("LLM_SCHEMA_START_PLACE_NOT_FIRST");
  }
  return {
    status: "DONE",
    resultType: "COURSE",
    mode: "LLM_OPENROUTER",
    message: "Gemini가 선택 장소와 주변 후보를 바탕으로 하루 코스를 구성했습니다.",
    selectedPlace: pickSelectedPlaceSummary(params.selectedPlace),
    conditions: pickConditions(params.request),
    nearbyCandidateCount: params.candidates.length,
    courseTitle: params.planner.parsed.courseTitle,
    summary: params.planner.parsed.summary,
    stops,
    staticMap: buildKakaoStaticMapResult(stops, params.selectedPlace.place_name),
    llmPromptUsed: true,
    failReason: null,
    warnings: [...(params.warnings ?? []), params.planner.parsed.routeNote],
    debug: params.request.debug ? {
      llmModel: params.planner.model,
      llmRequestedModel: params.planner.requestedModel,
      llmHttpStatus: params.planner.httpStatus,
      llmLatencyMs: params.planner.latencyMs,
      llmAttempts: params.planner.attempts,
      rawLlmText: params.planner.rawText,
      candidatesPassedToLlm: params.candidates,
    } : undefined,
  };
}

function logFinalCourse(result: GoatDayCourseResult) {
  logger.info({
    serviceFeature: "ai_day_course",
    mode: result.mode,
    finalStopIds: result.stops.map((stop) => stop.id),
    finalStopSources: result.stops.map((stop) => stop.source),
    ktoStopCount: result.stops.filter((stop) => stop.source === "VISITKOREA_CONTENT_LAB").length,
  }, "ai day course final stops");
}

function addKtoEvidence(
  result: GoatDayCourseResult,
  resolved: Awaited<ReturnType<typeof resolveNearbyCandidates>>,
  candidates: TourApiNearbyCandidate[],
): GoatDayCourseResult {
  const diagnostics = resolved.tourApiDiagnostics;
  const finalKtoStopIds = result.stops
    .filter((stop) => stop.source === "VISITKOREA_CONTENT_LAB")
    .map((stop) => stop.id);
  result.ktoEvidence = {
    provider: "VISITKOREA_CONTENT_LAB",
    endpoint: "locationBasedList2",
    callId: diagnostics?.callId,
    liveCallAttempted: Boolean(diagnostics),
    requestCount: diagnostics?.requestCount ?? 0,
    successfulRequestCount: diagnostics?.successfulRequestCount ?? 0,
    failedRequestCount: diagnostics?.failedRequestCount ?? 0,
    rawCandidateCount: diagnostics?.rawCandidateCount ?? 0,
    filteredCandidateCount: diagnostics?.filteredCandidateCount ?? candidates.length,
    candidateIds: candidates.map((candidate) => candidate.id),
    finalKtoStopIds,
    fallbackUsed: Boolean(resolved.tourApiError || resolved.warning || candidates.some((candidate) => candidate.source === "LOCAL_DB")),
    fallbackReason: resolved.warning,
    generatedAt: new Date().toISOString(),
  };
  return result;
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

  const resolved = await resolveNearbyCandidates({ selectedPlace, dataset: placesDataset, request });
  const candidates = resolved.candidates.slice(0, Math.min(Math.max(request.maxCandidatesForLlm ?? 12, 1), 20));
  const warnings = resolved.warning ? [resolved.warning] : [];
  logger.info({
    serviceFeature: "ai_day_course",
    selectedPlaceId: selectedPlace.place_id,
    tourApiDiagnostics: resolved.tourApiDiagnostics,
    tourApiError: resolved.tourApiError,
    candidateCount: candidates.length,
    candidateSources: candidates.map((candidate) => candidate.source),
    candidateIds: candidates.map((candidate) => candidate.id),
    fallbackUsed: Boolean(resolved.tourApiError || resolved.warning || candidates.some((candidate) => candidate.source === "LOCAL_DB")),
  }, "ai day course nearby candidates");
  if ((!request.forceRuleBasedFallback || process.env.GOAT_ALLOW_FORCE_FALLBACK !== "true") && candidates.length > 0) {
    try {
      const planner = await callOpenRouterCoursePlanner({
        selectedPlace,
        conditions: pickConditions(request),
        candidates,
        model: request.llmModel,
      });
      const result = addKtoEvidence(buildLlmCourse({ selectedPlace, candidates, request, planner, warnings }), resolved, candidates);
      logFinalCourse(result);
      return result;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "OPENROUTER_REQUEST_FAILED";
      const fallback = buildRuleBasedCourse({
        selectedPlace,
        candidates,
        request,
        warning: "실시간 AI 연결이 원활하지 않아 검증된 장소 정보로 코스를 구성했습니다.",
      });
      const result = addKtoEvidence({
        ...fallback,
        warnings: [...warnings, ...fallback.warnings],
        debug: request.debug ? {
          ...(fallback.debug ?? {}),
          llmModel: request.llmModel ?? "google/gemini-3.7-flash",
          llmError: reason,
          tourApiError: resolved.tourApiError,
          tourApiDiagnostics: resolved.tourApiDiagnostics,
          candidatesPassedToLlm: candidates,
        } : undefined,
      }, resolved, candidates);
      logFinalCourse(result);
      return result;
    }
  }
  const fallback = buildRuleBasedCourse({
    selectedPlace,
    candidates,
    request,
    warning: candidates.length
      ? "LLM을 호출하지 않아 검증된 후보를 규칙 기반으로 구성했습니다."
      : "같은 권역의 추가 장소가 없어 선택 장소를 보존한 단독 코스입니다.",
  });
  const result = request.debug ? {
    ...fallback,
    warnings: [...warnings, ...fallback.warnings],
    debug: {
      tourApiError: resolved.tourApiError,
      tourApiDiagnostics: resolved.tourApiDiagnostics,
      candidatesPassedToLlm: candidates,
    },
  } : fallback;
  addKtoEvidence(result, resolved, candidates);
  logFinalCourse(result);
  return result;
}

export async function createGoatCourseRecommendation(
  request: GoatDayCourseRequest,
): Promise<GoatDayCourseResult> {
  return createGoatDayCourse(request, goatPlacesDataset);
}
