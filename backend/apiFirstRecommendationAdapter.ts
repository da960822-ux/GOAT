/**
 * GOAT API-first quality gate helper v1.3
 *
 * Purpose:
 * - Try real KTO/OpenAPI candidates first.
 * - If API candidates are good enough, return API-derived RecommendationCard items.
 * - If API candidates are weak, use GOAT 58 seed recommendation fallback.
 *
 * This file is intentionally dependency-light. The actual API fetch function should be
 * implemented by backend/Edge Function code and injected into this adapter.
 */

import {
  getGoatRecommendations,
  type GoatPlace,
  type RecommendationInput,
  type RecommendationApiResponse,
  type RecommendationCard
} from "./recommendationEngine.ts";

export type DataSourceMode = "api-first" | "seed-first" | "seed-only";
export type DataSourceUsed = "api" | "seed-fallback" | "seed" | "mock-fallback";

export type ApiCandidate = {
  title: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  imageUrl?: string | null;
  overview?: string | null;
  keywords?: string[];
  contentId?: string | null;
  contentTypeId?: string | null;
  raw?: unknown;
};

export type ScoredApiCandidate = ApiCandidate & {
  score: number;
  matchedTags: string[];
  scoreBreakdown: Record<string, number>;
};

export type ApiQualityReport = {
  passed: boolean;
  reason: string;
  candidateCount: number;
  topScore: number;
  top3AverageScore: number;
  hasEnoughDisplayData: boolean;
  fallbackReason: null | "API_ERROR" | "API_CANDIDATES_TOO_FEW" | "API_SCORE_TOO_LOW" | "API_DISPLAY_DATA_TOO_WEAK";
};

const DIRECT_MATCH_SCORE = 15;
const TEXT_MATCH_SCORE = 8;
const GANGWON_SCORE = 10;
const IMAGE_SCORE = 5;
const ADDRESS_OR_COORD_SCORE = 5;

const CARD_TYPES = ["SCENE_BEST", "SAME_MOOD_ALTERNATIVE", "CONDITION_FIT"] as const;
const CARD_LABELS: Record<(typeof CARD_TYPES)[number], string> = {
  SCENE_BEST: "장면 최적",
  SAME_MOOD_ALTERNATIVE: "같은 분위기 대안",
  CONDITION_FIT: "조건 맞춤"
};

const CITY_TO_REGION_GROUP: Record<string, string> = {
  춘천시: "영서권",
  원주시: "영서권",
  홍천군: "영서권",
  인제군: "북부내륙권",
  양구군: "북부내륙권",
  화천군: "북부내륙권",
  철원군: "북부내륙권",
  평창군: "고원권",
  정선군: "고원권",
  태백시: "고원권",
  횡성군: "고원권",
  영월군: "고원권",
  강릉시: "동해안권",
  동해시: "동해안권",
  속초시: "동해안권",
  양양군: "동해안권",
  고성군: "동해안권",
  삼척시: "동해안권"
};

const GANGWON_CITY_NAMES = Object.keys(CITY_TO_REGION_GROUP);

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeId(value: string): string {
  return value
    .replace(/[^0-9A-Za-z가-힣_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function getInputTags(input: RecommendationInput): string[] {
  return unique([
    ...(input.extractedTags ?? []),
    ...(input.moodTags ?? []),
    ...(input.sceneTags ?? []),
    input.preferredSeason ?? "",
    input.preferredTime ?? "",
    input.regionGroup ?? "",
    input.weatherTag ?? "",
    input.companionType ?? "",
    ...(Array.isArray(input.travelPurpose) ? input.travelPurpose : [input.travelPurpose ?? ""]),
    input.transportType ?? ""
  ]);
}

export function buildApiSearchKeywords(input: RecommendationInput): string[] {
  const tags = getInputTags(input);
  const joined = tags.join(" ");

  const keywords: string[] = [];

  if (/해안도로|로드트립|캘리포니아|바다/.test(joined)) {
    keywords.push("강원 해안도로", "강릉 헌화로", "양양 서피비치", "속초 외옹치");
  }
  if (/일본|일본감성|철길|가마쿠라|골목/.test(joined)) {
    keywords.push("정동진 철길", "동해 어달", "강릉 교동");
  }
  if (/알프스|목장|초원|양떼/.test(joined)) {
    keywords.push("대관령 양떼목장", "하늘목장", "삼양라운드힐");
  }
  if (/료칸|숙소|자쿠지|히노끼/.test(joined)) {
    keywords.push("강원 료칸", "강릉 풀빌라", "춘천 자쿠지 숙소");
  }
  if (/협곡|주상절리|잔도|스카이워크/.test(joined)) {
    keywords.push("한탄강 주상절리길", "소금산 그랜드밸리", "초곡용굴촛대바위길");
  }

  // Generic fallback keywords from tags. Keep them Gangwon-scoped.
  tags.slice(0, 5).forEach((tag) => keywords.push(`강원 ${tag}`));

  return unique(keywords).slice(0, 10);
}

function includesAny(text: string, tags: string[]): string[] {
  return tags.filter((tag) => tag && text.includes(tag));
}

function looksGangwon(candidate: ApiCandidate): boolean {
  const text = `${candidate.title} ${candidate.address ?? ""}`;
  return /강원|강릉|속초|양양|동해|삼척|춘천|원주|평창|정선|태백|횡성|인제|양구|고성|홍천|철원|화천|영월/.test(text);
}

function inferCity(candidate: ApiCandidate): string {
  const text = `${candidate.address ?? ""} ${candidate.title ?? ""}`;
  return GANGWON_CITY_NAMES.find((city) => text.includes(city)) ?? "강원도";
}

function inferRegionGroup(candidate: ApiCandidate, input: RecommendationInput): string {
  const city = inferCity(candidate);
  return CITY_TO_REGION_GROUP[city] ?? input.regionGroup ?? "강원권";
}

function inferPlaceType(candidate: ApiCandidate, input: RecommendationInput): string {
  const text = `${candidate.title ?? ""} ${candidate.overview ?? ""} ${(candidate.keywords ?? []).join(" ")} ${getInputTags(input).join(" ")}`;
  if (/해변|바다|해안|서핑|오션/.test(text)) return "해변/해안";
  if (/목장|초원|고원|양떼/.test(text)) return "목장/고원";
  if (/숲|자작나무|수목원|정원/.test(text)) return "숲/정원";
  if (/시장|항구|먹거리/.test(text)) return "시장/항구";
  if (/철길|골목|마을|거리/.test(text)) return "골목/거리";
  if (/협곡|주상절리|잔도|스카이워크|출렁다리/.test(text)) return "협곡/트레일";
  if (/숙소|리조트|풀빌라|료칸|호텔|펜션/.test(text)) return "숙소/리조트";
  if (candidate.contentTypeId === "12") return "관광지";
  if (candidate.contentTypeId === "14") return "문화시설";
  if (candidate.contentTypeId === "28") return "레포츠";
  if (candidate.contentTypeId === "32") return "숙박";
  if (candidate.contentTypeId === "38") return "쇼핑";
  if (candidate.contentTypeId === "39") return "음식점";
  return "관광지";
}

function buildApiPlaceId(candidate: ApiCandidate, rank: number): string {
  if (candidate.contentId) return `API-${candidate.contentId}`;
  return `API-${rank}-${normalizeId(candidate.title || "candidate")}`;
}

function clampScore(score: number): number {
  return Number(Math.min(98, Math.max(0, score)).toFixed(1));
}

function apiSafetyNotes(candidate: ApiCandidate): string[] {
  const text = `${candidate.title ?? ""} ${candidate.address ?? ""} ${candidate.overview ?? ""}`;
  const notes: string[] = [];
  if (/도로|차도|드라이브/.test(text)) notes.push("도로 촬영·정차 안전 주의");
  if (/해변|해안|파도|방파제|절벽/.test(text)) notes.push("해안 안전 주의");
  if (/산|숲|입산|트레킹|등산/.test(text)) notes.push("기상·탐방로 상태 확인 필요");
  if (/운영|통제|휴무/.test(text)) notes.push("운영·통제 여부 확인 필요");
  return unique(notes).slice(0, 3);
}

function apiReason(candidate: ScoredApiCandidate, input: RecommendationInput): string {
  const matched = candidate.matchedTags.length ? candidate.matchedTags.slice(0, 3).join(", ") : getInputTags(input).slice(0, 3).join(", ");
  const displayData = candidate.imageUrl || candidate.address || candidate.latitude || candidate.longitude
    ? "카드 표시와 지도 연결에 필요한 정보도 일부 확보되었습니다."
    : "다만 이미지·좌표·주소 보강이 필요합니다.";
  return `OpenAPI 후보 중 선택한 조건과 ${matched || "입력 태그"} 기준으로 가장 유사도가 높습니다. ${displayData}`;
}

function toApiRecommendationCard(candidate: ScoredApiCandidate, rank: number, input: RecommendationInput): RecommendationCard {
  const cardType = CARD_TYPES[Math.min(rank - 1, CARD_TYPES.length - 1)];
  const city = inferCity(candidate);
  const mapSearchQuery = candidate.address ? `${candidate.address} ${candidate.title}` : `${city} ${candidate.title}`;

  return {
    rank,
    cardType,
    cardLabel: CARD_LABELS[cardType],
    placeId: buildApiPlaceId(candidate, rank),
    name: candidate.title,
    city,
    regionGroup: inferRegionGroup(candidate, input),
    placeType: inferPlaceType(candidate, input),
    primaryMood: candidate.matchedTags.slice(0, 2).join("·") || getInputTags(input).slice(0, 2).join("·") || "OpenAPI 추천 후보",
    dataStatus: "api_candidate",
    dataStatusLabel: "OpenAPI 후보",
    score: clampScore(candidate.score),
    matchedTags: unique(candidate.matchedTags),
    scoreBreakdown: candidate.scoreBreakdown,
    reason: apiReason(candidate, input),
    photoPoint: normalizeText(candidate.overview).slice(0, 80) || null,
    bestTime: input.preferredTime ?? null,
    bestSeason: input.preferredSeason ?? null,
    weatherFit: "API 후보 기준 보통",
    crowdLevel: "방문 집중률 별도 확인 필요",
    safetyNotes: apiSafetyNotes(candidate),
    parkingInfo: "관광정보 상세 확인 필요",
    accessibility: candidate.address ?? null,
    imageUrl: candidate.imageUrl ?? null,
    mapSearchQuery
  };
}

export function scoreApiCandidate(candidate: ApiCandidate, input: RecommendationInput): ScoredApiCandidate {
  const tags = getInputTags(input);
  const title = candidate.title ?? "";
  const body = `${candidate.address ?? ""} ${candidate.overview ?? ""} ${(candidate.keywords ?? []).join(" ")}`;

  const directMatches = includesAny(title, tags);
  const textMatches = includesAny(body, tags);
  const matchedTags = unique([...directMatches, ...textMatches]);

  const scoreBreakdown: Record<string, number> = {
    directTitleMatch: directMatches.length * DIRECT_MATCH_SCORE,
    textMatch: textMatches.length * TEXT_MATCH_SCORE,
    gangwon: looksGangwon(candidate) ? GANGWON_SCORE : 0,
    image: candidate.imageUrl ? IMAGE_SCORE : 0,
    addressOrCoord: candidate.address || candidate.latitude || candidate.longitude ? ADDRESS_OR_COORD_SCORE : 0
  };

  const irrelevantPenalty = /맛집|식당|펜션|모텔|축제/.test(title) && !/숙소|료칸|축제/.test(tags.join(" ")) ? -15 : 0;
  if (irrelevantPenalty) scoreBreakdown.irrelevantPenalty = irrelevantPenalty;

  const score = Object.values(scoreBreakdown).reduce((sum, value) => sum + value, 0);
  return { ...candidate, score, matchedTags, scoreBreakdown };
}

export function evaluateApiCandidates(candidates: ApiCandidate[], input: RecommendationInput): {
  scored: ScoredApiCandidate[];
  quality: ApiQualityReport;
} {
  const scored = candidates
    .map((candidate) => scoreApiCandidate(candidate, input))
    .sort((a, b) => b.score - a.score);

  const top3 = scored.slice(0, input.limit ?? 3);
  const topScore = top3[0]?.score ?? 0;
  const top3AverageScore = top3.length
    ? Number((top3.reduce((sum, item) => sum + item.score, 0) / top3.length).toFixed(1))
    : 0;
  const displayReadyCount = top3.filter((item) => item.imageUrl || item.address || item.latitude || item.longitude).length;
  const hasEnoughDisplayData = displayReadyCount >= Math.min(2, top3.length);

  let fallbackReason: ApiQualityReport["fallbackReason"] = null;
  if (scored.length < 3) fallbackReason = "API_CANDIDATES_TOO_FEW";
  else if (topScore < 35 || top3AverageScore < 25) fallbackReason = "API_SCORE_TOO_LOW";
  else if (!hasEnoughDisplayData) fallbackReason = "API_DISPLAY_DATA_TOO_WEAK";

  const passed = fallbackReason === null;
  return {
    scored,
    quality: {
      passed,
      reason: passed
        ? "API 후보 품질 기준을 통과했습니다. API 후보를 추천 카드로 반환합니다."
        : `API 후보 품질이 낮아 fallback이 필요합니다: ${fallbackReason}`,
      candidateCount: scored.length,
      topScore,
      top3AverageScore,
      hasEnoughDisplayData,
      fallbackReason
    }
  };
}

export function shouldUseSeedFallback(quality: ApiQualityReport): boolean {
  return !quality.passed;
}

export type ApiFirstRecommendationResult = RecommendationApiResponse & {
  resultData: (NonNullable<RecommendationApiResponse["resultData"]> & {
    dataSourceRequested?: DataSourceMode;
    dataSourceUsed?: DataSourceUsed;
    apiQuality?: ApiQualityReport;
  }) | null;
};

function buildApiRecommendationResponse(params: {
  input: RecommendationInput;
  seedPlaces: GoatPlace[];
  scored: ScoredApiCandidate[];
  quality: ApiQualityReport;
  dataSourceRequested: DataSourceMode;
}): ApiFirstRecommendationResult {
  const { input, seedPlaces, scored, quality, dataSourceRequested } = params;
  const limit = input.limit ?? 3;
  const recommendations = scored.slice(0, limit).map((candidate, index) => toApiRecommendationCard(candidate, index + 1, input));
  const averageScore = recommendations.reduce((sum, card) => sum + card.score, 0) / Math.max(1, recommendations.length);

  return {
    status: "DONE",
    resultType: "RECOMMEND",
    score: Number(averageScore.toFixed(1)),
    message: `OpenAPI 후보 ${quality.candidateCount}개 중 ${recommendations.length}개 추천 카드 생성이 완료되었습니다.`,
    failReason: null,
    resultData: {
      requestId: input.requestId ?? "demo-request-001",
      inputTags: getInputTags(input),
      seedPoolSize: seedPlaces.length,
      candidatePoolSize: scored.length,
      poolPolicy: "ALL58",
      poolReason: "OpenAPI 후보 품질 기준을 통과해 API 후보를 우선 사용했습니다. seed pool은 fallback/비교용으로만 유지합니다.",
      fallbackUsed: false,
      adaptivePoolRetryUsed: false,
      recommendations,
      dataSourceRequested,
      dataSourceUsed: "api",
      apiQuality: quality
    }
  };
}

export function recommendWithApiFallback(params: {
  input: RecommendationInput & { dataSourceMode?: DataSourceMode };
  apiCandidates: ApiCandidate[];
  seedPlaces: GoatPlace[];
}): ApiFirstRecommendationResult {
  const { input, apiCandidates, seedPlaces } = params;
  const dataSourceRequested = input.dataSourceMode ?? "api-first";

  if (dataSourceRequested === "seed-only" || dataSourceRequested === "seed-first") {
    const seedResponse = getGoatRecommendations(input, seedPlaces) as ApiFirstRecommendationResult;
    if (seedResponse.resultData) {
      seedResponse.resultData.dataSourceRequested = dataSourceRequested;
      seedResponse.resultData.dataSourceUsed = "seed";
    }
    return seedResponse;
  }

  const { scored, quality } = evaluateApiCandidates(apiCandidates, input);

  if (!shouldUseSeedFallback(quality)) {
    return buildApiRecommendationResponse({
      input,
      seedPlaces,
      scored,
      quality,
      dataSourceRequested
    });
  }

  const fallbackResponse = getGoatRecommendations(input, seedPlaces) as ApiFirstRecommendationResult;
  if (fallbackResponse.resultData) {
    fallbackResponse.resultData.dataSourceRequested = dataSourceRequested;
    fallbackResponse.resultData.dataSourceUsed = "seed-fallback";
    fallbackResponse.resultData.apiQuality = quality;
  }
  return fallbackResponse;
}
