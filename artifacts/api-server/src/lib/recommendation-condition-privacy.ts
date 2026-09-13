export type RecommendationConditions = Record<string, unknown>;

export function redactRecommendationConditions(
  conditions: RecommendationConditions,
): RecommendationConditions {
  const origin = conditions.origin;
  if (!origin || typeof origin !== "object" || Array.isArray(origin)) return { ...conditions };
  const { latitude: _latitude, longitude: _longitude, regionName: _regionName, ...redactedOrigin } = origin as Record<string, unknown>;
  return { ...conditions, origin: redactedOrigin };
}
