import { Router, type IRouter } from "express";
import {
  CreatePublicRecommendationResponse,
  GetPlacePhotosResponse,
  GetPublicSelectionsResponse,
  GetSceneCoverResponse,
  ReplacePublicRecommendationCardResponse,
  type SceneCover,
} from "@workspace/api-zod";
import {
  buildDiscoverySession,
  DISCOVERY_CATALOG_VERSION,
  DISCOVERY_POLICY_VERSION,
  getDiscoverySelection,
  getPhotoSearchHints,
  goatPlacesDataset,
  publicDiscoverySelections,
  rankDiscoveryCandidates,
  replaceDiscoveryCard,
  type DiscoverySession,
  type NormalizedConditionsByPlaceId,
} from "@workspace/travel-domain";
import {
  createPublicRecommendationSchema,
  getPlacePhotosSchema,
  getSceneCoverSchema,
  replacePublicRecommendationCardSchema,
} from "../contracts/public-discovery";
import { ApiError, getRequestId } from "../lib/api-response";
import { createRateLimiter } from "../lib/rate-limit";
import { getCuratedPlacePhotos } from "../services/curated-place-photos";
import { fetchKtoPlacePhotos } from "../services/kto-place-photo-provider";
import { selectPlacePhotos, selectSceneCover } from "../services/place-photo-service";
import { getShortTermForecast, toDiscoveryWeatherCondition } from "../services/today-context";

const router: IRouter = Router();
const places = goatPlacesDataset.places;
const sessions = new Map<string, { session: DiscoverySession; expiresAt: number }>();
const SESSION_TTL_MS = 30 * 60 * 1000;
const SESSION_LIMIT = 500;
const limit = createRateLimiter({ windowMs: 60_000, max: 30 });

function sessionKey(selectionId: string, snapshotAt: string) {
  return `${selectionId}:${snapshotAt}`;
}

function remember(session: DiscoverySession) {
  const now = Date.now();
  for (const [key, value] of sessions) if (value.expiresAt <= now) sessions.delete(key);
  sessions.set(sessionKey(session.selectionId, session.snapshotAt), {
    session,
    expiresAt: now + SESSION_TTL_MS,
  });
  while (sessions.size > SESSION_LIMIT) sessions.delete(sessions.keys().next().value!);
}

function photoInput(selectionId: string, placeId: string) {
  const selection = getDiscoverySelection(selectionId);
  const place = places.find((candidate) => candidate.place_id === placeId);
  if (!selection) throw new ApiError(404, "SELECTION_NOT_FOUND", "장면을 찾을 수 없습니다.");
  if (!place) throw new ApiError(404, "PLACE_NOT_FOUND", "장소를 찾을 수 없습니다.");
  const hints = getPhotoSearchHints(selection, place);
  return {
    selection,
    place,
    input: {
      placeId,
      placeName: place.place_name,
      city: place.city,
      selectionId,
      requiredPhotoTerms: hints.requiredTags,
      preferredPhotoTerms: hints.preferredTags,
      photoPointTerms: place.photo_point.split(/[,/·]/).map((term) => term.trim()).filter(Boolean),
    },
  };
}

async function selectPhotos(selectionId: string, placeId: string, provider = true) {
  const { input, place } = photoInput(selectionId, placeId);
  const curated = getCuratedPlacePhotos(placeId);
  const remote = provider
    ? await fetchKtoPlacePhotos(place.place_name, place.city).catch((error) => {
        if (curated.length) return [];
        throw error;
      })
    : [];
  return selectPlacePhotos(input, [...curated, ...remote]);
}

async function publicData(session: DiscoverySession) {
  const cards = await Promise.all(session.cards.map(async (card) => {
    let photos: Awaited<ReturnType<typeof selectPhotos>> | null = null;
    let galleryStatus: "AVAILABLE" | "EMPTY" | "ERROR" = "EMPTY";
    try {
      photos = await selectPhotos(session.selectionId, card.placeId);
      galleryStatus = photos.galleryStatus;
    } catch {
      galleryStatus = "ERROR";
    }
    const conditions = [];
    if (session.transportType) conditions.push({
      factor: "TRANSPORT" as const,
      status: "KNOWN" as const,
      message: session.transportType === "CAR" ? "자차 이동 기준" : "대중교통 이동 기준",
    });
    if (session.mode === "TODAY") {
      conditions.push({
        factor: "WEATHER" as const,
        status: session.appliedFactors.includes("WEATHER") ? "KNOWN" as const : "UNKNOWN" as const,
        message: session.appliedFactors.includes("WEATHER") ? "오늘 날씨 비교 반영" : "오늘 날씨 비교 불가",
      });
      conditions.push({
        factor: "VISIT_CONCENTRATION" as const,
        status: "UNKNOWN" as const,
        message: "비교 가능한 방문 집중도 없음",
      });
    }
    if (card.matchType === "NONE") throw new Error("INVALID_DISCOVERY_CARD");
    return {
      placeId: card.placeId,
      matchType: card.matchType,
      sceneFitBand: card.sceneFitBand,
      matchedFeatures: card.matchedFeatures,
      differenceNote: card.differenceNote,
      placeHero: photos?.placeHero ?? null,
      galleryStatus,
      conditions,
      sourceAttributions: photos?.sourceAttributions ?? [],
      replacementCount: card.replacementCount,
      replaceOptions: card.replaceOptions,
      canReplace: card.canReplace,
    };
  }));
  return {
    policyVersion: DISCOVERY_POLICY_VERSION,
    catalogVersion: DISCOVERY_CATALOG_VERSION,
    selectionId: session.selectionId,
    mode: session.mode,
    cards,
    revision: session.revision,
    snapshotAt: session.snapshotAt,
    todayStatus: session.todayStatus,
    appliedFactors: session.appliedFactors,
    skippedFactors: session.skippedFactors,
    partialApplied: session.partialApplied,
  };
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function todayConditions(
  selection: NonNullable<ReturnType<typeof getDiscoverySelection>>,
  transportType?: "CAR" | "PUBLIC_TRANSIT",
): Promise<NormalizedConditionsByPlaceId> {
  const comparison = rankDiscoveryCandidates({
    selection,
    places,
    mode: "SCENE",
    transportType,
  }).slice(0, 8);
  return Object.fromEntries(await Promise.all(comparison.map(async ({ place }) => {
    const weather = await getShortTermForecast({
      latitude: number(place.latitude ?? place.lat),
      longitude: number(place.longitude ?? place.lng),
    });
    return [place.place_id, {
      weather: toDiscoveryWeatherCondition(weather),
      visitConcentration: { status: "UNAVAILABLE" as const, reason: "NOT_COMPARABLE" as const },
    }];
  })));
}

router.get("/selections", (_req, res) => {
  const selections = publicDiscoverySelections.map((selection) => {
    let sceneCover: SceneCover = {
      selectionId: selection.selectionId,
      kind: "EDITORIAL" as const,
      token: `editorial:${selection.sceneCoverToken}`,
      fallbackReason: "NO_PHOTO" as const,
    };
    for (const placeId of selection.sceneCoverCandidates) {
      const { input } = photoInput(selection.selectionId, placeId);
      const candidate = selectSceneCover(input, getCuratedPlacePhotos(placeId));
      if (candidate.kind === "PHOTO") {
        sceneCover = candidate;
        break;
      }
    }
    return {
      selectionId: selection.selectionId,
      kind: selection.kind,
      title: selection.title,
      description: selection.description,
      availability: selection.availability,
      sceneCover,
    };
  });
  res.json(GetPublicSelectionsResponse.parse({
    success: true,
    code: "SUCCESS",
    message: "장면 목록을 불러왔습니다.",
    data: { selections },
  }));
});

router.get("/scene-cover", async (req, res, next) => {
  const parsed = getSceneCoverSchema.safeParse(req.query);
  if (!parsed.success) return next(new ApiError(400, "INVALID_REQUEST", "장면 요청값이 올바르지 않습니다."));
  const selection = getDiscoverySelection(parsed.data.selectionId);
  if (!selection) return next(new ApiError(404, "SELECTION_NOT_FOUND", "장면을 찾을 수 없습니다."));
  let providerFailed = false;
  try {
    for (const placeId of selection.sceneCoverCandidates) {
      try {
        const { input, place } = photoInput(selection.selectionId, placeId);
        const photos = [...getCuratedPlacePhotos(placeId), ...await fetchKtoPlacePhotos(place.place_name, place.city)];
        const cover = selectSceneCover(input, photos);
        if (cover.kind === "PHOTO") {
          res.json(GetSceneCoverResponse.parse({ success: true, code: "SUCCESS", message: "장면 커버를 불러왔습니다.", data: cover }));
          return;
        }
      } catch {
        providerFailed = true;
      }
    }
    res.json(GetSceneCoverResponse.parse({
      success: true,
      code: "SUCCESS",
      message: "편집형 장면 커버를 불러왔습니다.",
      data: {
        selectionId: selection.selectionId,
        kind: "EDITORIAL",
        token: `editorial:${selection.sceneCoverToken}`,
        fallbackReason: providerFailed ? "PROVIDER_ERROR" : "NO_PHOTO",
      },
    }));
  } catch (error) { next(error); }
});

router.get("/place-photos", async (req, res, next) => {
  const parsed = getPlacePhotosSchema.safeParse(req.query);
  if (!parsed.success) return next(new ApiError(400, "INVALID_REQUEST", "사진 요청값이 올바르지 않습니다."));
  try {
    const photos = await selectPhotos(parsed.data.selectionId, parsed.data.placeId);
    res.json(GetPlacePhotosResponse.parse({
      success: true,
      code: "SUCCESS",
      message: photos.galleryStatus === "AVAILABLE" ? "장소 사진을 불러왔습니다." : "확보된 장소 사진이 없습니다.",
      data: { selectionId: parsed.data.selectionId, placeId: parsed.data.placeId, ...photos },
    }));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    next(new ApiError(502, "PHOTO_PROVIDER_FAILED", "사진을 불러오지 못했습니다."));
  }
});

router.post("/public/recommendations", limit, async (req, res, next) => {
  const parsed = createPublicRecommendationSchema.safeParse(req.body);
  if (!parsed.success) return next(new ApiError(400, "INVALID_REQUEST", "추천 요청값이 올바르지 않습니다."));
  const selection = getDiscoverySelection(parsed.data.selectionId);
  if (!selection) return next(new ApiError(400, "SELECTION_NOT_FOUND", "장면을 찾을 수 없습니다."));
  try {
    const mode = parsed.data.mode ?? "SCENE";
    const normalizedConditions = mode === "TODAY"
      ? await todayConditions(selection, parsed.data.transportType)
      : undefined;
    const session = buildDiscoverySession({
      selection,
      places,
      request: {
        selectionId: selection.selectionId,
        mode,
        ...(parsed.data.transportType ? { transportType: parsed.data.transportType } : {}),
        ...(normalizedConditions ? { normalizedConditions } : {}),
      },
      snapshotAt: new Date().toISOString(),
    });
    remember(session);
    res.json(CreatePublicRecommendationResponse.parse({
      success: true,
      code: "SUCCESS",
      message: "추천 세 곳을 불러왔습니다.",
      requestId: getRequestId(req),
      data: await publicData(session),
    }));
  } catch (error) {
    next(error instanceof Error && error.message === "SELECTION_UNAVAILABLE"
      ? new ApiError(422, "SELECTION_UNAVAILABLE", "추천 가능한 세 곳이 없습니다.")
      : error);
  }
});

router.post("/public/recommendations/replace", limit, async (req, res, next) => {
  const parsed = replacePublicRecommendationCardSchema.safeParse(req.body);
  if (!parsed.success) return next(new ApiError(400, "INVALID_REQUEST", "교체 요청값이 올바르지 않습니다."));
  const snapshotAt = parsed.data.snapshotAt.toISOString();
  const stored = sessions.get(sessionKey(parsed.data.selectionId, snapshotAt));
  const selection = getDiscoverySelection(parsed.data.selectionId);
  if (!stored || !selection) return next(new ApiError(409, "REVISION_CONFLICT", "추천 상태가 만료됐습니다. 새로 시작해 주세요."));
  const result = replaceDiscoveryCard({
    selection,
    places,
    session: stored.session,
    request: {
      ...parsed.data,
      snapshotAt,
      targetSlot: parsed.data.targetSlot as 1 | 2 | 3,
    },
  });
  if (!result.ok) {
    const status = result.code === "REVISION_CONFLICT" || result.code === "STALE_REQUEST" ? 409 : 422;
    return next(new ApiError(status, result.code, "현재 세 곳을 유지했습니다."));
  }
  remember(result.session);
  res.json(ReplacePublicRecommendationCardResponse.parse({
    success: true,
    code: "SUCCESS",
    message: "한 곳을 교체했습니다.",
    requestId: getRequestId(req),
    data: await publicData(result.session),
  }));
});

export default router;
