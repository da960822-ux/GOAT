export type DataStatus = 'confirmed' | 'needs_verification' | 'future_candidate';

export interface Place {
  place_id: string;
  city: string;
  region_group: string;
  place_name: string;
  place_type: string;
  primary_mood: string;
  mood_tags: string[];
  photo_point: string;
  best_time: string;
  best_season: string;
  accessibility: string;
  data_status: DataStatus;
  recommendation_use: string;
  note: string;
  address?: string;
  lat?: number;
  lng?: number;
  imageUrl?: string;
  parking?: string;
  travelTime?: string;
  weatherFit?: string;
  crowdLevel?: string;
  contactInfo?: string;
  description?: string;
}

export interface MoodCategory {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  placeNames: string[];
}

export type RecommendationRole = '장면 최적' | '같은 장면 대안' | '날씨 맞춤';

export interface RecommendationCard {
  place: Place;
  role: RecommendationRole;
  score: number;
  reason: string;
}
