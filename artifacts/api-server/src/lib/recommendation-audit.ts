import type {
  GoatScoreBreakdown,
  RecommendationDecisionAudit,
} from "@workspace/travel-domain";
import { z } from "zod";

const matchDetailSchema = z
  .object({
    requested: z.array(z.string()),
    matched: z.array(z.string()),
    count: z.number().int().min(0),
    score: z.number().min(0),
  })
  .strict();

const scoreSummaryV1Schema = z
  .object({
    moodScore: z.number().int().min(0).max(45),
    conditionScore: z.number().int().min(0).max(45),
    baseScore: z.number().int().min(0).max(90),
    routeDistanceBonus: z.number().int().min(0).max(10),
    duplicatePenalty: z.number().int().min(0).max(6),
    exposurePenalty: z.number().int().min(0).max(5),
    coverageBoost: z.number().int().min(0).max(3),
    lowExposureBoost: z.number().int().min(0).max(3),
    selectionScore: z.number().int().min(-11).max(106),
    displayScore: z.number().int().min(0).max(100),
  })
  .strict();

const scoreSummaryV2Schema = scoreSummaryV1Schema
  .extend({
    originDistanceBonus: z.number().int().min(0).max(10),
    selectionScore: z.number().int().min(-11).max(116),
  })
  .strict();

const moodScoreSchema = z
  .object({
    total: z.number().int().min(0).max(45),
    theme: z
      .object({
        requested: z.string().optional(),
        placeTheme: z.string(),
        matched: z.boolean(),
        score: z.number().min(0).max(18),
      })
      .strict(),
    moodTags: matchDetailSchema,
    sceneTags: matchDetailSchema,
    placeTypeHint: z
      .object({
        matchedHints: z.array(z.string()),
        score: z.number().min(0).max(3),
        note: z.string(),
      })
      .strict(),
  })
  .strict();

const conditionScoreSchema = z
  .object({
    total: z.number().int().min(0).max(45),
    purpose: z
      .object({
        requested: z.string().optional(),
        placePurposeTags: z.array(z.string()),
        matched: z.boolean(),
        score: z.number().min(0).max(20),
      })
      .strict(),
    accessibility: z
      .object({
        transportType: z.string().optional(),
        grade: z.string().optional(),
        score: z.number().min(0).max(12),
        inferred: z.boolean().optional(),
        note: z.string().optional(),
      })
      .strict(),
    season: z
      .object({
        requested: z.string().optional(),
        placeSeasonTags: z.array(z.string()),
        matched: z.boolean().optional(),
        matchType: z.enum(["current", "all_season", "none", "not_requested"]),
        score: z.number().min(0).max(13),
      })
      .strict(),
  })
  .strict();

const persistedRecommendationScoreV1Schema = z
  .object({
    moodScore: moodScoreSchema,
    conditionScore: conditionScoreSchema,
    baseScore: scoreSummaryV1Schema.shape.baseScore,
    routeDistanceBonus: scoreSummaryV1Schema.shape.routeDistanceBonus,
    duplicatePenalty: scoreSummaryV1Schema.shape.duplicatePenalty,
    exposurePenalty: scoreSummaryV1Schema.shape.exposurePenalty,
    coverageBoost: scoreSummaryV1Schema.shape.coverageBoost,
    lowExposureBoost: scoreSummaryV1Schema.shape.lowExposureBoost,
    selectionScore: scoreSummaryV1Schema.shape.selectionScore,
    displayScore: scoreSummaryV1Schema.shape.displayScore,
  })
  .strict();

const persistedRecommendationScoreV2Schema = persistedRecommendationScoreV1Schema
  .extend({
    originDistanceKm: z.number().min(0).optional(),
    originDistanceSource: z.enum(["HAVERSINE", "NONE"]).optional(),
    originDistanceBonus: scoreSummaryV2Schema.shape.originDistanceBonus,
    routeDistanceKm: z.number().min(0).optional(),
    routeDurationMin: z.number().min(0).optional(),
    routeDistanceSource: z.enum(["KAKAO_ROUTE", "HAVERSINE", "NONE"]),
    selectionScore: scoreSummaryV2Schema.shape.selectionScore,
  })
  .strict();

export const persistedRecommendationScoreSchema = z.union([
  persistedRecommendationScoreV2Schema,
  persistedRecommendationScoreV1Schema,
]);

const scoreCalculationDetailSchema = z
  .object({
    theme: moodScoreSchema.shape.theme,
    moodTags: matchDetailSchema,
    sceneTags: matchDetailSchema,
    purpose: conditionScoreSchema.shape.purpose,
    accessibility: conditionScoreSchema.shape.accessibility,
    season: conditionScoreSchema.shape.season,
  })
  .strict();

const fallbackSchema = z
  .object({
    card3PurposeFallbackUsed: z.boolean(),
    reason: z.string().optional(),
    travelPurpose: z.string().optional(),
    strictPurposePoolSize: z.number().int().min(0).optional(),
    fallbackPoolSize: z.number().int().min(0).optional(),
  })
  .strict();

const candidatePoolSchema = z
  .object({
    name: z.string(),
    size: z.number().int().min(0),
    totalCandidatePoolSize: z.number().int().min(0),
    strictPurposePoolSize: z.number().int().min(0).optional(),
    fallbackUsed: z.boolean().optional(),
    fallbackReason: z.string().optional(),
  })
  .strict();

function cardSelectionSchema(scoreSummary: typeof scoreSummaryV1Schema | typeof scoreSummaryV2Schema) {
  return z
    .object({
      rank: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      role: z.enum(["BEST_SCENE", "SAME_MOOD_ALTERNATIVE", "CONDITION_FIT_ALTERNATIVE"]),
      roleLabel: z.string(),
      placeId: z.string(),
      placeName: z.string(),
      whySelected: z.string(),
      candidatePool: candidatePoolSchema,
      scoreSummary,
      scoreDetails: scoreCalculationDetailSchema,
      reasons: z.array(z.string()),
      cautions: z.array(z.string()),
    })
    .strict();
}

const recommendationDecisionAuditV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    policyVersion: z.literal("goat-score-v1"),
    candidateCount: z.number().int().min(0),
    fallback: fallbackSchema,
    cardSelections: z.array(cardSelectionSchema(scoreSummaryV1Schema)).length(3),
  })
  .strict();

const recommendationDecisionAuditV2Schema = z
  .object({
    schemaVersion: z.literal(2),
    policyVersion: z.literal("goat-score-v2"),
    candidateCount: z.number().int().min(0),
    operatingDate: z
      .object({
        requestedDate: z.string().optional(),
        excludedPlaces: z.array(
          z.object({
            placeId: z.string(),
            placeName: z.string(),
            reason: z.enum(["DATE_REQUIRED", "OUTSIDE_OPEN_RANGE", "UNVERIFIED_CONDITION"]),
          }).strict(),
        ),
      })
      .strict(),
    fallback: fallbackSchema,
    cardSelections: z.array(cardSelectionSchema(scoreSummaryV2Schema)).length(3),
  })
  .strict();

export const recommendationDecisionAuditSchema = z.discriminatedUnion("schemaVersion", [
  recommendationDecisionAuditV1Schema,
  recommendationDecisionAuditV2Schema,
]);

function normalizePersistedScore(value: z.infer<typeof persistedRecommendationScoreSchema>): GoatScoreBreakdown {
  if ("originDistanceBonus" in value) return value;
  return {
    ...value,
    originDistanceBonus: 0,
    originDistanceSource: "NONE",
    routeDistanceSource: "NONE",
  };
}

export function safeParsePersistedRecommendationScore(value: unknown): GoatScoreBreakdown | null {
  const parsed = persistedRecommendationScoreSchema.safeParse(value);
  return parsed.success ? normalizePersistedScore(parsed.data) : null;
}

export function parsePersistedRecommendationScore(value: unknown): GoatScoreBreakdown {
  return normalizePersistedScore(persistedRecommendationScoreSchema.parse(value));
}

export function parseRecommendationDecisionAudit(value: unknown): RecommendationDecisionAudit {
  return recommendationDecisionAuditSchema.parse(value) as RecommendationDecisionAudit;
}

export function toPublicScoreSummary(score: GoatScoreBreakdown) {
  return {
    moodScore: score.moodScore.total,
    conditionScore: score.conditionScore.total,
    baseScore: score.baseScore,
    originDistanceBonus: score.originDistanceBonus,
    routeDistanceBonus: score.routeDistanceBonus,
    duplicatePenalty: score.duplicatePenalty,
    exposurePenalty: score.exposurePenalty,
    coverageBoost: score.coverageBoost,
    lowExposureBoost: score.lowExposureBoost,
    selectionScore: score.selectionScore,
    displayScore: score.displayScore,
  };
}

export function toPublicScoreDetails(score: GoatScoreBreakdown) {
  return {
    theme: score.moodScore.theme,
    moodTags: score.moodScore.moodTags,
    sceneTags: score.moodScore.sceneTags,
    purpose: score.conditionScore.purpose,
    accessibility: score.conditionScore.accessibility,
    season: score.conditionScore.season,
    origin: {
      distanceKm: score.originDistanceKm ?? null,
      source: score.originDistanceSource ?? "NONE",
      bonus: score.originDistanceBonus,
    },
    route: {
      distanceKm: score.routeDistanceKm ?? null,
      durationMin: score.routeDurationMin ?? null,
      source: score.routeDistanceSource,
      bonus: score.routeDistanceBonus,
    },
  };
}
