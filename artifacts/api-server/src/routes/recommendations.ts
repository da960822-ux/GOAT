import { Router, type IRouter } from "express";
import {
  getRecommendations,
  moodCategories,
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
  getRecentRecommendations,
  getRecommendationData,
  hashRecommendationRequest,
  reserveRecommendationRequest,
} from "../lib/recommendation-store";

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
        type: z.enum(["current", "region", "skip"]),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        regionName: z.string().min(1).optional(),
      })
      .strict()
      .optional(),
    excludeIds: z.array(z.string().min(1)).max(58).optional(),
  })
  .strict()
  .refine((body) => body.moodId || body.referenceCardId, {
    message: "moodId or referenceCardId is required.",
    path: ["moodId"],
  });

const recentQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(1),
});

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

    const dislikedPlaceIds = await getDislikedPlaceIds(user.id);
    const excludeIds = Array.from(
      new Set([...(parsed.data.excludeIds ?? []), ...dislikedPlaceIds]),
    );
    const mood = parsed.data.moodId
      ? moodCategories.find(({ id }) => id === parsed.data.moodId)
      : undefined;
    if (parsed.data.moodId && !mood) {
      throw new ApiError(400, "INVALID_MOOD_ID", "Unknown mood ID.");
    }

    const result = getRecommendations(
      mood?.id,
      parsed.data.preferences as TravelPreferences | undefined,
      excludeIds,
      {
        referenceCardId: parsed.data.referenceCardId,
        travelPurpose: parsed.data.travelPurpose,
        transportType: parsed.data.transportType,
        visitTime: parsed.data.visitTime,
        currentMonth: parsed.data.currentMonth,
        excludeIds,
        debug: parsed.data.debug,
      },
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

    const recommendationId = await completeRecommendationRequest({
      requestRecordId: reservation.request.id,
      userId: user.id,
      conditions: parsed.data,
      cards: result.cards,
      policyVersion: result.policyVersion,
      decisionAudit: result.decisionAudit,
      warnings: result.warningDetails ?? [],
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
