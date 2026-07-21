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
  engineInput: MoodEngineInput;
}

export interface MoodEngineInput {
  extractedTags?: string[];
  sceneTags?: string[];
  moodTags?: string[];
  preferredSeason?: string | string[];
  preferredTime?: string | string[];
  regionGroup?: string;
  weatherTag?: string;
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
  /** 카드 간 또는 출발지 기준 이동 정보. 점수 반영 여부는 from에 따라 다르다. */
  routeInfo?: {
    from: "ORIGIN" | "FIRST_CARD";
    fromLabel: string;
    distanceKm: number;
    durationMin?: number;
    source: "KAKAO_ROUTE" | "HAVERSINE";
    estimated: boolean;
    scoreApplied: boolean;
  };
}

export interface RecommendationResult {
  /** 서버가 생성한 추천 요청 ID. 다시 추천 시 rerollOfRequestId로 전달한다. */
  requestId?: string;
  moodId: string;
  referenceCardId?: string;
  appliedTags: string[];
  seedPoolSize: number;
  candidatePoolSize: number;
  poolPolicy: "ALL61" | "PRIMARY43";
  poolReason: string;
  fallbackUsed: boolean;
  adaptivePoolRetryUsed: boolean;
  recommendations: RecommendationCard[];
  cards?: GoatRecommendationCard[];
  alternatives?: GoatRecommendationCard[];
  warnings?: string[];
  originStatus?: "APPLIED" | "SKIPPED" | "UNAVAILABLE";
  originNotice?: string;
}

export type Companion = "혼자" | "연인" | "친구" | "가족";
export type Transport = "자차" | "대중교통" | "도보중심";
export type VisitTime = "새벽" | "오전" | "한낮" | "오후" | "일몰" | "저녁" | "야간" | "밤/새벽";
export type TravelPurpose = "가볍게 산책" | "사진 위주" | "액티비티" | "조용한 휴식";
export type OriginType = "current" | "region" | "address" | "skip";

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
