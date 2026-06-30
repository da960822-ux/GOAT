import type { RecommendationInput } from "./v13Engine";
import type { RecommendationCard as GoatRecommendationCard } from "./goatRecommendationTypes";

export type DataStatus = "confirmed" | "needs_verification" | "future_candidate";

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
  engineInput: Pick<
    RecommendationInput,
    | "extractedTags"
    | "sceneTags"
    | "moodTags"
    | "preferredSeason"
    | "preferredTime"
    | "regionGroup"
    | "weatherTag"
  >;
}

export type RecommendationRole = "장면 최적" | "같은 분위기 대안" | "조건 맞춤";

export interface RecommendationCard {
  place: Place;
  role: RecommendationRole;
  score: number;
  reason: string;
  matchedTags: string[];
  scoreBreakdown: Record<string, number>;
  safetyNotes: string[];
  weatherFit: string;
  parkingInfo: string;
}

export interface RecommendationResult {
  moodId: string;
  referenceCardId?: string;
  appliedTags: string[];
  seedPoolSize: number;
  candidatePoolSize: number;
  poolPolicy: "ALL58" | "PRIMARY43";
  poolReason: string;
  fallbackUsed: boolean;
  adaptivePoolRetryUsed: boolean;
  recommendations: RecommendationCard[];
  cards?: GoatRecommendationCard[];
  alternatives?: GoatRecommendationCard[];
  warnings?: string[];
}

export type Companion = "혼자" | "연인" | "친구" | "가족";
export type Transport = "자차" | "대중교통" | "도보중심";
export type VisitTime = "새벽" | "오전" | "한낮" | "오후" | "일몰" | "저녁" | "야간" | "밤/새벽";
export type TravelPurpose = "가볍게 산책" | "사진 위주" | "액티비티" | "조용한 휴식";
export type OriginType = "current" | "region" | "skip";

export interface TravelOrigin {
  type: OriginType;
  latitude?: number;
  longitude?: number;
  regionName?: string;
}

export interface TravelPreferences {
  companion: Companion;
  transport: Transport;
  visitTime?: VisitTime | null;
  purpose: TravelPurpose;
}
