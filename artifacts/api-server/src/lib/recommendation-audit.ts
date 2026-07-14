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

const scoreSummarySchema = z
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

export const persistedRecommendationScoreSchema = z
  .object({
    moodScore: z
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
      .strict(),
    conditionScore: z
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
            matchType: z.enum([
              "current",
              "all_season",
              "none",
              "not_requested",
            ]),
            score: z.number().min(0).max(13),
          })
          .strict(),
      })
      .strict(),
    baseScore: scoreSummarySchema.shape.baseScore,
    routeDistanceBonus: scoreSummarySchema.shape.routeDistanceBonus,
    duplicatePenalty: scoreSummarySchema.shape.duplicatePenalty,
    exposurePenalty: scoreSummarySchema.shape.exposurePenalty,
    coverageBoost: scoreSummarySchema.shape.coverageBoost,
    lowExposureBoost: scoreSummarySchema.shape.lowExposureBoost,
    selectionScore: scoreSummarySchema.shape.selectionScore,
    displayScore: scoreSummarySchema.shape.displayScore,
  })
  .strict();

const scoreCalculationDetailSchema = z
  .object({
    theme: persistedRecommendationScoreSchema.shape.moodScore.shape.theme,
    moodTags: matchDetailSchema,
    sceneTags: matchDetailSchema,
    purpose:
      persistedRecommendationScoreSchema.shape.conditionScore.shape.purpose,
    accessibility:
      persistedRecommendationScoreSchema.shape.conditionScore.shape
        .accessibility,
    season:
      persistedRecommendationScoreSchema.shape.conditionScore.shape.season,
  })
  .strict();

export const recommendationDecisionAuditSchema = z
  .object({
    schemaVersion: z.literal(1),
    policyVersion: z.literal("goat-score-v1"),
    candidateCount: z.number().int().min(0),
    fallback: z
      .object({
        card3PurposeFallbackUsed: z.boolean(),
        reason: z.string().optional(),
        travelPurpose: z.string().optional(),
        strictPurposePoolSize: z.number().int().min(0).optional(),
        fallbackPoolSize: z.number().int().min(0).optional(),
      })
      .strict(),
    cardSelections: z
      .array(
        z
          .object({
            rank: z.union([z.literal(1), z.literal(2), z.literal(3)]),
            role: z.enum([
              "BEST_SCENE",
              "SAME_MOOD_ALTERNATIVE",
              "CONDITION_FIT_ALTERNATIVE",
            ]),
            roleLabel: z.string(),
            placeId: z.string(),
            placeName: z.string(),
            whySelected: z.string(),
            candidatePool: z
              .object({
                name: z.string(),
                size: z.number().int().min(0),
                totalCandidatePoolSize: z.number().int().min(0),
                strictPurposePoolSize: z.number().int().min(0).optional(),
                fallbackUsed: z.boolean().optional(),
                fallbackReason: z.string().optional(),
              })
              .strict(),
            scoreSummary: scoreSummarySchema,
            scoreDetails: scoreCalculationDetailSchema,
            reasons: z.array(z.string()),
            cautions: z.array(z.string()),
          })
          .strict(),
      )
      .length(3),
  })
  .strict();

export function safeParsePersistedRecommendationScore(
  value: unknown,
): GoatScoreBreakdown | null {
  const parsed = persistedRecommendationScoreSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parsePersistedRecommendationScore(
  value: unknown,
): GoatScoreBreakdown {
  return persistedRecommendationScoreSchema.parse(value);
}

export function parseRecommendationDecisionAudit(
  value: unknown,
): RecommendationDecisionAudit {
  return recommendationDecisionAuditSchema.parse(value);
}

export function toPublicScoreSummary(score: GoatScoreBreakdown) {
  return {
    moodScore: score.moodScore.total,
    conditionScore: score.conditionScore.total,
    baseScore: score.baseScore,
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
  };
}
