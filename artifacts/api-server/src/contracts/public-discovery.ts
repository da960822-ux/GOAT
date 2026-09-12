import {
  CreatePublicRecommendationBody,
  GetPlacePhotosQueryParams,
  GetSceneCoverQueryParams,
  ReplacePublicRecommendationCardBody,
} from "@workspace/api-zod";

export const createPublicRecommendationSchema =
  CreatePublicRecommendationBody.strict();
export const getSceneCoverSchema = GetSceneCoverQueryParams.strict();
export const getPlacePhotosSchema = GetPlacePhotosQueryParams.strict();
export const replacePublicRecommendationCardSchema =
  ReplacePublicRecommendationCardBody.strict()
    .refine(
      ({ revision, targetSlot }) =>
        Number.isInteger(revision) && Number.isInteger(targetSlot),
      {
        message: "revision and targetSlot must be integers",
      },
    )
    .refine(
      ({ currentPlaceIds }) =>
        new Set(currentPlaceIds).size === currentPlaceIds.length,
      {
        message: "currentPlaceIds must be unique",
      },
    )
    .refine(({ seenIds }) => new Set(seenIds).size === seenIds.length, {
      message: "seenIds must be unique",
    });
