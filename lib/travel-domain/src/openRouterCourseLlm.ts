import { GoatPlace } from "./goatRecommendationTypes";
import {
  CoursePlanningUserConditions,
  LlmCoursePlannerJson,
  TourApiNearbyCandidate,
} from "./courseRecommendationTypes";

declare const process: { env: Record<string, string | undefined> };
declare const fetch: (input: string, init: {
  method: string;
  headers: Record<string, string>;
  body: string;
  signal?: unknown;
}) => Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
}>;
declare const AbortSignal: { timeout(ms: number): unknown };
declare const setTimeout: (handler: () => void, ms: number) => unknown;

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "openai/gpt-4o-mini";
const REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_ATTEMPTS = 2;
const DEFAULT_RETRY_DELAY_MS = 250;
const MAX_OUTPUT_TOKENS = 1_200;
const MAX_RESPONSE_CHARS = 50_000;
const RETRYABLE_HTTP_STATUSES = new Set([429, 500, 502, 503, 504]);
const ALLOWED_STOP_CATEGORIES = new Set([
  "START_PLACE",
  "TOUR",
  "CAFE",
  "RESTAURANT",
  "WALK",
  "PHOTO",
  "ETC",
]);

function getOpenRouterKey(): string | undefined {
  const key = process.env.OPENROUTER_API_KEY;
  return key && key.trim() ? key.trim() : undefined;
}

function getPositiveInt(key: string, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(process.env[key] ?? "", 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, min), max) : fallback;
}

function getOpenRouterBaseUrl(): string {
  return (process.env.OPENROUTER_BASE_URL?.trim() || OPENROUTER_BASE_URL).replace(/\/+$/, "");
}

function wait(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeJsonParse<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(text.slice(first, last + 1)) as T;
    throw new Error("LLM_JSON_PARSE_FAILED");
  }
}

function nonEmptyString(value: unknown, code: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(code);
  return value.trim();
}

/**
 * Validates the structured LLM response before any field is used. Candidate
 * titles are deliberately ignored downstream; canonical data is joined by ID.
 */
export function validateLlmCoursePlannerJson(
  value: unknown,
  params: { selectedPlaceId: string; candidateIds: string[] },
): LlmCoursePlannerJson {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("LLM_SCHEMA_INVALID_OBJECT");
  }
  const record = value as Record<string, unknown>;
  const courseTitle = nonEmptyString(record.courseTitle, "LLM_SCHEMA_COURSE_TITLE_REQUIRED");
  const summary = nonEmptyString(record.summary, "LLM_SCHEMA_SUMMARY_REQUIRED");
  const routeNote = nonEmptyString(record.routeNote, "LLM_SCHEMA_ROUTE_NOTE_REQUIRED");
  const candidateIdSet = new Set(params.candidateIds);

  if (!Array.isArray(record.selectedCandidateIds)) {
    throw new Error("LLM_SCHEMA_SELECTED_IDS_REQUIRED");
  }
  const rawSelectedCandidateIds = record.selectedCandidateIds.map((id) =>
    nonEmptyString(id, "LLM_SCHEMA_INVALID_CANDIDATE_ID")
  );
  // Some JSON-capable models include the mandatory start place in this list.
  // It is canonical (not hallucinated), so normalize it away while continuing
  // to reject every ID outside the selected place and supplied candidates.
  const selectedCandidateIds = rawSelectedCandidateIds.filter((id) => id !== params.selectedPlaceId);
  if (selectedCandidateIds.length === 0) throw new Error("LLM_SCHEMA_EMPTY_CANDIDATE_SELECTION");
  if (new Set(rawSelectedCandidateIds).size !== rawSelectedCandidateIds.length) {
    throw new Error("LLM_SCHEMA_DUPLICATE_CANDIDATE_ID");
  }
  if (selectedCandidateIds.some((id) => !candidateIdSet.has(id))) {
    throw new Error("LLM_SCHEMA_UNKNOWN_CANDIDATE_ID");
  }

  if (!Array.isArray(record.stops) || record.stops.length < 2 || record.stops.length > 5) {
    throw new Error("LLM_SCHEMA_INVALID_STOP_COUNT");
  }
  const seenStopIds = new Set<string>();
  const stops = record.stops.map((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("LLM_SCHEMA_INVALID_STOP");
    }
    const stop = value as Record<string, unknown>;
    const id = nonEmptyString(stop.id, "LLM_SCHEMA_STOP_ID_REQUIRED");
    if (seenStopIds.has(id)) throw new Error("LLM_SCHEMA_DUPLICATE_STOP_ID");
    seenStopIds.add(id);
    if (id !== params.selectedPlaceId && !candidateIdSet.has(id)) {
      throw new Error("LLM_SCHEMA_UNKNOWN_STOP_ID");
    }

    const category = nonEmptyString(stop.category, "LLM_SCHEMA_STOP_CATEGORY_REQUIRED");
    if (!ALLOWED_STOP_CATEGORIES.has(category)) throw new Error("LLM_SCHEMA_INVALID_STOP_CATEGORY");
    const stayMinutes = Number(stop.stayMinutes);
    if (!Number.isInteger(stayMinutes) || stayMinutes < 10 || stayMinutes > 360) {
      throw new Error("LLM_SCHEMA_INVALID_STAY_MINUTES");
    }
    return {
      id,
      title: nonEmptyString(stop.title, "LLM_SCHEMA_STOP_TITLE_REQUIRED"),
      category: category as LlmCoursePlannerJson["stops"][number]["category"],
      stayMinutes,
      reason: nonEmptyString(stop.reason, "LLM_SCHEMA_STOP_REASON_REQUIRED"),
    };
  });

  if (!seenStopIds.has(params.selectedPlaceId)) throw new Error("LLM_SCHEMA_START_PLACE_MISSING");
  const stopCandidateIds = stops
    .map((stop) => stop.id)
    .filter((id) => id !== params.selectedPlaceId);
  if (
    stopCandidateIds.length !== selectedCandidateIds.length ||
    stopCandidateIds.some((id) => !selectedCandidateIds.includes(id))
  ) {
    throw new Error("LLM_SCHEMA_SELECTED_IDS_MISMATCH");
  }

  return { courseTitle, summary, selectedCandidateIds, stops, routeNote };
}

export function buildGoatCoursePlannerPrompt(params: {
  selectedPlace: GoatPlace;
  conditions: CoursePlanningUserConditions;
  candidates: TourApiNearbyCandidate[];
}): string {
  const { selectedPlace, conditions, candidates } = params;
  return `너는 GOAT 강원 여행 추천 서비스의 하루 코스 큐레이터다.

목표:
- 사용자가 1차 추천 카드 3개 중 선택한 기준 장소를 출발점으로 삼는다.
- 한국관광공사 OpenAPI 또는 프론트가 넘긴 주변 후보 중에서 동행자, 무드, 여행 목적, 이동수단에 맞는 장소를 고른다.
- 결과는 반드시 JSON 객체 하나로만 반환한다. 마크다운, 설명문, 코드블록은 금지한다.

선택 기준 우선순위:
1. selectedPlace는 반드시 1번 stop으로 포함한다.
2. travelPurpose와 companionType을 강하게 반영한다.
3. primaryTheme, userMoodTags, userSceneTags와 어울리는 후보를 고른다.
4. transportType이 "대중교통"이면 이동 부담이 커 보이는 후보를 줄이고, "자차"면 반경이 넓은 후보도 허용한다.
5. 카페/휴식 후보 1개, 관광/산책/포토 후보 1~2개, 먹거리 후보 0~1개를 균형 있게 고른다.
6. 후보에 좌표가 있으면 가까운 순서로 자연스럽게 정렬한다. 좌표가 부족하면 category와 distanceMeters를 참고한다.
7. 없는 정보는 만들지 말고, 후보 목록에 있는 id/title만 사용한다.

사용자 조건:
${JSON.stringify(conditions, null, 2)}

선택 기준 장소:
${JSON.stringify({
  id: selectedPlace.place_id,
  title: selectedPlace.place_name,
  city: selectedPlace.city,
  region_group: selectedPlace.region_group,
  primaryTheme: selectedPlace.primaryTheme,
  place_type: selectedPlace.place_type,
  photo_point: selectedPlace.photo_point,
  purpose_tags: selectedPlace.purpose_tags,
  season_tags: selectedPlace.season_tags,
  accessibility: selectedPlace.accessibility,
}, null, 2)}

주변 후보 목록:
${JSON.stringify(candidates.map((candidate) => ({
  id: candidate.id,
  title: candidate.title,
  category: candidate.category,
  address: candidate.address,
  overview: candidate.overview,
  distanceMeters: candidate.distanceMeters,
  mapX: candidate.mapX,
  mapY: candidate.mapY,
  source: candidate.source,
})), null, 2)}

반환 JSON 스키마:
{
  "courseTitle": "문자열",
  "summary": "하루 코스 한 줄 요약",
  "selectedCandidateIds": ["후보 id"],
  "stops": [
    {
      "id": "selectedPlace 또는 후보 id",
      "title": "장소명",
      "category": "START_PLACE | TOUR | CAFE | RESTAURANT | WALK | PHOTO | ETC",
      "stayMinutes": 30,
      "reason": "이 장소를 넣은 이유"
    }
  ],
  "routeNote": "동선 정렬 기준과 이동 팁"
}

중요: selectedCandidateIds에는 주변 후보 id만 넣고 selectedPlace id는 넣지 않는다.`;
}

export async function callOpenRouterCoursePlanner(params: {
  selectedPlace: GoatPlace;
  conditions: CoursePlanningUserConditions;
  candidates: TourApiNearbyCandidate[];
  model?: string;
}): Promise<{
  parsed: LlmCoursePlannerJson;
  rawText: string;
  model: string;
  requestedModel: string;
  httpStatus: number;
  latencyMs: number;
  attempts: number;
}> {
  const apiKey = getOpenRouterKey();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY_MISSING");

  const model = params.model ?? (process.env.OPENROUTER_DEFAULT_MODEL?.trim() || DEFAULT_MODEL);
  const prompt = buildGoatCoursePlannerPrompt(params);
  const requestBody = JSON.stringify({
    model,
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: MAX_OUTPUT_TOKENS,
    messages: [
      { role: "system", content: "너는 강원 관광 하루 코스를 JSON으로만 설계하는 추천 큐레이터다." },
      { role: "user", content: prompt },
    ],
  });
  const maxAttempts = getPositiveInt("OPENROUTER_MAX_ATTEMPTS", DEFAULT_MAX_ATTEMPTS, 1, 2);
  const retryDelayMs = getPositiveInt("OPENROUTER_RETRY_DELAY_MS", DEFAULT_RETRY_DELAY_MS, 0, 2_000);
  const timeoutMs = getPositiveInt("OPENROUTER_TIMEOUT_MS", REQUEST_TIMEOUT_MS, 1_000, 30_000);
  const startedAt = Date.now();
  let response: Awaited<ReturnType<typeof fetch>> | undefined;
  let attempts = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    attempts = attempt;
    try {
      response = await fetch(`${getOpenRouterBaseUrl()}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://goat.local",
          "X-Title": "GOAT Gangwon Course Planner",
        },
        body: requestBody,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      if (attempt < maxAttempts) {
        await wait(retryDelayMs * attempt);
        continue;
      }
      const isTimeout = error instanceof Error && error.name === "TimeoutError";
      throw new Error(isTimeout ? "OPENROUTER_TIMEOUT" : "OPENROUTER_REQUEST_FAILED");
    }

    if (response.ok) break;
    if (attempt < maxAttempts && RETRYABLE_HTTP_STATUSES.has(response.status)) {
      await response.text().catch(() => "");
      await wait(retryDelayMs * attempt);
      response = undefined;
      continue;
    }
    throw new Error(`OPENROUTER_HTTP_${response.status}`);
  }

  if (!response?.ok) throw new Error("OPENROUTER_REQUEST_FAILED");
  const data = await response.json() as {
    model?: unknown;
    choices?: Array<{ message?: { content?: string } }>;
  };
  const rawText = data.choices?.[0]?.message?.content ?? "";
  if (!rawText.trim()) throw new Error("OPENROUTER_EMPTY_RESPONSE");
  if (rawText.length > MAX_RESPONSE_CHARS) throw new Error("OPENROUTER_RESPONSE_TOO_LARGE");
  const parsedJson = safeJsonParse<unknown>(rawText);
  const parsed = validateLlmCoursePlannerJson(parsedJson, {
    selectedPlaceId: params.selectedPlace.place_id,
    candidateIds: params.candidates.map((candidate) => candidate.id),
  });

  return {
    parsed,
    rawText,
    model: typeof data.model === "string" && data.model.trim() ? data.model : model,
    requestedModel: model,
    httpStatus: response.status,
    latencyMs: Date.now() - startedAt,
    attempts,
  };
}
