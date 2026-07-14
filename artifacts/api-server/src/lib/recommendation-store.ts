import { createHash } from "node:crypto";
import {
  bookmarksTable,
  db,
  recommendedCoursesTable,
  recommendationFeedbackTable,
  recommendationRequestsTable,
  recommendationSessionPlacesTable,
  recommendationSessionWarningsTable,
  recommendationSessionsTable,
} from "@workspace/db";
import {
  getPlaceById,
  type GoatRecommendationCard,
  type RecommendationDecisionAudit,
  type RecommendationWarning,
} from "@workspace/travel-domain";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  getVisitConcentration,
  type VisitConcentration,
} from "./kto-visit-concentration";
import { logger } from "./logger";
import {
  parsePersistedRecommendationScore,
  parseRecommendationDecisionAudit,
  safeParsePersistedRecommendationScore,
  toPublicScoreDetails,
  toPublicScoreSummary,
} from "./recommendation-audit";

export type RecommendationConditions = Record<string, unknown>;

export type RecommendationData = {
  recommendationId: string;
  conditions: RecommendationConditions;
  cards: Array<{
    placeId: string;
    name: string;
    region: string;
    imageUrl: string | null;
    rank: number;
    role: string;
    score: number;
    scoreSummary: {
      moodScore: number;
      conditionScore: number;
      baseScore: number;
      displayScore: number;
    } | null;
    scoreDetails: ReturnType<typeof toPublicScoreDetails> | null;
    reason: string;
    reasons: string[];
    cautions: string[];
    bestSeasons: string[];
    seasonBadge: { label: string; isCurrentSeason: boolean } | null;
    crowd: VisitConcentration;
    bookmarked: boolean;
    feedback: "LIKE" | "DISLIKE" | null;
  }>;
  course: Record<string, unknown> | null;
  createdAt: string;
};

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
}

export function hashRecommendationRequest(
  conditions: RecommendationConditions,
): string {
  return createHash("sha256")
    .update(JSON.stringify(stableValue(conditions)))
    .digest("hex");
}

export async function reserveRecommendationRequest(input: {
  userId: string;
  idempotencyKey: string;
  requestHash: string;
}) {
  const [created] = await db
    .insert(recommendationRequestsTable)
    .values({
      userId: input.userId,
      idempotencyKey: input.idempotencyKey,
      requestHash: input.requestHash,
      status: "PROCESSING",
    })
    .onConflictDoNothing({
      target: [
        recommendationRequestsTable.userId,
        recommendationRequestsTable.idempotencyKey,
      ],
    })
    .returning();

  if (created) return { kind: "RESERVED" as const, request: created };

  const [existing] = await db
    .select()
    .from(recommendationRequestsTable)
    .where(
      and(
        eq(recommendationRequestsTable.userId, input.userId),
        eq(recommendationRequestsTable.idempotencyKey, input.idempotencyKey),
      ),
    )
    .limit(1);

  if (!existing) throw new Error("IDEMPOTENCY_RESERVATION_NOT_FOUND");
  if (existing.requestHash !== input.requestHash) {
    return { kind: "HASH_MISMATCH" as const, request: existing };
  }
  if (existing.status === "COMPLETED" && existing.recommendationId) {
    return { kind: "COMPLETED" as const, request: existing };
  }
  if (existing.status === "PROCESSING") {
    return { kind: "PROCESSING" as const, request: existing };
  }

  const [retried] = await db
    .update(recommendationRequestsTable)
    .set({ status: "PROCESSING", errorCode: null, updatedAt: new Date() })
    .where(
      and(
        eq(recommendationRequestsTable.id, existing.id),
        eq(recommendationRequestsTable.status, "FAILED"),
      ),
    )
    .returning();
  if (!retried) return { kind: "PROCESSING" as const, request: existing };
  return { kind: "RESERVED" as const, request: retried };
}

export async function failRecommendationRequest(
  requestId: string,
  errorCode: string,
) {
  await db
    .update(recommendationRequestsTable)
    .set({ status: "FAILED", errorCode, updatedAt: new Date() })
    .where(eq(recommendationRequestsTable.id, requestId));
}

export async function completeRecommendationRequest(input: {
  requestRecordId: string;
  userId: string;
  conditions: RecommendationConditions;
  cards: GoatRecommendationCard[];
  policyVersion: "goat-score-v1";
  decisionAudit: RecommendationDecisionAudit;
  warnings: RecommendationWarning[];
}): Promise<string> {
  const decisionAudit = parseRecommendationDecisionAudit(input.decisionAudit);
  const cards = input.cards.map((card) => ({
    card,
    score: parsePersistedRecommendationScore(card.score),
  }));

  return db.transaction(async (tx) => {
    const [session] = await tx
      .insert(recommendationSessionsTable)
      .values({
        userId: input.userId,
        conditions: input.conditions,
        policyVersion: input.policyVersion,
        fallbackUsed: decisionAudit.fallback.card3PurposeFallbackUsed,
        fallbackReason: decisionAudit.fallback.reason ?? null,
        decisionAudit,
      })
      .returning({ id: recommendationSessionsTable.id });
    if (!session) throw new Error("RECOMMENDATION_SESSION_INSERT_FAILED");

    await tx.insert(recommendationSessionPlacesTable).values(
      cards.map(({ card, score }) => ({
        recommendationId: session.id,
        placeId: card.placeId,
        placeNameAtRecommendation: card.placeName,
        regionAtRecommendation: card.city || card.regionGroup || null,
        rank: card.rank,
        role: card.role,
        score: score.displayScore,
        scoreDetails: score,
        reasons: card.reasons,
        moodScore: score.moodScore.total,
        conditionScore: score.conditionScore.total,
        baseScore: score.baseScore,
        routeDistanceBonus: score.routeDistanceBonus,
        duplicatePenalty: score.duplicatePenalty,
        exposurePenalty: score.exposurePenalty,
        coverageBoost: score.coverageBoost,
        lowExposureBoost: score.lowExposureBoost,
        selectionScore: score.selectionScore,
        displayScore: score.displayScore,
        cautions: card.cautions,
      })),
    );

    if (input.warnings.length > 0) {
      await tx.insert(recommendationSessionWarningsTable).values(
        input.warnings.map((warning) => ({
          recommendationId: session.id,
          warningCode: warning.code,
          warningMessage: warning.message,
          warningDetails: warning.details ?? null,
        })),
      );
    }

    await tx
      .update(recommendationRequestsTable)
      .set({
        status: "COMPLETED",
        recommendationId: session.id,
        errorCode: null,
        updatedAt: new Date(),
      })
      .where(eq(recommendationRequestsTable.id, input.requestRecordId));

    return session.id;
  });
}

function splitSeasons(value: string | undefined): string[] {
  return value
    ? value
        .split(/[,/]/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

export async function getRecommendationData(
  userId: string,
  recommendationId: string,
): Promise<RecommendationData | null> {
  const [session] = await db
    .select()
    .from(recommendationSessionsTable)
    .where(
      and(
        eq(recommendationSessionsTable.id, recommendationId),
        eq(recommendationSessionsTable.userId, userId),
      ),
    )
    .limit(1);
  if (!session) return null;

  const places = await db
    .select()
    .from(recommendationSessionPlacesTable)
    .where(
      eq(recommendationSessionPlacesTable.recommendationId, recommendationId),
    )
    .orderBy(asc(recommendationSessionPlacesTable.rank));
  const placeIds = places.map(({ placeId }) => placeId);

  const [bookmarks, feedbackRows, courseRows] = await Promise.all([
    placeIds.length
      ? db
          .select({ placeId: bookmarksTable.placeId })
          .from(bookmarksTable)
          .where(
            and(
              eq(bookmarksTable.userId, userId),
              inArray(bookmarksTable.placeId, placeIds),
            ),
          )
      : Promise.resolve([]),
    db
      .select()
      .from(recommendationFeedbackTable)
      .where(
        and(
          eq(recommendationFeedbackTable.userId, userId),
          eq(recommendationFeedbackTable.recommendationId, recommendationId),
        ),
      ),
    db
      .select()
      .from(recommendedCoursesTable)
      .where(eq(recommendedCoursesTable.recommendationId, recommendationId))
      .limit(1),
  ]);

  const bookmarkedIds = new Set(bookmarks.map(({ placeId }) => placeId));
  const feedbackByPlace = new Map(
    feedbackRows.map((row) => [
      row.placeId,
      row.feedbackType as "LIKE" | "DISLIKE",
    ]),
  );

  const currentPlaces = places.map((saved) => getPlaceById(saved.placeId));
  const crowds = await Promise.all(
    places.map((saved, index) =>
      getVisitConcentration(
        currentPlaces[index]?.place_name ?? saved.placeNameAtRecommendation,
        currentPlaces[index]?.city ?? saved.regionAtRecommendation ?? "",
      ),
    ),
  );

  return {
    recommendationId: session.id,
    conditions: session.conditions,
    cards: places.map((saved, index) => {
      const current = currentPlaces[index];
      const bestSeasons = splitSeasons(current?.best_season);
      const persistedScore = safeParsePersistedRecommendationScore(
        saved.scoreDetails,
      );
      if (!persistedScore) {
        logger.warn(
          {
            event: "INVALID_RECOMMENDATION_SCORE_SNAPSHOT",
            recommendationId: session.id,
            recommendationSessionPlaceId: saved.id,
          },
          "Persisted recommendation score snapshot failed validation.",
        );
      }
      return {
        placeId: saved.placeId,
        name: current?.place_name ?? saved.placeNameAtRecommendation,
        region: current?.city ?? saved.regionAtRecommendation ?? "",
        imageUrl: current?.imageUrl ?? null,
        rank: saved.rank,
        role: saved.role,
        score: saved.score,
        scoreSummary: persistedScore
          ? toPublicScoreSummary(persistedScore)
          : null,
        scoreDetails: persistedScore
          ? toPublicScoreDetails(persistedScore)
          : null,
        reason: saved.reasons.join(" "),
        reasons: saved.reasons,
        cautions: saved.cautions,
        bestSeasons,
        seasonBadge: bestSeasons.length
          ? { label: bestSeasons.join(" · "), isCurrentSeason: false }
          : null,
        crowd: crowds[index]!,
        bookmarked: bookmarkedIds.has(saved.placeId),
        feedback: feedbackByPlace.get(saved.placeId) ?? null,
      };
    }),
    course:
      (courseRows[0]?.course as Record<string, unknown> | undefined) ?? null,
    createdAt: session.createdAt.toISOString(),
  };
}

export async function getRecentRecommendations(userId: string, limit: number) {
  const sessions = await db
    .select({ id: recommendationSessionsTable.id })
    .from(recommendationSessionsTable)
    .where(eq(recommendationSessionsTable.userId, userId))
    .orderBy(desc(recommendationSessionsTable.createdAt))
    .limit(limit);
  const items = await Promise.all(
    sessions.map(({ id }) => getRecommendationData(userId, id)),
  );
  return items.filter((item): item is RecommendationData => item !== null);
}

export async function deleteRecommendation(
  userId: string,
  recommendationId: string,
) {
  const deleted = await db
    .delete(recommendationSessionsTable)
    .where(
      and(
        eq(recommendationSessionsTable.id, recommendationId),
        eq(recommendationSessionsTable.userId, userId),
      ),
    )
    .returning({ id: recommendationSessionsTable.id });
  return deleted.length > 0;
}

export async function getDislikedPlaceIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ placeId: recommendationFeedbackTable.placeId })
    .from(recommendationFeedbackTable)
    .where(
      and(
        eq(recommendationFeedbackTable.userId, userId),
        eq(recommendationFeedbackTable.feedbackType, "DISLIKE"),
      ),
    );
  return Array.from(new Set(rows.map(({ placeId }) => placeId)));
}

export async function recommendationContainsPlace(
  userId: string,
  recommendationId: string,
  placeId: string,
): Promise<boolean> {
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
  return Boolean(row);
}

export async function saveRecommendedCourse(input: {
  recommendationId: string;
  selectedPlaceId: string;
  title: string;
  summary?: string;
  mode: string;
  course: Record<string, unknown>;
}) {
  await db
    .insert(recommendedCoursesTable)
    .values({
      recommendationId: input.recommendationId,
      selectedPlaceId: input.selectedPlaceId,
      title: input.title,
      summary: input.summary ?? null,
      mode: input.mode,
      course: input.course,
    })
    .onConflictDoUpdate({
      target: recommendedCoursesTable.recommendationId,
      set: {
        selectedPlaceId: input.selectedPlaceId,
        title: input.title,
        summary: input.summary ?? null,
        mode: input.mode,
        course: input.course,
        updatedAt: new Date(),
      },
    });
}
