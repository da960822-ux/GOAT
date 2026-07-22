import { Router, type IRouter } from "express";
import {
  moodCategories,
  type TravelOrigin,
  type TravelPreferences,
} from "@workspace/travel-domain";
import { z } from "zod";
import { ApiError, getRequestId } from "../lib/api-response";
import { requireAuthenticatedUser } from "../lib/auth-context";
import {
  completeRecommendationRequest,
  deleteRecommendation,
  failRecommendationRequest,
  getDislikedPlaceIds,
  getOwnedRecommendationPlaceIds,
  getRecentRecommendations,
  getRecommendationData,
  hashRecommendationRequest,
  reserveRecommendationRequest,
  type StoredRouteInfo,
} from "../lib/recommendation-store";
import { dbRecommendationExposureRepository } from "../lib/db-recommendation-exposure";
import { createRecommendationPreview } from "../services/recommendation-orchestrator";

const router: IRouter = Router();

const recommendationRequestSchema = z
  .object({
    moodId: z.string().min(1).optional(),
    referenceCardId: z.string().min(1).optional(),
    travelPurpose: z.string().min(1).optional(),
    transportType: z.string().min(1).optional(),
    visitTime: z.string().min(1).optional(),
    currentMonth: z.number().int().min(1).max(12).optional(),
    debug: z.boolean().optional(),
    preferences: z
      .object({
        companion: z.string().min(1),
        transport: z.string().min(1),
        visitTime: z.string().min(1).nullable().optional(),
        purpose: z.string().min(1),
      })
      .strict()
      .optional(),
    origin: z
      .object({
        type: z.enum(["current", "region", "address", "skip"]),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        regionName: z.string().min(1).max(200).optional(),
      })
      .strict()
      .optional(),
    rerollOfRecommendationId: z.string().uuid().optional(),
    excludeIds: z.array(z.string().min(1)).max(61).refine(
      (ids) => new Set(ids).size === ids.length,
      "excludeIds must not contain duplicates.",
    ).optional(),
  })
  .strict()
  .refine((body) => body.moodId || body.referenceCardId, {
    message: "moodId or referenceCardId is required.",
    path: ["moodId"],
  });

const recentQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(1),
});

const isDebugEnabled = process.env.ALLOW_RECOMMENDATION_DEBUG === "true";

router.post("/recommendations", async (req, res, next) => {
  let requestRecordId: string | undefined;
  try {
    const user = await requireAuthenticatedUser(req);
    const idempotencyKey = req.get("Idempotency-Key")?.trim();
    if (
      !idempotencyKey ||
      !z.string().uuid().safeParse(idempotencyKey).success
    ) {
      throw new ApiError(
        400,
        "INVALID_IDEMPOTENCY_KEY",
        "A valid Idempotency-Key UUID header is required.",
      );
    }

    const parsed = recommendationRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Invalid recommendation request.",
        parsed.error.flatten(),
      );
    }
    if (parsed.data.debug && !isDebugEnabled) {
      throw new ApiError(403, "DEBUG_NOT_ALLOWED", "Debug responses are disabled.");
    }

    const requestHash = hashRecommendationRequest(parsed.data);
    const reservation = await reserveRecommendationRequest({
      userId: user.id,
      idempotencyKey,
      requestHash,
    });
    requestRecordId = reservation.request.id;

    if (reservation.kind === "HASH_MISMATCH") {
      throw new ApiError(
        409,
        "IDEMPOTENCY_KEY_REUSED",
        "The Idempotency-Key was already used for a different request.",
      );
    }
    if (reservation.kind === "PROCESSING") {
      res.setHeader("Retry-After", "1");
      throw new ApiError(
        409,
        "REQUEST_IN_PROGRESS",
        "The same recommendation request is still processing.",
        {
          retryable: true,
        },
      );
    }
    if (reservation.kind === "COMPLETED") {
      const existing = await getRecommendationData(
        user.id,
        reservation.request.recommendationId!,
      );
      if (!existing) throw new Error("COMPLETED_RECOMMENDATION_NOT_FOUND");
      res.setHeader("Idempotency-Replayed", "true");
      res.json({
        success: true,
        code: "RECOMMENDATION_REPLAYED",
        message: "Existing recommendation returned.",
        data: existing,
        requestId: getRequestId(req),
      });
      return;
    }

    const rerollPlaceIds = parsed.data.rerollOfRecommendationId
      ? await getOwnedRecommendationPlaceIds(user.id, parsed.data.rerollOfRecommendationId)
      : [];
    if (parsed.data.rerollOfRecommendationId && !rerollPlaceIds) {
      throw new ApiError(
        404,
        "RECOMMENDATION_NOT_FOUND",
        "The recommendation to reroll was not found.",
      );
    }
    const dislikedPlaceIds = await getDislikedPlaceIds(user.id);
    const excludeIds = Array.from(
      new Set([
        ...(parsed.data.excludeIds ?? []),
        ...(rerollPlaceIds ?? []),
        ...dislikedPlaceIds,
      ]),
    );
    const mood = parsed.data.moodId
      ? moodCategories.find(({ id }) => id === parsed.data.moodId)
      : undefined;
    if (parsed.data.moodId && !mood) {
      throw new ApiError(400, "INVALID_MOOD_ID", "Unknown mood ID.");
    }

    const result = await createRecommendationPreview(
      {
        moodId: mood?.id,
        referenceCardId: parsed.data.referenceCardId,
        preferences: parsed.data.preferences as TravelPreferences | undefined,
        travelPurpose: parsed.data.travelPurpose,
        transportType: parsed.data.transportType,
        visitTime: parsed.data.visitTime,
        currentMonth: parsed.data.currentMonth,
        origin: parsed.data.origin as TravelOrigin | undefined,
        excludeIds,
        userId: user.id,
        debug: parsed.data.debug,
      },
      dbRecommendationExposureRepository,
    );
    if (!result?.cards || result.cards.length !== 3) {
      throw new ApiError(
        422,
        "RECOMMENDATION_FAILED",
        "Could not create three recommendation cards.",
      );
    }
    if (!result.policyVersion || !result.decisionAudit) {
      throw new Error("RECOMMENDATION_AUDIT_NOT_AVAILABLE");
    }

    const warningDetails = [...(result.warningDetails ?? [])];
    for (const warningCode of result.warnings ?? []) {
      if (!warningDetails.some(({ code }) => code === warningCode)) {
        warningDetails.push({
          code: warningCode,
          message: warningCode,
          details: { source: "recommendation-orchestrator" },
        });
      }
    }
    const recommendationId = await completeRecommendationRequest({
      requestRecordId: reservation.request.id,
      userId: user.id,
      conditions: parsed.data,
      cards: result.cards,
      policyVersion: result.policyVersion,
      decisionAudit: result.decisionAudit,
      warnings: warningDetails,
      originStatus: result.originStatus,
      originNotice: result.originNotice,
      routeInfoByPlaceId: Object.fromEntries(
        result.recommendations
          .filter(({ routeInfo }) => Boolean(routeInfo))
          .map(({ place, routeInfo }) => [
            place.place_id,
            routeInfo as StoredRouteInfo,
          ]),
      ),
    });
    requestRecordId = undefined;
    const data = await getRecommendationData(user.id, recommendationId);
    if (!data) throw new Error("SAVED_RECOMMENDATION_NOT_FOUND");

    res.status(201).json({
      success: true,
      code: "RECOMMENDATION_CREATED",
      message: "Recommendation created and saved.",
      data,
      requestId: getRequestId(req),
    });
  } catch (error) {
    if (
      requestRecordId &&
      !(
        error instanceof ApiError &&
        ["IDEMPOTENCY_KEY_REUSED", "REQUEST_IN_PROGRESS"].includes(error.code)
      )
    ) {
      await failRecommendationRequest(
        requestRecordId,
        error instanceof ApiError ? error.code : "DB_QUERY_FAILED",
      ).catch(() => undefined);
    }
    next(
      error instanceof ApiError
        ? error
        : new ApiError(
            503,
            "DB_QUERY_FAILED",
            "Recommendation persistence is temporarily unavailable.",
            {
              retryable: true,
            },
          ),
    );
  }
});

router.get("/recommendations/recent", async (req, res, next) => {
  try {
    const user = await requireAuthenticatedUser(req);
    const parsed = recentQuerySchema.safeParse(req.query);
    if (!parsed.success)
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid recent query.");
    const items = await getRecentRecommendations(user.id, parsed.data.limit);
    res.json({
      success: true,
      code: "SUCCESS",
      message: "Recent recommendations loaded.",
      data: { items, nextCursor: null },
      requestId: getRequestId(req),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/recommendations/:recommendationId", async (req, res, next) => {
  try {
    const user = await requireAuthenticatedUser(req);
    const data = await getRecommendationData(
      user.id,
      req.params.recommendationId,
    );
    if (!data)
      throw new ApiError(
        404,
        "RECOMMENDATION_NOT_FOUND",
        "Recommendation not found.",
      );
    res.json({
      success: true,
      code: "SUCCESS",
      message: "Recommendation loaded.",
      data,
      requestId: getRequestId(req),
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/recommendations/:recommendationId", async (req, res, next) => {
  try {
    const user = await requireAuthenticatedUser(req);
    const deleted = await deleteRecommendation(
      user.id,
      req.params.recommendationId,
    );
    if (!deleted)
      throw new ApiError(
        404,
        "RECOMMENDATION_NOT_FOUND",
        "Recommendation not found.",
      );
    res.json({
      success: true,
      code: "RECOMMENDATION_DELETED",
      message: "Recommendation deleted.",
      data: null,
      requestId: getRequestId(req),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
