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
  /** 레거시 내부 타입 호환용. 공개 HTTP 요청에서는 무시된다. */
  nearbyCandidates?: TourApiNearbyCandidate[];
  /** 후보가 너무 많을 때 LLM에 넘길 최대 개수. 기본 12개 */
  maxCandidatesForLlm?: number;
  /** 비프로덕션 진단에서만 GOAT_ALLOW_FORCE_FALLBACK=true일 때 허용된다. */
  forceRuleBasedFallback?: boolean;
  /** 한국관광공사 위치기반 관광정보 조회 반경. 기본 3000m */
  radiusMeters?: number;
  /** OpenRouter 모델명. 기본 google/gemini-3.7-flash */
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
  /** 감사 증적: 이 응답을 만든 KTO 실시간 호출과 최종 반영 결과. */
  ktoEvidence?: {
    provider: "VISITKOREA_CONTENT_LAB";
    endpoint: "locationBasedList2";
    callId?: string;
    liveCallAttempted: boolean;
    requestCount: number;
    successfulRequestCount: number;
    failedRequestCount: number;
    rawCandidateCount: number;
    filteredCandidateCount: number;
    candidateIds: string[];
    finalKtoStopIds: string[];
    fallbackUsed: boolean;
    fallbackReason?: string;
    generatedAt: string;
  };
  debug?: {
    llmModel?: string;
    llmRequestedModel?: string;
    llmHttpStatus?: number;
    llmLatencyMs?: number;
    llmAttempts?: number;
    rawLlmText?: string;
    llmError?: string;
    tourApiError?: string;
    tourApiDiagnostics?: {
      callId?: string;
      httpStatuses: number[];
      latencyMs: number;
      requestCount: number;
      successfulRequestCount: number;
      failedRequestCount: number;
      rawCandidateCount: number;
      filteredCandidateCount: number;
      coordinateCandidateCount: number;
    };
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
