import { Router, type IRouter } from "express";
import {
  db,
  recommendationFeedbackTable,
  recommendationSessionPlacesTable,
  recommendationSessionsTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError, getRequestId } from "../lib/api-response";
import { requireAuthenticatedUser } from "../lib/auth-context";

const router: IRouter = Router();
const paramsSchema = z.object({
  recommendationId: z.string().uuid(),
  placeId: z.string().regex(/^GOAT-\d{3}$/),
});
const feedbackSchema = z
  .object({
    type: z.enum(["LIKE", "DISLIKE"]),
    reasonCode: z
      .enum([
        "TOO_FAR",
        "NOT_MY_MOOD",
        "TRANSPORT_DIFFICULT",
        "ALREADY_VISITED",
        "TOO_CROWDED",
        "OTHER",
      ])
      .nullable()
      .optional(),
    reasonText: z.string().trim().min(1).max(500).nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.reasonCode === "OTHER" && !value.reasonText) {
      ctx.addIssue({
        code: "custom",
        path: ["reasonText"],
        message: "reasonText is required for OTHER.",
      });
    }
    if (value.type === "LIKE" && (value.reasonCode || value.reasonText)) {
      ctx.addIssue({
        code: "custom",
        path: ["reasonCode"],
        message: "LIKE cannot include a dislike reason.",
      });
    }
  });

async function assertOwnedRecommendationPlace(
  userId: string,
  recommendationId: string,
  placeId: string,
) {
  const [row] = await db
    .select({ placeId: recommendationSessionPlacesTable.placeId })
    .from(recommendationSessionsTable)
    .innerJoin(
      recommendationSessionPlacesTable,
      eq(
        recommendationSessionPlacesTable.recommendationId,
        recommendationSessionsTable.id,
      ),
    )
    .where(
      and(
        eq(recommendationSessionsTable.id, recommendationId),
        eq(recommendationSessionsTable.userId, userId),
        eq(recommendationSessionPlacesTable.placeId, placeId),
      ),
    )
    .limit(1);
  if (!row)
    throw new ApiError(
      404,
      "RECOMMENDATION_NOT_FOUND",
      "Recommendation place not found.",
    );
}

router.get(
  "/recommendations/:recommendationId/places/:placeId/feedback",
  async (req, res, next) => {
    try {
      const user = await requireAuthenticatedUser(req);
      const parsed = paramsSchema.safeParse(req.params);
      if (!parsed.success)
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid feedback target.");
      await assertOwnedRecommendationPlace(
        user.id,
        parsed.data.recommendationId,
        parsed.data.placeId,
      );
      const [row] = await db
        .select()
        .from(recommendationFeedbackTable)
        .where(
          and(
            eq(recommendationFeedbackTable.userId, user.id),
            eq(
              recommendationFeedbackTable.recommendationId,
              parsed.data.recommendationId,
            ),
            eq(recommendationFeedbackTable.placeId, parsed.data.placeId),
          ),
        )
        .limit(1);
      res.json({
        success: true,
        code: "SUCCESS",
        message: "Feedback loaded.",
        data: {
          recommendationId: parsed.data.recommendationId,
          placeId: parsed.data.placeId,
          feedback: row
            ? {
                type: row.feedbackType,
                reasonCode: row.reasonCode,
                reasonText: row.reasonText,
                updatedAt: row.updatedAt.toISOString(),
              }
            : null,
        },
        requestId: getRequestId(req),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/recommendations/:recommendationId/places/:placeId/feedback",
  async (req, res, next) => {
    try {
      const user = await requireAuthenticatedUser(req);
      const params = paramsSchema.safeParse(req.params);
      const body = feedbackSchema.safeParse(req.body);
      if (!params.success || !body.success) {
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          "Invalid feedback request.",
          {
            params: params.success ? null : params.error.flatten(),
            body: body.success ? null : body.error.flatten(),
          },
        );
      }
      await assertOwnedRecommendationPlace(
        user.id,
        params.data.recommendationId,
        params.data.placeId,
      );
      const [row] = await db
        .insert(recommendationFeedbackTable)
        .values({
          userId: user.id,
          recommendationId: params.data.recommendationId,
          placeId: params.data.placeId,
          feedbackType: body.data.type,
          reasonCode: body.data.reasonCode ?? null,
          reasonText:
            body.data.reasonCode === "OTHER"
              ? (body.data.reasonText ?? null)
              : null,
        })
        .onConflictDoUpdate({
          target: [
            recommendationFeedbackTable.userId,
            recommendationFeedbackTable.recommendationId,
            recommendationFeedbackTable.placeId,
          ],
          set: {
            feedbackType: body.data.type,
            reasonCode: body.data.reasonCode ?? null,
            reasonText:
              body.data.reasonCode === "OTHER"
                ? (body.data.reasonText ?? null)
                : null,
            updatedAt: new Date(),
          },
        })
        .returning();
      res.json({
        success: true,
        code: "FEEDBACK_SAVED",
        message: "Feedback saved.",
        data: {
          recommendationId: params.data.recommendationId,
          placeId: params.data.placeId,
          feedback: row
            ? {
                type: row.feedbackType,
                reasonCode: row.reasonCode,
                reasonText: row.reasonText,
              }
            : null,
        },
        requestId: getRequestId(req),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/recommendations/:recommendationId/places/:placeId/feedback",
  async (req, res, next) => {
    try {
      const user = await requireAuthenticatedUser(req);
      const parsed = paramsSchema.safeParse(req.params);
      if (!parsed.success)
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid feedback target.");
      await assertOwnedRecommendationPlace(
        user.id,
        parsed.data.recommendationId,
        parsed.data.placeId,
      );
      await db
        .delete(recommendationFeedbackTable)
        .where(
          and(
            eq(recommendationFeedbackTable.userId, user.id),
            eq(
              recommendationFeedbackTable.recommendationId,
              parsed.data.recommendationId,
            ),
            eq(recommendationFeedbackTable.placeId, parsed.data.placeId),
          ),
        );
      res.json({
        success: true,
        code: "FEEDBACK_CLEARED",
        message: "Feedback cleared.",
        data: {
          recommendationId: parsed.data.recommendationId,
          placeId: parsed.data.placeId,
          feedback: null,
        },
        requestId: getRequestId(req),
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
