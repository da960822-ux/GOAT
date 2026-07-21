import { Router, type IRouter } from "express";
import {
  createGoatCourseRecommendation,
  getPlaceById,
  getRouteCandidatePlaces,
  getRecommendationsWithExposure,
  InMemoryRecommendationExposureRepository,
  moodCategories,
  referenceCards,
  type ExposureRecommendationOptions,
  type Place,
  type TravelOrigin,
  type TravelPreferences,
} from "@workspace/travel-domain";
import { z } from "zod";
import { ApiError } from "../lib/api-response";
import { createRateLimiter } from "../lib/rate-limit";
import {
  geocodeOriginQuery,
  getKakaoCarRoute,
  isKakaoGeocodingConfigured,
  isKakaoRoutingConfigured,
  type Coordinates,
  type RouteMetric,
} from "../services/kakao-location";

const router: IRouter = Router();

const readPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const RECOMMEND_RATE_LIMIT_WINDOW_MS = readPositiveInt(
  process.env.RECOMMEND_RATE_LIMIT_WINDOW_SECONDS,
  60,
) * 1000;
const recommendRateLimit = createRateLimiter({
  windowMs: RECOMMEND_RATE_LIMIT_WINDOW_MS,
  max: readPositiveInt(process.env.RECOMMEND_RATE_LIMIT_MAX, 30),
});
const courseRateLimit = createRateLimiter({
  windowMs: RECOMMEND_RATE_LIMIT_WINDOW_MS,
  max: readPositiveInt(process.env.COURSE_RATE_LIMIT_MAX, 8),
});
const geocodeRateLimit = createRateLimiter({
  windowMs: RECOMMEND_RATE_LIMIT_WINDOW_MS,
  max: readPositiveInt(process.env.GEOCODE_RATE_LIMIT_MAX, 20),
});
const KAKAO_ROUTE_CANDIDATE_LIMIT = Math.min(
  readPositiveInt(process.env.KAKAO_ROUTE_CANDIDATE_LIMIT, 8),
  12,
);
const exposureRepository = new InMemoryRecommendationExposureRepository([], {
  maxRecords: readPositiveInt(process.env.RECOMMEND_EXPOSURE_MAX_RECORDS, 12_000),
  ttlMs: Math.min(
    readPositiveInt(process.env.RECOMMEND_EXPOSURE_TTL_HOURS, 24),
    24 * 30,
  ) * 60 * 60 * 1000,
});

const defaultLlmModel = process.env.OPENROUTER_DEFAULT_MODEL?.trim() || "openai/gpt-4o-mini";
const allowedLlmModels = new Set(
  (process.env.OPENROUTER_ALLOWED_MODELS ?? defaultLlmModel)
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean),
);
const isDebugEnabled = process.env.ALLOW_RECOMMENDATION_DEBUG === "true";

const LOCATION_FAILURE_NOTICE = "현재 위치를 불러오지 못했어요. 우선 거리 정보 없이 추천해드릴게요.";

const originSchema = z
  .object({
    type: z.enum(["current", "region", "address", "skip"]),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    regionName: z.string().min(1).max(200).optional(),
  })
  .strict();

const geocodeOriginSchema = z.object({
  query: z.string().trim().min(2).max(120),
}).strict();

type OriginStatus = "APPLIED" | "SKIPPED" | "UNAVAILABLE";

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

function toCoordinates(place: Place | undefined): Coordinates | null {
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

function fallbackRoute(origin: Coordinates, destination: Coordinates): {
  distanceKm: number;
  source: "HAVERSINE";
} {
  return { distanceKm: straightDistanceKm(origin, destination), source: "HAVERSINE" };
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
      const index = cursor;
      cursor += 1;
      try {
        results[index] = { status: "fulfilled", value: await mapper(values[index]) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, () => worker()));
  return results;
}


const requestSchema = z
  .object({
    moodId: z.string().min(1).optional(),
    referenceCardId: z.string().min(1).optional(),
    travelPurpose: z.enum([
      "사진·포토스팟",
      "산책·힐링",
      "카페·실내휴식",
      "전시·건축관람",
      "체험·액티비티",
      "먹거리·야간탐방",
      "숙소·리조트",
    ]).optional(),
    transportType: z.enum(["자차", "대중교통", "도보중심"]).optional(),
    visitTime: z.enum(["새벽", "오전", "한낮", "오후", "저녁", "야간"]).optional(),
    currentMonth: z.number().int().min(1).max(12).optional(),
    sessionId: z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/).optional(),
    rerollOfRequestId: z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/).optional(),
    debug: z.boolean().optional(),
    preferences: z
      .object({
        companion: z.enum(["혼자", "연인", "친구", "가족"]),
        transport: z.enum(["자차", "대중교통", "도보중심"]),
        visitTime: z.enum(["새벽", "오전", "한낮", "오후", "일몰", "저녁", "야간", "밤/새벽"]).nullable().optional(),
        purpose: z.enum(["가볍게 산책", "사진 위주", "액티비티", "조용한 휴식"]),
      })
      .strict()
      .optional(),
    origin: originSchema.optional(),
    excludeIds: z.array(z.string().min(1)).max(61).refine(
      (ids) => new Set(ids).size === ids.length,
      "excludeIds에는 중복된 장소 ID를 넣을 수 없습니다.",
    ).optional(),
  })
  .strict()
  .refine((body) => body.moodId || body.referenceCardId, {
    message: "moodId 또는 referenceCardId 중 하나는 필수입니다.",
    path: ["moodId"],
  })
  .refine((body) => !body.rerollOfRequestId || Boolean(body.sessionId), {
    message: "rerollOfRequestId를 사용할 때는 sessionId가 필요합니다.",
    path: ["sessionId"],
  });

const courseRequestSchema = z
  .object({
    selectedPlaceId: z.string().min(1),
    primaryTheme: z.enum([
      "바다·해안 무드",
      "일본 소도시·골목 무드",
      "알프스·고원·목장 무드",
      "숲·정원·자연휴식 무드",
      "레트로·시장·항구 무드",
      "건축·전시·랜드마크 무드",
      "휴양·카페·이국공간 무드",
    ]),
    userMoodTags: z.array(z.string().min(1)).max(10).optional(),
    userSceneTags: z.array(z.string().min(1)).max(10).optional(),
    companionType: z.enum(["혼자", "친구", "연인", "가족"]).optional(),
    travelPurpose: z.enum([
      "사진·포토스팟",
      "산책·힐링",
      "카페·실내휴식",
      "전시·건축관람",
      "체험·액티비티",
      "먹거리·야간탐방",
      "숙소·리조트",
    ]).optional(),
    transportType: z.enum(["자차", "대중교통", "도보중심"]).optional(),
    radiusMeters: z.number().int().min(100).max(20000).optional(),
    maxCandidatesForLlm: z.number().int().min(1).max(20).optional(),
    forceRuleBasedFallback: z.boolean().optional(),
    llmModel: z.string().min(1).max(120).optional(),
    debug: z.boolean().optional(),
  })
  .strict();

const courseMapQuerySchema = z.object({
  centerLat: z.coerce.number().min(-90).max(90),
  centerLng: z.coerce.number().min(-180).max(180),
  level: z.coerce.number().int().min(1).max(14).optional(),
  markers: z.string().min(2).max(6000),
});

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function serializeForInlineScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function parseCourseMapMarkers(value: string) {
  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed)) throw new Error("markers must be an array");
  return parsed.slice(0, 12).map((marker) => {
    if (!marker || typeof marker !== "object") throw new Error("invalid marker");
    const record = marker as Record<string, unknown>;
    const lat = Number(record.lat);
    const lng = Number(record.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("invalid marker coordinates");
    return {
      order: Number.isFinite(Number(record.order)) ? Number(record.order) : undefined,
      title: String(record.title ?? "").slice(0, 120),
      lat,
      lng,
    };
  });
}

router.get("/moods", (_req, res) => {
  res.json({
    success: true,
    code: "SUCCESS",
    message: "감성 카테고리를 조회했습니다.",
    data: {
      moods: moodCategories.map(({ id, name, description, keywords }) => ({
        id,
        name,
        description,
        keywords,
        referenceCards: referenceCards.filter((card) => card.primaryTheme === name),
      })),
      referenceCards,
    },
  });
});

router.get("/course-map", (req, res, next) => {
  const parsed = courseMapQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    next(new ApiError(400, "INVALID_REQUEST", "지도 요청값이 올바르지 않습니다.", parsed.error.flatten()));
    return;
  }

  const kakaoJavascriptKey = process.env.KAKAO_JAVASCRIPT_KEY?.trim();
  if (!kakaoJavascriptKey) {
    next(new ApiError(500, "KAKAO_JAVASCRIPT_KEY_MISSING", "Kakao JavaScript 키가 설정되지 않았습니다."));
    return;
  }

  let markers: ReturnType<typeof parseCourseMapMarkers>;
  try {
    markers = parseCourseMapMarkers(parsed.data.markers);
  } catch {
    next(new ApiError(400, "INVALID_REQUEST", "지도 마커 요청값이 올바르지 않습니다."));
    return;
  }

  const markerJson = serializeForInlineScript(markers);
  const markerHtml = markers
    .map((marker) => `<li><strong>${escapeHtml(marker.order ?? "")}</strong> ${escapeHtml(marker.title)}</li>`)
    .join("");

  res
    .status(200)
    .type("html")
    .send(`<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; }
    body { overflow: hidden; background: #e5e7eb; font-family: Arial, sans-serif; }
    #error { display: none; padding: 12px; font-size: 13px; color: #475569; }
    .badge {
      min-width: 22px; height: 22px; border-radius: 999px; background: #0ea5e9; color: #fff;
      border: 2px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,.2);
      display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="error">카카오 지도를 불러오지 못했습니다. Kakao Developers의 JavaScript SDK 도메인에 현재 주소를 등록했는지 확인해 주세요.<ul>${markerHtml}</ul></div>
  <script>
    window.__GOAT_COURSE_MAP__ = {
      center: { lat: ${parsed.data.centerLat}, lng: ${parsed.data.centerLng} },
      level: ${parsed.data.level ?? 7},
      markers: ${markerJson}
    };
  </script>
  <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(kakaoJavascriptKey)}&autoload=false"></script>
  <script>
    function showError() {
      document.getElementById("map").style.display = "none";
      document.getElementById("error").style.display = "block";
    }
    function renderMap() {
      if (!window.kakao || !window.kakao.maps) {
        showError();
        return;
      }
      kakao.maps.load(function () {
        var data = window.__GOAT_COURSE_MAP__;
        var container = document.getElementById("map");
        var map = new kakao.maps.Map(container, {
          center: new kakao.maps.LatLng(data.center.lat, data.center.lng),
          level: data.level
        });
        var bounds = new kakao.maps.LatLngBounds();
        var path = [];
        data.markers.forEach(function (marker) {
          var position = new kakao.maps.LatLng(marker.lat, marker.lng);
          bounds.extend(position);
          path.push(position);
          new kakao.maps.Marker({ map: map, position: position, title: marker.title || "" });
          new kakao.maps.CustomOverlay({
            map: map,
            position: position,
            yAnchor: 1.55,
            content: '<div class="badge">' + (marker.order || '') + '</div>'
          });
        });
        if (path.length > 1) {
          new kakao.maps.Polyline({
            map: map,
            path: path,
            strokeWeight: 4,
            strokeColor: "#0EA5E9",
            strokeOpacity: 0.85,
            strokeStyle: "solid"
          });
          map.setBounds(bounds);
        }
      });
    }
    window.addEventListener("error", showError);
    renderMap();
  </script>
</body>
</html>`);
});

router.post("/geocode-origin", geocodeRateLimit, async (req, res, next) => {
  const parsed = geocodeOriginSchema.safeParse(req.body);
  if (!parsed.success) {
    next(new ApiError(400, "INVALID_REQUEST", "출발지 검색어를 확인해 주세요.", parsed.error.flatten()));
    return;
  }
  if (!isKakaoGeocodingConfigured()) {
    next(new ApiError(503, "KAKAO_LOCAL_NOT_CONFIGURED", "출발지 검색 기능이 아직 설정되지 않았습니다."));
    return;
  }
  try {
    const result = await geocodeOriginQuery(parsed.data.query);
    if (!result) {
      next(new ApiError(404, "ORIGIN_NOT_FOUND", "입력한 출발지를 찾지 못했습니다."));
      return;
    }
    res.json({
      success: true,
      code: "SUCCESS",
      message: "출발지를 확인했습니다.",
      data: {
        origin: {
          type: "address",
          latitude: result.latitude,
          longitude: result.longitude,
          regionName: result.label,
        },
        address: result.address,
        source: result.source,
      },
    });
  } catch (error) {
    req.log?.warn?.({ err: error }, "Kakao origin geocoding failed");
    next(new ApiError(502, "KAKAO_LOCAL_FAILED", "출발지 검색에 실패했습니다. 잠시 후 다시 시도해 주세요."));
  }
});

router.post("/recommend-from-tags", recommendRateLimit, async (req, res, next) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    next(
      new ApiError(
        400,
        "INVALID_REQUEST",
        "요청값이 올바르지 않습니다.",
        parsed.error.flatten(),
      ),
    );
    return;
  }

  if (parsed.data.debug && !isDebugEnabled) {
    next(new ApiError(403, "DEBUG_NOT_ALLOWED", "Debug responses are disabled."));
    return;
  }

  const mood = parsed.data.moodId
    ? moodCategories.find(({ id }) => id === parsed.data.moodId)
    : undefined;
  if (parsed.data.moodId && !mood) {
    next(new ApiError(400, "INVALID_MOOD_ID", "존재하지 않는 감성 ID입니다."));
    return;
  }

  const originResult = normalizeOrigin(parsed.data.origin as TravelOrigin | undefined);
  const transportType = parsed.data.transportType ?? parsed.data.preferences?.transport;
  const travelPurpose = parsed.data.travelPurpose ?? parsed.data.preferences?.purpose;
  const commonOptions: ExposureRecommendationOptions = {
    referenceCardId: parsed.data.referenceCardId,
    travelPurpose: parsed.data.travelPurpose,
    transportType: parsed.data.transportType,
    visitTime: parsed.data.visitTime,
    currentMonth: parsed.data.currentMonth,
    origin: originResult.origin,
    routeDistanceEnabled: originResult.status === "APPLIED",
    excludeIds: parsed.data.excludeIds,
    debug: parsed.data.debug,
    sessionId: parsed.data.sessionId,
    rerollOfRequestId: parsed.data.rerollOfRequestId,
    persistExposures: false,
  };
  let finalRecommendationOptions: ExposureRecommendationOptions = commonOptions;

  let result = await getRecommendationsWithExposure(
    exposureRepository,
    mood?.id,
    parsed.data.preferences as TravelPreferences | undefined,
    parsed.data.excludeIds,
    commonOptions,
  );
  if (!result) {
    next(new ApiError(400, "INVALID_REQUEST", "추천 기준을 찾을 수 없습니다."));
    return;
  }
  const recommendationRequestId = result.requestId;
  if (!recommendationRequestId) {
    next(new ApiError(500, "RECOMMENDATION_REQUEST_ID_MISSING", "추천 요청을 추적할 수 없습니다."));
    return;
  }
  finalRecommendationOptions = { ...commonOptions, requestId: recommendationRequestId };

  const routeWarnings: string[] = [];
  const firstPlace = result.recommendations[0]?.place;
  const firstCoordinates = toCoordinates(firstPlace);

  // 자차 사용자는 카카오 자동차 길찾기로 2·3번 카드 후보의 실제 이동시간을 계산한다.
  // 전체 장소를 호출하지 않고 Haversine으로 1차 후보를 압축한 뒤, 최종 카드가 후보 밖에서
  // 바뀐 경우에만 최대 2회 보완 호출한다. 최종 카드도 실패하면 Haversine fallback을 유지한다.
  if (
    originResult.status === "APPLIED"
    && transportType === "자차"
    && firstPlace
    && firstCoordinates
    && isKakaoRoutingConfigured()
  ) {
    const routeDistanceKmByPlaceId: Record<string, number | undefined> = {};
    const routeDurationMinByPlaceId: Record<string, number | undefined> = {};
    const routeSourceByPlaceId: Record<string, "KAKAO_ROUTE" | undefined> = {};
    const attemptedPlaceIds = new Set<string>();
    const maxRouteCalls = Math.min(KAKAO_ROUTE_CANDIDATE_LIMIT + 2, 12);
    let successfulRoutes = 0;
    let failedRoutes = 0;

    const loadRouteMetrics = async (places: Place[]) => {
      const remaining = Math.max(0, maxRouteCalls - attemptedPlaceIds.size);
      const pending = places
        .filter((place) => !attemptedPlaceIds.has(place.place_id) && toCoordinates(place))
        .slice(0, remaining);
      for (const place of pending) attemptedPlaceIds.add(place.place_id);
      if (pending.length === 0) return;

      const routeResults = await mapWithConcurrency<Place, { placeId: string; metric: RouteMetric | null }>(
        pending,
        4,
        async (place) => {
          const destination = toCoordinates(place);
          if (!destination) return { placeId: place.place_id, metric: null as RouteMetric | null };
          return { placeId: place.place_id, metric: await getKakaoCarRoute(firstCoordinates, destination) };
        },
      );

      for (const routeResult of routeResults) {
        if (routeResult.status !== "fulfilled" || !routeResult.value.metric) {
          failedRoutes += 1;
          continue;
        }
        successfulRoutes += 1;
        routeDistanceKmByPlaceId[routeResult.value.placeId] = routeResult.value.metric.distanceKm;
        routeDurationMinByPlaceId[routeResult.value.placeId] = routeResult.value.metric.durationMin;
        routeSourceByPlaceId[routeResult.value.placeId] = "KAKAO_ROUTE";
      }
    };

    const includeIds = result.recommendations.slice(1).map((item) => item.place.place_id);
    await loadRouteMetrics(getRouteCandidatePlaces({
      firstPlaceId: firstPlace.place_id,
      travelPurpose,
      excludeIds: parsed.data.excludeIds,
      includeIds,
      limit: KAKAO_ROUTE_CANDIDATE_LIMIT,
    }));

    finalRecommendationOptions = {
      ...commonOptions,
      requestId: recommendationRequestId,
      routeDistanceKmByPlaceId,
      routeDurationMinByPlaceId,
      routeSourceByPlaceId,
    };
    const rerunWithRoutes = () => getRecommendationsWithExposure(
      exposureRepository,
      mood?.id,
      parsed.data.preferences as TravelPreferences | undefined,
      parsed.data.excludeIds,
      finalRecommendationOptions,
    );

    if (successfulRoutes > 0) {
      result = await rerunWithRoutes() ?? result;

      // 실제 길찾기 점수 반영 후 카드가 바뀔 수 있으므로, 최종 2·3번 카드에 실제 경로값이
      // 없으면 해당 카드만 보완 조회하고 다시 산정한다. 무한 재선정을 막기 위해 최대 2회다.
      for (let pass = 0; pass < 2; pass += 1) {
        const missingFinalCards = result.recommendations
          .slice(1)
          .map((item) => item.place)
          .filter((place) => !routeDurationMinByPlaceId[place.place_id] && toCoordinates(place));
        if (missingFinalCards.length === 0 || attemptedPlaceIds.size >= maxRouteCalls) break;
        const before = successfulRoutes;
        await loadRouteMetrics(missingFinalCards);
        if (successfulRoutes === before) break;
        result = await rerunWithRoutes() ?? result;
      }

      const finalMissingRoute = result.recommendations
        .slice(1)
        .some((item) => !routeDurationMinByPlaceId[item.place.place_id]);
      if (failedRoutes > 0 || finalMissingRoute) {
        routeWarnings.push("KAKAO_ROUTE_PARTIAL_FALLBACK");
      }
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

  // 경로 후보 재산정 중에는 저장하지 않고, 실제 응답으로 확정된 계산을 세션당 한 번만 기록한다.
  const persistedResult = await getRecommendationsWithExposure(
    exposureRepository,
    mood?.id,
    parsed.data.preferences as TravelPreferences | undefined,
    parsed.data.excludeIds,
    {
      ...finalRecommendationOptions,
      requestId: recommendationRequestId,
      persistExposures: true,
    },
  );
  if (persistedResult) result = persistedResult;

  // 출발지는 1번 카드 점수에는 반영하지 않고, 사용자가 이동 부담을 확인할 수 있는 정보로만 제공한다.
  const finalFirstPlace = result.recommendations[0]?.place;
  const finalFirstCoordinates = toCoordinates(finalFirstPlace);
  if (originResult.status === "APPLIED" && finalFirstCoordinates) {
    const originCoordinates: Coordinates = {
      latitude: Number(originResult.origin.latitude),
      longitude: Number(originResult.origin.longitude),
    };
    let firstRoute: RouteMetric | null = null;
    if (transportType === "자차" && isKakaoRoutingConfigured()) {
      try {
        firstRoute = await getKakaoCarRoute(originCoordinates, finalFirstCoordinates);
      } catch (error) {
        req.log?.warn?.({ err: error }, "Kakao origin-to-first route failed");
        routeWarnings.push("KAKAO_ORIGIN_ROUTE_FALLBACK");
      }
    }
    const fallback = fallbackRoute(originCoordinates, finalFirstCoordinates);
    result.recommendations[0].routeInfo = {
      from: "ORIGIN",
      fromLabel: "출발지에서",
      distanceKm: firstRoute?.distanceKm ?? fallback.distanceKm,
      ...(firstRoute ? { durationMin: firstRoute.durationMin } : {}),
      source: firstRoute?.source ?? fallback.source,
      estimated: !firstRoute,
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

  res.json({
    success: true,
    code: "SUCCESS",
    message: "추천 장소를 조회했습니다.",
    data: { ...result },
  });
});

router.post("/recommend-course", courseRateLimit, async (req, res, next) => {
  const parsed = courseRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    next(
      new ApiError(
        400,
        "INVALID_REQUEST",
        "코스 추천 요청값이 올바르지 않습니다.",
        parsed.error.flatten(),
      ),
    );
    return;
  }

  if (parsed.data.debug && !isDebugEnabled) {
    next(new ApiError(403, "DEBUG_NOT_ALLOWED", "Debug responses are disabled."));
    return;
  }

  if (parsed.data.llmModel && !allowedLlmModels.has(parsed.data.llmModel)) {
    next(new ApiError(400, "LLM_MODEL_NOT_ALLOWED", "The requested LLM model is not allowed."));
    return;
  }

  try {
    const result = await createGoatCourseRecommendation({
      ...parsed.data,
      llmModel: parsed.data.llmModel ?? defaultLlmModel,
    });
    if (result.status === "FAILED") {
      next(new ApiError(400, result.failReason ?? "COURSE_RECOMMENDATION_FAILED", result.message));
      return;
    }

    res.json({
      success: true,
      code: "SUCCESS",
      message: "하루 코스를 생성했습니다.",
      data: result,
    });
  } catch (error) {
    req.log?.error?.({ err: error }, "Course recommendation failed");
    next(
      new ApiError(
        500,
        "COURSE_RECOMMENDATION_FAILED",
        "하루 코스 생성 중 오류가 발생했습니다.",
      ),
    );
  }
});

router.get("/places/:id", (req, res, next) => {
  const place = getPlaceById(req.params.id);
  if (!place) {
    next(new ApiError(404, "PLACE_NOT_FOUND", "장소를 찾을 수 없습니다."));
    return;
  }

  res.json({
    success: true,
    code: "SUCCESS",
    message: "장소를 조회했습니다.",
    data: { place },
  });
});

export default router;
