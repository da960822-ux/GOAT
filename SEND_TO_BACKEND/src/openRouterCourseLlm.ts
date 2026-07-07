import { GoatPlace } from "./goatRecommendationTypes";
import { CoursePlanningUserConditions, LlmCoursePlannerJson, TourApiNearbyCandidate } from "./courseRecommendationTypes";

declare const process: { env?: Record<string, string | undefined>; cwd?: () => string } | undefined;
declare const require: ((moduleName: string) => unknown) | undefined;

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "openai/gpt-4o-mini";

interface FsLike {
  existsSync(path: string): boolean;
  readFileSync(path: string, encoding: string): string;
}
interface PathLike {
  resolve(...parts: string[]): string;
}

function loadNodeModule<T>(moduleName: string): T | null {
  try {
    if (typeof require !== "function") return null;
    return require(moduleName) as T;
  } catch {
    return null;
  }
}

function loadEnvFileIfAvailable(): void {
  const fs = loadNodeModule<FsLike>("node:fs");
  const path = loadNodeModule<PathLike>("node:path");
  const env = typeof process !== "undefined" ? process?.env : undefined;
  if (!fs || !path || !env) return;
  const cwd = typeof process?.cwd === "function" ? process.cwd() : ".";
  const envPath = path.resolve(cwd, ".env");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!env[key]) env[key] = value;
  }
}

function getOpenRouterKey(): string | undefined {
  loadEnvFileIfAvailable();
  const key = typeof process !== "undefined" ? process?.env?.OPENROUTER_API_KEY : undefined;
  return key && key.trim() ? key.trim() : undefined;
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

export function buildGoatCoursePlannerPrompt(params: {
  selectedPlace: GoatPlace;
  conditions: CoursePlanningUserConditions;
  candidates: TourApiNearbyCandidate[];
}): string {
  const { selectedPlace, conditions, candidates } = params;
  return `너는 GOAT 강원 여행 추천 서비스의 하루 코스 큐레이터다.

목표:
- 사용자가 1차 추천 카드 3개 중 선택한 기준 장소를 출발점으로 삼는다.
- 한국관광콘텐츠랩 OpenAPI 또는 프론트가 넘긴 주변 후보 중에서 동행자, 무드, 여행 목적, 이동수단에 맞는 장소를 고른다.
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
}`;
}

export async function callOpenRouterCoursePlanner(params: {
  selectedPlace: GoatPlace;
  conditions: CoursePlanningUserConditions;
  candidates: TourApiNearbyCandidate[];
  model?: string;
}): Promise<{ parsed: LlmCoursePlannerJson; rawText: string; model: string }> {
  const apiKey = getOpenRouterKey();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY_MISSING");

  const model = params.model ?? DEFAULT_MODEL;
  const prompt = buildGoatCoursePlannerPrompt(params);
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://goat.local",
      "X-Title": "GOAT Gangwon Course Planner",
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        { role: "system", content: "너는 강원 관광 하루 코스를 JSON으로만 설계하는 추천 큐레이터다." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`OPENROUTER_HTTP_${response.status}:${text.slice(0, 300)}`);
  }

  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const rawText = data.choices?.[0]?.message?.content ?? "";
  if (!rawText.trim()) throw new Error("OPENROUTER_EMPTY_RESPONSE");
  return { parsed: safeJsonParse<LlmCoursePlannerJson>(rawText), rawText, model };
}
