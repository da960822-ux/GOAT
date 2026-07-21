export type PrimaryTheme =
  | "바다·해안 무드"
  | "일본 소도시·골목 무드"
  | "알프스·고원·목장 무드"
  | "숲·정원·자연휴식 무드"
  | "레트로·시장·항구 무드"
  | "건축·전시·랜드마크 무드"
  | "휴양·카페·이국공간 무드";

export type PurposeTag =
  | "사진·포토스팟"
  | "산책·힐링"
  | "카페·실내휴식"
  | "전시·건축관람"
  | "체험·액티비티"
  | "먹거리·야간탐방"
  | "숙소·리조트";

export type SeasonTag = "봄" | "여름" | "가을" | "겨울" | "사계절";
export type BestTime = "새벽" | "오전" | "한낮" | "오후" | "저녁" | "야간";
export type TransportType = "자차" | "대중교통" | "도보중심";
export type AccessGrade = "상" | "중" | "하";

export interface GoatPlace {
  place_id: string;
  place_name: string;
  city: string;
  region_group: string;
  primaryTheme: PrimaryTheme | string;
  mood_tags: string[];
  sceneTags: string[];
  place_type: string;
  photo_point: string;
  purpose_tags: string[];
  season_tags: string[];
  best_time: BestTime | string;
  accessibility: {
    public_transport?: AccessGrade | string | null;
    car?: AccessGrade | string | null;
    walk?: AccessGrade | string | null;
  };
  recommendation_use: string;
  note?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  imageUrl?: string | null;
  address?: string | null;
  [key: string]: unknown;
}

export interface GoatPlaceDataset {
  tag_sets?: Record<string, string[]>;
  places: GoatPlace[];
  pending_places?: GoatPlace[];
}

export interface GoatReferenceCard {
  referenceCardId: string;
  displayOrder?: number;
  title: string;
  subtitle?: string;
  primaryTheme: PrimaryTheme | string;
  sceneTags: string[];
  mood_tags: string[];
  recommendedPurpose?: string[];
  recommendedBestTime?: string[];
  recommendedTransport?: string[];
  examplePlaceIds?: string[];
  uiKeywords?: string[];
  isActive?: boolean;
  coveragePlaceIds?: string[];
  candidatePlaceIds?: string[];
  candidateCount?: number;
  coverageCount?: number;
  candidateSelectionRule?: string;
}

export interface GoatReferenceCardDataset {
  version?: string;
  generatedAt?: string;
  source?: string;
  purpose?: string;
  usage?: Record<string, string>;
  balancePolicy?: Record<string, unknown>;
  reference_cards: GoatReferenceCard[];
}

export interface ExposureStats {
  /** 전체 누적 노출 횟수. 노출이 낮은 후보 보정에 사용한다. */
  totalExposureByPlaceId?: Record<string, number | undefined>;
  /** 최근 N회 노출 횟수. 2/3번 카드에서 최대 -5점 페널티로 사용한다. */
  recentExposureByPlaceId?: Record<string, number | undefined>;
  /** 테마별 평균 노출. 없으면 엔진이 후보 전체 평균으로 계산한다. */
  themeAverageExposure?: Record<string, number | undefined>;
}

export interface RouteDistanceInput {
  /** 실제 길찾기 API가 계산한 1번 카드 기준 도로 이동거리. 있으면 좌표보다 우선한다. */
  routeDistanceKmByPlaceId?: Record<string, number | undefined>;
}

export interface RecommendRequest extends ExposureStats, RouteDistanceInput {
  /** 사용자가 고른 레퍼런스 카드. 있으면 카드의 숨은 태그와 candidatePlaceIds를 입력값으로 사용한다. */
  referenceCardId?: string;
  /** 레퍼런스 카드 없이 감성 버튼/AI 분석값으로 직접 추천할 때 사용한다. */
  primaryTheme?: PrimaryTheme | string;
  userMoodTags?: string[];
  userSceneTags?: string[];
  travelPurpose?: PurposeTag | string;
  transportType?: TransportType | string;
  visitTime?: BestTime | string;
  /** 직접 계절을 넘기면 currentMonth보다 우선한다. */
  currentSeason?: SeasonTag | string;
  /** 1~12. currentSeason이 없을 때 계절 계산에 사용한다. */
  currentMonth?: number;
  /** 후보 장소를 강제로 제한할 때 사용한다. 예: API가 미리 추린 후보 ID 목록. */
  candidatePlaceIds?: string[];
  /** 이미 화면에 보여준 장소를 제외하고 싶을 때 사용한다. */
  excludePlaceIds?: string[];
  /** 기본 3. MVP는 3장 카드 고정이지만 테스트용으로 열어둔다. */
  limit?: 3;
  /** true면 후보와 점수 세부 내역을 resultData.debug에 포함한다. */
  debug?: boolean;
}

export interface MatchDetail {
  requested: string[];
  matched: string[];
  count: number;
  score: number;
}

export interface MoodScoreBreakdown {
  total: number;
  theme: {
    requested?: string;
    placeTheme: string;
    matched: boolean;
    score: number;
  };
  moodTags: MatchDetail;
  sceneTags: MatchDetail;
  placeTypeHint: {
    matchedHints: string[];
    score: number;
    note: string;
  };
}

export interface ConditionScoreBreakdown {
  total: number;
  purpose: {
    requested?: string;
    placePurposeTags: string[];
    matched: boolean;
    score: number;
  };
  accessibility: {
    transportType?: string;
    grade?: string;
    score: number;
    inferred?: boolean;
    note?: string;
  };
  bestTime: {
    requested?: string;
    placeBestTime: string;
    matchType: "exact" | "adjacent" | "none" | "not_requested";
    score: number;
  };
  season: {
    requested?: string;
    placeSeasonTags: string[];
    matchType: "current" | "all_season" | "none" | "not_requested";
    score: number;
  };
}

export interface ScoreBreakdown {
  moodScore: MoodScoreBreakdown;
  conditionScore: ConditionScoreBreakdown;
  baseScore: number;
  routeDistanceBonus: number;
  duplicatePenalty: number;
  exposurePenalty: number;
  coverageBoost: number;
  lowExposureBoost: number;
  selectionScore: number;
  displayScore: number;
}

export type RecommendationCardRole =
  | "BEST_SCENE"
  | "SAME_MOOD_ALTERNATIVE"
  | "CONDITION_FIT_ALTERNATIVE";

export interface RecommendationCard {
  rank: 1 | 2 | 3;
  role: RecommendationCardRole;
  roleLabel: string;
  placeId: string;
  placeName: string;
  city: string;
  regionGroup: string;
  primaryTheme: string;
  placeType: string;
  photoPoint: string;
  recommendationUse: string;
  bestTime: string;
  seasonTags: string[];
  purposeTags: string[];
  accessibility: GoatPlace["accessibility"];
  note?: string;
  imageUrl?: string | null;
  address?: string | null;
  score: ScoreBreakdown;
  reasons: string[];
  cautions: string[];
}

export interface NormalizedRequest {
  referenceCard?: GoatReferenceCard;
  primaryTheme?: string;
  userMoodTags: string[];
  userSceneTags: string[];
  travelPurpose?: string;
  transportType?: string;
  visitTime?: string;
  currentSeason?: string;
  candidatePlaceIds: string[];
  excludePlaceIds: string[];
}

export interface CandidateScore {
  place: GoatPlace;
  score: ScoreBreakdown;
  reasons: string[];
  cautions: string[];
}

export interface RecommendResult {
  status: "DONE" | "FAILED";
  resultType: "RECOMMEND" | "UNKNOWN";
  score: number | null;
  message: string;
  resultData: {
    request: NormalizedRequest;
    cards: RecommendationCard[];
    alternatives: RecommendationCard[];
    warnings: string[];
    debug?: {
      candidatePoolSize: number;
      scoredCandidates: Array<{
        placeId: string;
        placeName: string;
        primaryTheme: string;
        baseScore: number;
        selectionScore: number;
        displayScore: number;
      }>;
    };
  } | null;
  failReason: string | null;
}
