import { Place } from '../types/place';

export interface RelatedPlaceSuggestion {
  place: Place;
  relation: string;
}

export async function fetchRelatedPlaces(_placeId: string): Promise<RelatedPlaceSuggestion[]> {
  // TODO: Connect to related tourism places API
  // Future use: same-cut alternatives and nearby route suggestions
  // Data source: 한국관광공사 연관 관광지 API or KTO open data
  return [];
}

export async function fetchNearbyRoute(_placeId: string): Promise<string[]> {
  // TODO: Return nearby place IDs for route planning
  return [];
}
