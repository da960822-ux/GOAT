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
  visitTime?: BestTime | string;
  currentMonth?: number;
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
    cards: RecommendationCardForUI[];
    alternatives: RecommendationCardForUI[];
    warnings: string[];
  };
  failReason: string | null;
}
