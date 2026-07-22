import {
  getPlaceById,
  getRecommendations,
  getRouteCandidatePlaces,
  type RecommendationRequestOptions,
  type RecommendationResult,
  type TravelOrigin,
  type TravelPreferences,
} from "@workspace/travel-domain";
import { logger } from "../lib/logger";
import {
  getKakaoCarRoute,
  isKakaoRoutingConfigured,
  type Coordinates,
  type RouteMetric,
} from "./kakao-location";

const LOCATION_FAILURE_NOTICE =
  "현재 위치를 불러오지 못했어요. 우선 거리 정보 없이 추천해드릴게요.";
const ROUTE_CANDIDATE_LIMIT = 8;
const MAX_ROUTE_CALLS = 12;
const ROUTE_CONCURRENCY = 4;

export type OriginStatus = "APPLIED" | "SKIPPED" | "UNAVAILABLE";

export interface RecommendationOrchestratorInput {
  moodId?: string;
  referenceCardId?: string;
  preferences?: TravelPreferences;
  travelPurpose?: string;
  transportType?: string;
  visitTime?: string;
  currentMonth?: number;
  origin?: TravelOrigin;
  excludeIds?: string[];
  debug?: boolean;
  userId?: string;
}

export interface RecommendationExposureReader {
  getExposureStats(query: { userId?: string; recentLimit?: number }): Promise<{
    recentExposureByPlaceId: Record<string, number | undefined>;
    totalExposureByPlaceId: Record<string, number | undefined>;
    themeAverageExposure: Record<string, number | undefined>;
  }>;
}

function normalizeOrigin(origin?: TravelOrigin): {
  origin: TravelOrigin;
  status: OriginStatus;
  notice?: string;
} {
  if (!origin || origin.type === "skip") {
    return { origin: { type: "skip" }, status: "SKIPPED" };
  }
  if (Number.isFinite(origin.latitude) && Number.isFinite(origin.longitude)) {
    return { origin, status: "APPLIED" };
  }
  return {
    origin: { type: "skip" },
    status: "UNAVAILABLE",
    notice: LOCATION_FAILURE_NOTICE,
  };
}

function toCoordinates(placeId: string | undefined): Coordinates | null {
  if (!placeId) return null;
  const place = getPlaceById(placeId);
  if (!place || !Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return null;
  return { latitude: Number(place.lat), longitude: Number(place.lng) };
}

function straightDistanceKm(origin: Coordinates, destination: Coordinates): number {
  const radiusKm = 6371;
  const dLat = ((destination.latitude - origin.latitude) * Math.PI) / 180;
  const dLng = ((destination.longitude - origin.longitude) * Math.PI) / 180;
  const lat1 = (origin.latitude * Math.PI) / 180;
  const lat2 = (destination.latitude * Math.PI) / 180;
  const value = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Number((2 * radiusKm * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))).toFixed(1));
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
): Promise<Array<PromiseSettledResult<R>>> {
  const results: Array<PromiseSettledResult<R>> = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor++;
      try {
        results[index] = { status: "fulfilled", value: await mapper(values[index]!) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => worker()),
  );
  return results;
}

export async function createRecommendationPreview(
  input: RecommendationOrchestratorInput,
  exposureRepository?: RecommendationExposureReader,
): Promise<RecommendationResult | undefined> {
  const originResult = normalizeOrigin(input.origin);
  const transportType = input.transportType ?? input.preferences?.transport;
  const travelPurpose = input.travelPurpose ?? input.preferences?.purpose;
  const exposureStats = exposureRepository
    ? await exposureRepository.getExposureStats({ userId: input.userId, recentLimit: 20 })
    : undefined;
  const commonOptions: RecommendationRequestOptions = {
    referenceCardId: input.referenceCardId,
    travelPurpose: input.travelPurpose,
    transportType: input.transportType,
    visitTime: input.visitTime,
    currentMonth: input.currentMonth,
    origin: originResult.origin,
    routeDistanceEnabled: originResult.status === "APPLIED",
    excludeIds: input.excludeIds,
    recentExposureByPlaceId: exposureStats?.recentExposureByPlaceId,
    totalExposureByPlaceId: exposureStats?.totalExposureByPlaceId,
    themeAverageExposure: exposureStats?.themeAverageExposure,
    debug: input.debug,
  };

  const run = (options: RecommendationRequestOptions) => Promise.resolve(getRecommendations(
        input.moodId,
        input.preferences,
        input.excludeIds,
        options,
      ));

  let finalOptions: RecommendationRequestOptions = commonOptions;
  let result = await run(commonOptions);
  if (!result) return undefined;

  const routeWarnings: string[] = [];
  const firstPlaceId = result.cards?.[0]?.placeId;
  const firstCoordinates = toCoordinates(firstPlaceId);

  if (
    originResult.status === "APPLIED"
    && transportType === "자차"
    && firstPlaceId
    && firstCoordinates
    && isKakaoRoutingConfigured()
  ) {
    const routeDistanceKmByPlaceId: Record<string, number | undefined> = {};
    const routeDurationMinByPlaceId: Record<string, number | undefined> = {};
    const routeSourceByPlaceId: Record<string, "KAKAO_ROUTE" | undefined> = {};
    const attemptedPlaceIds = new Set<string>();
    let successfulRoutes = 0;
    let failedRoutes = 0;

    const loadRouteMetrics = async (placeIds: string[]) => {
      const pending = placeIds
        .filter((placeId) => !attemptedPlaceIds.has(placeId) && toCoordinates(placeId))
        // Reserve one of the 12-call budget for origin -> first card.
        .slice(0, Math.max(0, MAX_ROUTE_CALLS - 1 - attemptedPlaceIds.size));
      for (const placeId of pending) attemptedPlaceIds.add(placeId);
      const settled = await mapWithConcurrency<string, { placeId: string; metric: RouteMetric | null }>(
        pending,
        ROUTE_CONCURRENCY,
        async (placeId) => ({
          placeId,
          metric: await getKakaoCarRoute(firstCoordinates, toCoordinates(placeId)!),
        }),
      );
      for (const item of settled) {
        if (item.status !== "fulfilled" || !item.value.metric) {
          failedRoutes += 1;
          continue;
        }
        successfulRoutes += 1;
        routeDistanceKmByPlaceId[item.value.placeId] = item.value.metric.distanceKm;
        routeDurationMinByPlaceId[item.value.placeId] = item.value.metric.durationMin;
        routeSourceByPlaceId[item.value.placeId] = "KAKAO_ROUTE";
      }
    };

    const candidateIds = getRouteCandidatePlaces({
      firstPlaceId,
      travelPurpose,
      excludeIds: input.excludeIds,
      includeIds: result.cards?.slice(1).map(({ placeId }) => placeId),
      limit: ROUTE_CANDIDATE_LIMIT,
    }).map(({ place_id }) => place_id);
    await loadRouteMetrics(candidateIds);

    finalOptions = {
      ...commonOptions,
      routeDistanceKmByPlaceId,
      routeDurationMinByPlaceId,
      routeSourceByPlaceId,
    };
    if (successfulRoutes > 0) {
      result = await run(finalOptions) ?? result;
      for (let pass = 0; pass < 2; pass += 1) {
        const missing = (result.cards ?? [])
          .slice(1)
          .map(({ placeId }) => placeId)
          .filter((placeId) => !routeDurationMinByPlaceId[placeId]);
        if (missing.length === 0 || attemptedPlaceIds.size >= MAX_ROUTE_CALLS) break;
        const before = successfulRoutes;
        await loadRouteMetrics(missing);
        if (before === successfulRoutes) break;
        result = await run(finalOptions) ?? result;
      }
      if (failedRoutes > 0 || (result.cards ?? []).slice(1).some(
        ({ placeId }) => !routeDurationMinByPlaceId[placeId],
      )) routeWarnings.push("KAKAO_ROUTE_PARTIAL_FALLBACK");
    } else if (attemptedPlaceIds.size > 0) {
      routeWarnings.push("KAKAO_ROUTE_FALLBACK");
    }
  } else if (
    originResult.status === "APPLIED"
    && transportType === "자차"
    && !isKakaoRoutingConfigured()
  ) {
    routeWarnings.push("KAKAO_ROUTE_NOT_CONFIGURED");
  }

  result = await run(finalOptions) ?? result;

  const finalFirst = result.recommendations[0];
  const finalFirstCoordinates = toCoordinates(finalFirst?.place.place_id);
  if (originResult.status === "APPLIED" && finalFirst && finalFirstCoordinates) {
    const originCoordinates = {
      latitude: Number(originResult.origin.latitude),
      longitude: Number(originResult.origin.longitude),
    };
    let route: RouteMetric | null = null;
    if (transportType === "자차" && isKakaoRoutingConfigured()) {
      try {
        route = await getKakaoCarRoute(originCoordinates, finalFirstCoordinates);
      } catch (error) {
        logger.warn({ error }, "Kakao origin-to-first route failed");
        routeWarnings.push("KAKAO_ORIGIN_ROUTE_FALLBACK");
      }
    }
    finalFirst.routeInfo = {
      from: "ORIGIN",
      fromLabel: "출발지에서",
      distanceKm: route?.distanceKm ?? straightDistanceKm(originCoordinates, finalFirstCoordinates),
      ...(route ? { durationMin: route.durationMin } : {}),
      source: route?.source ?? "HAVERSINE",
      estimated: !route,
      scoreApplied: false,
    };
  }

  result.originStatus = originResult.status;
  result.originNotice = originResult.notice;
  result.warnings = Array.from(new Set([
    ...(result.warnings ?? []),
    ...routeWarnings,
    ...(originResult.status === "UNAVAILABLE" ? ["ORIGIN_UNAVAILABLE"] : []),
  ]));
  return result;
}
