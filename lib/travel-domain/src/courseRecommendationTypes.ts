import {
  CompanionType,
  GoatPlace,
  PrimaryTheme,
  PurposeTag,
  TransportType,
} from "./goatRecommendationTypes";

export type TourCandidateCategory =
  | "TOUR"
  | "CAFE"
  | "RESTAURANT"
  | "MARKET"
  | "WALK"
  | "PHOTO"
  | "ETC";
export type CourseStopType =
  | "START_PLACE"
  | "TOUR"
  | "CAFE"
  | "RESTAURANT"
  | "WALK"
  | "PHOTO"
  | "ETC";
export type CourseBuildMode = "LLM_OPENROUTER" | "RULE_BASED_FALLBACK";

export interface TourApiNearbyCandidate {
  id: string;
  title: string;
  category: TourCandidateCategory;
  address?: string;
  overview?: string;
  imageUrl?: string;
  mapX?: number;
  mapY?: number;
  distanceMeters?: number;
  source?: "VISITKOREA_CONTENT_LAB" | "TOUR_API" | "LOCAL_DB" | "FRONTEND_PROVIDED" | "MOCK";
  raw?: unknown;
}

export interface CoursePlanningUserConditions {
  primaryTheme: PrimaryTheme | string;
  userMoodTags?: string[];
  userSceneTags?: string[];
  companionType?: CompanionType | string;
  travelPurpose?: PurposeTag | string;
  transportType?: TransportType | string;
}

export interface GoatDayCourseRequest extends CoursePlanningUserConditions {
  /** 사용자가 1차 추천 카드 3개 중 최종 선택한 GOAT place_id */
  selectedPlaceId: string;
  /** 테스트/프론트/백엔드에서 이미 확보한 주변 후보를 넘길 때 사용한다. */
  nearbyCandidates?: TourApiNearbyCandidate[];
  /** 후보가 너무 많을 때 LLM에 넘길 최대 개수. 기본 12개 */
  maxCandidatesForLlm?: number;
  /** true면 외부 API/LLM을 호출하지 않고 fallback 규칙으로만 코스를 만든다. */
  forceRuleBasedFallback?: boolean;
  /** 한국관광공사 위치기반 관광정보 조회 반경. 기본 3000m */
  radiusMeters?: number;
  /** OpenRouter 모델명. 기본 openai/gpt-4o-mini */
  llmModel?: string;
  /** LLM 응답 원문을 debug에 포함할지 여부. 기본 false */
  debug?: boolean;
}

export interface CourseStop {
  order: number;
  id: string;
  title: string;
  type: CourseStopType;
  category: TourCandidateCategory | "START_PLACE";
  address?: string;
  lat?: number;
  lng?: number;
  stayMinutes: number;
  reason: string;
  source?: string;
}

export interface KakaoStaticMapMarker {
  order: number;
  title: string;
  lat: number;
  lng: number;
}

export interface KakaoStaticMapConfig {
  sdkScriptUrl: string;
  containerId: string;
  center: { lat: number; lng: number };
  level: number;
  width: number;
  height: number;
  markers: KakaoStaticMapMarker[];
}

export interface StaticMapResult {
  provider: "KAKAO_JS_SDK_STATIC_MAP" | "KAKAO_MAP_SEARCH" | "NONE";
  staticMapConfig?: KakaoStaticMapConfig;
  fallbackMapSearchUrl?: string;
  reason?: string;
}

export interface GoatDayCourseResult {
  status: "DONE" | "FAILED";
  resultType: "COURSE" | "UNKNOWN";
  mode: CourseBuildMode;
  message: string;
  selectedPlace: Pick<
    GoatPlace,
    "place_id" | "place_name" | "city" | "region_group" | "primaryTheme" | "photo_point" | "place_type"
  >;
  conditions: CoursePlanningUserConditions;
  nearbyCandidateCount: number;
  courseTitle?: string;
  summary?: string;
  stops: CourseStop[];
  staticMap: StaticMapResult;
  llmPromptUsed?: boolean;
  failReason?: string | null;
  warnings: string[];
  debug?: {
    llmModel?: string;
    rawLlmText?: string;
    llmError?: string;
    tourApiError?: string;
    candidatesPassedToLlm?: TourApiNearbyCandidate[];
  };
}

export interface LlmCoursePlannerJson {
  courseTitle: string;
  summary: string;
  selectedCandidateIds: string[];
  stops: Array<{
    id: string;
    title: string;
    category: CourseStop["category"];
    stayMinutes: number;
    reason: string;
  }>;
  routeNote: string;
}
