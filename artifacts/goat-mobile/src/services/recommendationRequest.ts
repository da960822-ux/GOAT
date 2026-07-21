import type { RecommendFromTagsRequest } from "@workspace/api-client-react";
import type {
  TravelOrigin,
  TravelPreferences,
  TravelPurpose,
  TravelSeason,
  VisitTime,
} from "../types/preferences";

type BuildRecommendationRequestInput = {
  moodId: string;
  preferences: TravelPreferences;
  origin?: TravelOrigin | null;
  excludeIds?: string[];
  sessionId?: string;
  rerollOfRequestId?: string | null;
};

export type FrontendRecommendationRequest = RecommendFromTagsRequest & {
  sessionId?: string;
  rerollOfRequestId?: string;
};

const SEASON_MONTH: Record<TravelSeason, number> = {
  "봄": 4,
  "여름": 7,
  "가을": 10,
  "겨울": 1,
};

const SAFE_RECOMMENDATION_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

export function createRecommendationSessionId(): string {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 14);
  return `goat_${time}_${random}`;
}

export function isSafeRecommendationId(value: unknown): value is string {
  return typeof value === "string" && SAFE_RECOMMENDATION_ID_PATTERN.test(value);
}

function toApiVisitTime(value: VisitTime | null): RecommendFromTagsRequest["visitTime"] {
  if (!value) return undefined;
  if (value === "일몰") return "저녁";
  if (value === "밤/새벽") return "야간";
  if (value === "새벽" || value === "오전" || value === "한낮" || value === "오후" || value === "저녁" || value === "야간") {
    return value;
  }
  return undefined;
}

function toLegacyPurpose(value: TravelPurpose): "가볍게 산책" | "사진 위주" | "액티비티" | "조용한 휴식" {
  if (value === "사진·포토스팟" || value === "전시·건축관람") return "사진 위주";
  if (value === "체험·액티비티") return "액티비티";
  if (value === "산책·힐링" || value === "먹거리·야간탐방") return "가볍게 산책";
  return "조용한 휴식";
}

export function buildRecommendationRequest({
  moodId,
  preferences,
  origin,
  excludeIds,
  sessionId,
  rerollOfRequestId,
}: BuildRecommendationRequestInput): FrontendRecommendationRequest {
  return {
    moodId,
    travelPurpose: preferences.purpose,
    transportType: preferences.transport,
    visitTime: toApiVisitTime(preferences.visitTime),
    currentMonth: preferences.season ? SEASON_MONTH[preferences.season] : undefined,
    // companion은 현재 1차 점수 정책에는 쓰지 않지만, 레거시 계약과 이후 코스
    // 큐레이션에서 유실되지 않도록 함께 보낸다. 1차 목적/교통은 위 필드가 우선한다.
    preferences: {
      companion: preferences.companion,
      transport: preferences.transport,
      visitTime: preferences.visitTime,
      purpose: toLegacyPurpose(preferences.purpose),
    },
    origin: origin ?? undefined,
    excludeIds,
    sessionId,
    rerollOfRequestId: rerollOfRequestId ?? undefined,
  };
}

export function getRecommendationRequestId(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const requestId = (data as { requestId?: unknown }).requestId;
  return isSafeRecommendationId(requestId) ? requestId : null;
}
