import { Place } from '../types/place';

export interface TourInfo {
  address?: string;
  lat?: number;
  lng?: number;
  imageUrl?: string;
  parking?: string;
  contactInfo?: string;
  description?: string;
}

export async function fetchTourInfo(_placeId: string): Promise<TourInfo | null> {
  // TODO: Connect to Korea Tourism Organization (한국관광공사) API
  // API docs: https://www.data.go.kr (한국관광공사 국문관광정보서비스_GW)
  // Provides: address, coordinates, images, parking, contact, description
  // Return null until API key is configured
  return null;
}

export async function enrichPlaceWithTourInfo(place: Place): Promise<Place> {
  // TODO: Fetch tourInfo and merge optional fields into Place
  // const info = await fetchTourInfo(place.place_id);
  // if (info) return { ...place, ...info };
  return place;
}
