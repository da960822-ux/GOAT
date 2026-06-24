export type PoolMode = "auto" | "all58" | "primary43";
export type PoolPolicy = "ALL58" | "PRIMARY43";

export type CompanionType = "solo" | "couple" | "friends" | "family" | string;
export type TravelPurpose = "photo" | "walk" | "activity" | "healing" | "food" | string;
export type TransportType = "car" | "public" | "walk" | string;

export type DataSourceMode = "api-first" | "seed-first" | "seed-only";
export type DataSourceUsed = "api" | "seed-fallback" | "seed" | "mock-fallback";
export type ApiFallbackReason =
  | "API_ERROR"
  | "API_CANDIDATES_TOO_FEW"
  | "API_SCORE_TOO_LOW"
  | "API_DISPLAY_DATA_TOO_WEAK";

export type ApiQuality = {
  passed: boolean;
  reason: string;
  candidateCount: number;
  topScore: number;
  top3AverageScore: number;
  hasEnoughDisplayData: boolean;
  fallbackReason: null | ApiFallbackReason;
};

export type RecommendationRequest = {
  requestId?: string;
  source?: "llm" | "manual-demo" | "reference-card" | string;
  extractedTags?: string[];
  moodTags?: string[];
  sceneTags?: string[];
  preferredSeason?: string | null;
  preferredTime?: string | null;
  regionGroup?: string | null;
  weatherTag?: string | null;
  companionType?: CompanionType | null;
  travelPurpose?: TravelPurpose | TravelPurpose[] | null;
  transportType?: TransportType | null;
  limit?: number;

  /**
   * api-first: OpenAPI 후보를 먼저 쓰고 품질이 낮으면 seed fallback.
   * seed-first: API 후보 생성 없이 seed 추천 우선.
   * seed-only: 시연/테스트 안정화를 위해 seed만 사용.
   */
  dataSourceMode?: DataSourceMode;

  /**
   * auto: 기본. 조건에 따라 58개 seed pool 또는 43개 1차 방문지 pool을 백엔드가 결정한다.
   * all58: 58개 전체 후보 사용.
   * primary43: confirmed + 비숙박/비리조트 중심의 43개 pool 사용.
   */
  poolMode?: PoolMode;
};

export type RecommendationCard = {
  rank: number;
  cardType: "SCENE_BEST" | "SAME_MOOD_ALTERNATIVE" | "CONDITION_FIT";
  cardLabel: string;
  placeId: string;
  name: string;
  city: string;
  regionGroup: string;
  placeType: string;
  primaryMood: string;
  dataStatus: string;
  dataStatusLabel: string;
  score: number;
  matchedTags: string[];
  scoreBreakdown: Record<string, number>;
  reason: string;
  photoPoint: string | null;
  bestTime: string | null;
  bestSeason: string | null;
  weatherFit: string;
  crowdLevel: string;
  safetyNotes: string[];
  parkingInfo: string;
  accessibility: string | null;
  imageUrl: string | null;
  mapSearchQuery: string | null;
};

export type RecommendationApiResponse = {
  status: "DONE" | "FAILED";
  resultType: "RECOMMEND" | "UNKNOWN";
  score: number | null;
  message: string;
  failReason: string | null;
  resultData: null | {
    requestId: string;
    inputTags: string[];
    seedPoolSize: number;
    candidatePoolSize: number;
    poolPolicy: PoolPolicy;
    poolReason: string;
    fallbackUsed: boolean;
    adaptivePoolRetryUsed: boolean;

    /** v1.3 API-first/fallback QA fields. 사용자 화면보다는 디버그/QA 화면에서 확인한다. */
    dataSourceRequested?: DataSourceMode;
    dataSourceUsed?: DataSourceUsed;
    apiQuality?: ApiQuality;

    recommendations: RecommendationCard[];
  };
};
