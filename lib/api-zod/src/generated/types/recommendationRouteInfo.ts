/** Generated from the GOAT OpenAPI contract. */
export interface RecommendationRouteInfo {
  from: 'ORIGIN' | 'FIRST_CARD';
  fromLabel: string;
  distanceKm: number;
  durationMin?: number;
  source: 'KAKAO_ROUTE' | 'HAVERSINE';
  estimated: boolean;
  scoreApplied: boolean;
}
