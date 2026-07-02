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

export type BestTime = "새벽" | "오전" | "한낮" | "오후" | "저녁" | "야간";
export type TransportType = "자차" | "대중교통" | "도보중심";

export interface RecommendationWarningForUI {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}


export interface RecommendationCardSelectionAuditForUI {
  rank: 1 | 2 | 3;
  role: "BEST_SCENE" | "SAME_MOOD_ALTERNATIVE" | "CONDITION_FIT_ALTERNATIVE";
  roleLabel: string;
  placeId: string;
  placeName: string;
  whySelected: string;
  candidatePool: {
    name: string;
    size: number;
    totalCandidatePoolSize: number;
    strictPurposePoolSize?: number;
    fallbackUsed?: boolean;
    fallbackReason?: string;
  };
  scoreSummary: {
    moodScore: number;
    conditionScore: number;
    baseScore: number;
    routeDistanceBonus: number;
    duplicatePenalty: number;
    exposurePenalty: number;
    coverageBoost: number;
    lowExposureBoost: number;
    selectionScore: number;
    displayScore: number;
  };
  scoreDetails: Record<string, unknown>;
  reasons: string[];
  cautions: string[];
}

export interface RecommendationDecisionAuditForUI {
  fallback: {
    card3PurposeFallbackUsed: boolean;
    reason?: string;
    travelPurpose?: string;
    strictPurposePoolSize?: number;
    fallbackPoolSize?: number;
  };
  cardSelections: RecommendationCardSelectionAuditForUI[];
}

export interface GoatReferenceCard {
  referenceCardId: string;
  displayOrder: number;
  title: string;
  subtitle?: string;
  primaryTheme: PrimaryTheme | string;
  sceneTags: string[];
  mood_tags: string[];
  recommendedPurpose: PurposeTag[] | string[];
  recommendedBestTime: BestTime[] | string[];
  recommendedTransport: TransportType[] | string[];
  uiKeywords: string[];
  isActive: boolean;
  candidatePlaceIds: string[];
  coveragePlaceIds: string[];
}

export interface RecommendRequestFromFrontend {
  referenceCardId: string;
  travelPurpose?: PurposeTag | string;
  transportType?: TransportType | string;
  currentMonth?: number;
  /** 다시 추천 버튼을 누를 때 직전 추천 결과의 requestId를 보낸다. 백엔드는 직전 카드 3개를 제외한다. */
  rerollOfRequestId?: string;
}

export interface RecommendationCardForUI {
  rank: 1 | 2 | 3;
  role: "BEST_SCENE" | "SAME_MOOD_ALTERNATIVE" | "CONDITION_FIT_ALTERNATIVE";
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
  accessibility: {
    public_transport?: "상" | "중" | "하" | string;
    car?: "상" | "중" | "하" | string;
    walk?: "상" | "중" | "하" | string;
  };
  note?: string;
  imageUrl?: string | null;
  address?: string | null;
  score: {
    baseScore: number;
    routeDistanceBonus: number;
    duplicatePenalty: number;
    selectionScore: number;
    displayScore: number;
  };
  reasons: string[];
  cautions: string[];
}

export interface RecommendResponseForUI {
  status: "DONE" | "FAILED";
  resultType: "RECOMMEND" | "UNKNOWN";
  score: number | null;
  message: string;
  resultData: null | {
    /** 다시 추천 버튼을 누를 때 rerollOfRequestId로 백엔드에 다시 보내는 값 */
    requestId?: string;
    cards: RecommendationCardForUI[];
    alternatives: RecommendationCardForUI[];
    warnings: RecommendationWarningForUI[];
    /** fallback 발생 이유와 각 카드 선택 이유/점수 근거. 일반 화면에는 숨기고 디버그/관리자 화면에서 확인 권장. */
    decisionAudit?: RecommendationDecisionAuditForUI;
  };
  failReason: string | null;
}
