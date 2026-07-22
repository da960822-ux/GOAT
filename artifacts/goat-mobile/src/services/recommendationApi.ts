import {
  createRecommendation,
  geocodeOrigin,
  type CreateRecommendationRequest,
  type RecommendationData,
  type TravelOrigin,
} from "@workspace/api-client-react";
import type { RecommendationSelection } from "@workspace/travel-domain/catalog";

export type RecommendationAttempt = {
  key: string;
  request: CreateRecommendationRequest;
  initialSelection: RecommendationSelection;
};
export type RecommendationSession = RecommendationData & {
  initialSelection: RecommendationSelection;
};
export type ApiFailure = Error & { status: number; data: unknown; headers: Headers };
export function isApiFailure(error: unknown): error is ApiFailure { return error instanceof Error && typeof (error as Partial<ApiFailure>).status === "number" && "data" in error; }

export function newIdempotencyKey() {
  const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.map((n) => n.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

type BuildRecommendationAttemptInput = {
  selection: RecommendationSelection;
  preferences?: CreateRecommendationRequest["preferences"];
  origin?: CreateRecommendationRequest["origin"] | null;
  rerollOfRecommendationId?: string;
  excludeIds?: string[];
  key?: string;
};

export function normalizeOrigin(origin?: CreateRecommendationRequest["origin"] | null): CreateRecommendationRequest["origin"] | undefined {
  if (!origin) return undefined;
  if (origin.type === "skip") return { type: "skip" };
  const coordinates = Number.isFinite(origin.latitude) && Number.isFinite(origin.longitude)
    ? { latitude: origin.latitude, longitude: origin.longitude }
    : {};
  const regionName = origin.regionName?.trim();
  return {
    type: origin.type,
    ...coordinates,
    ...(regionName ? { regionName } : {}),
  };
}

export function buildRecommendationAttempt({
  selection,
  preferences,
  origin,
  rerollOfRecommendationId,
  excludeIds,
  key = newIdempotencyKey(),
}: BuildRecommendationAttemptInput): RecommendationAttempt {
  const selectionBody = selection.method === "mood"
    ? { moodId: selection.moodId }
    : { referenceCardId: selection.referenceCardId };
  return {
    key,
    initialSelection: selection,
    request: {
      ...selectionBody,
      preferences,
      origin: normalizeOrigin(origin),
      rerollOfRecommendationId,
      excludeIds,
    },
  };
}

export function selectionFromRequest(request: CreateRecommendationRequest): RecommendationSelection {
  if (request.moodId) return { method: "mood", moodId: request.moodId };
  if (request.referenceCardId) return { method: "reference", referenceCardId: request.referenceCardId };
  throw new Error("Recommendation request must contain exactly one selection.");
}

export function hydrateRecommendationSession(data: RecommendationData): RecommendationSession {
  return { ...data, initialSelection: selectionFromRequest(data.conditions) };
}

function errorCode(error: unknown) {
  if (!isApiFailure(error) || !error.data || typeof error.data !== "object") return null;
  const body = error.data as Record<string, unknown>;
  return typeof body.code === "string" ? body.code : null;
}

export async function createRecommendationWithRetry(attempt: RecommendationAttempt): Promise<RecommendationSession> {
  try {
    const response = await createRecommendation(attempt.request, { headers: { "Idempotency-Key": attempt.key } });
    return { ...response.data, initialSelection: attempt.initialSelection };
  } catch (error) {
    if (isApiFailure(error) && error.status === 409 && errorCode(error) === "REQUEST_IN_PROGRESS") {
      const retryAfter = Math.min(5, Math.max(1, Number(error.headers.get("retry-after")) || 2));
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      const response = await createRecommendation(attempt.request, { headers: { "Idempotency-Key": attempt.key } });
      return { ...response.data, initialSelection: attempt.initialSelection };
    }
    throw error;
  }
}

export async function resolveOrigin(query: string, type: "region" | "address" = "address"): Promise<TravelOrigin> {
  const response = await geocodeOrigin({ query });
  return { ...response.data.origin, type };
}

export function classifyRecommendationError(error: unknown) {
  if (!isApiFailure(error)) return { route: "/network-error" as const, retryable: true, code: "NETWORK" };
  const code = errorCode(error) ?? `HTTP_${error.status}`;
  if (error.status === 401) return { route: "/login" as const, retryable: true, code };
  if (error.status === 422) return { route: "/no-results" as const, retryable: false, code };
  return { route: "/network-error" as const, retryable: error.status === 503 || error.status === 409, code };
}
