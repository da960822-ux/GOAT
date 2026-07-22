import {
  AccessGrade,
  CandidateScore,
  ConditionScoreBreakdown,
  GoatPlace,
  GoatPlaceDataset,
  GoatReferenceCard,
  GoatReferenceCardDataset,
  MoodScoreBreakdown,
  NormalizedRequest,
  RecommendRequest,
  RecommendResult,
  RecommendationCard,
  RecommendationWarning,
  RecommendationDecisionAudit,
  RecommendationCardSelectionAudit,
  RecommendationCardRole,
  ScoreBreakdown,
  SeasonTag,
  TransportType,
} from "./goatRecommendationTypes";
import { getAccessibilityRecommendationScore } from "./accessibilityScoringPolicy";

export const RECOMMENDATION_POLICY_VERSION = "goat-score-v2" as const;

const MAX_SWAP_GAP = 8;
const CARD_LIMIT = 3;

const WALK_HIGH_HINTS = [
  "산책로",
  "해안산책로",
  "해안데크길",
  "해안 트레일",
  "골목",
  "소품샵",
  "서점",
  "시장",
  "항구",
  "카페거리",
  "정원",
  "호수",
  "해변",
  "벽화마을",
];
const WALK_MID_HINTS = ["목장", "초원", "미술관", "테마파크", "리조트", "랜드마크", "전망대", "숲"];
const WALK_LOW_HINTS = ["고원", "목장", "산악", "산/억새", "산/설경", "풍력발전"];
const WALK_MID_CAP_HINTS = ["숙소", "리조트", "협곡", "절벽", "출렁다리", "잔도"];

function uniq(values: Array<string | undefined | null>): string[] {
  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hasValidNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function getLatLng(place: GoatPlace): { lat: number; lng: number } | null {
  const lat = toNumber(place.latitude ?? place.lat);
  const lng = toNumber(place.longitude ?? place.lng);
  if (hasValidNumber(lat) && hasValidNumber(lng)) return { lat, lng };
  return null;
}

function haversineKm(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function routeBonusFromKm(km: number | undefined): number {
  if (!hasValidNumber(km) || km < 0) return 0;
  if (km <= 5) return 10;
  if (km <= 10) return 8;
  if (km <= 20) return 6;
  if (km <= 40) return 4;
  if (km <= 70) return 2;
  return 0;
}

/** 사용자에게 체감이 쉬운 실제 예상 이동시간을 연계 거리 점수의 최우선 기준으로 사용한다. */
function routeBonusFromMinutes(minutes: number | undefined): number {
  if (!hasValidNumber(minutes) || minutes < 0) return 0;
  if (minutes <= 10) return 10;
  if (minutes <= 20) return 8;
  if (minutes <= 30) return 6;
  if (minutes <= 45) return 4;
  if (minutes <= 60) return 2;
  return 0;
}

function seasonFromMonth(month?: number): SeasonTag | undefined {
  if (!month || month < 1 || month > 12) return undefined;
  if ([3, 4, 5].includes(month)) return "봄";
  if ([6, 7, 8].includes(month)) return "여름";
  if ([9, 10, 11].includes(month)) return "가을";
  return "겨울";
}

function isValidIsoDate(value?: string): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * 운영기간이 명시된 장소에만 적용하는 점수 계산 전 자격 필터다.
 * 일반 장소에는 operatingCondition이 없으므로 기존 후보 자격과 점수에 영향이 없다.
 */
function isEligibleForOperatingDate(place: GoatPlace, currentDate?: string): boolean {
  const condition = place.operatingCondition;
  if (!condition) return true;
  if (condition.status !== "verified" || condition.type !== "date_ranges") return false;
  if (condition.requiresExactDate && !isValidIsoDate(currentDate)) return false;
  if (!isValidIsoDate(currentDate) || condition.openDateRanges.length === 0) return false;
  return condition.openDateRanges.some(({ startDate, endDate }) => (
    isValidIsoDate(startDate)
    && isValidIsoDate(endDate)
    && startDate <= currentDate
    && currentDate <= endDate
  ));
}

function getOperatingDateExclusionReason(
  place: GoatPlace,
  currentDate?: string,
): "DATE_REQUIRED" | "OUTSIDE_OPEN_RANGE" | "UNVERIFIED_CONDITION" | undefined {
  const condition = place.operatingCondition;
  if (!condition) return undefined;
  if (condition.status !== "verified" || condition.type !== "date_ranges") return "UNVERIFIED_CONDITION";
  if (!isValidIsoDate(currentDate)) return "DATE_REQUIRED";
  return isEligibleForOperatingDate(place, currentDate) ? undefined : "OUTSIDE_OPEN_RANGE";
}

function getAllowedSet(dataset: GoatPlaceDataset, key: string): Set<string> {
  return new Set(dataset.tag_sets?.[key] ?? []);
}

function filterAllowed(values: string[], allowed: Set<string>): string[] {
  if (allowed.size === 0) return uniq(values);
  return uniq(values).filter((value) => allowed.has(value));
}

function intersect(a: string[], b: string[]): string[] {
  const bSet = new Set(b);
  return uniq(a.filter((value) => bSet.has(value)));
}

function containsAnyText(source: string, hints: string[]): string[] {
  return hints.filter((hint) => source.includes(hint));
}

function calculateTagScore(matchCount: number, table: Array<{ min: number; score: number }>): number {
  let score = 0;
  for (const row of table) {
    if (matchCount >= row.min) score = row.score;
  }
  return score;
}

function inferWalkGrade(place: GoatPlace): { grade: AccessGrade; inferred: true; note: string } {
  const source = [place.place_type, ...place.sceneTags, place.photo_point].join(" ");
  if (containsAnyText(source, WALK_LOW_HINTS).length > 0) {
    return { grade: "하", inferred: true, note: "도보중심 접근성은 별도 원천 필드가 없어 고원·목장·산악 지형을 보수적으로 하 등급 추정했습니다." };
  }
  if (containsAnyText(source, WALK_HIGH_HINTS).length > 0) {
    if (containsAnyText(source, WALK_MID_CAP_HINTS).length > 0) {
      return { grade: "중", inferred: true, note: "도보중심 접근성은 별도 원천 필드가 없어 숙소·리조트·협곡·절벽 같은 제약 힌트를 반영해 중 등급으로 제한했습니다." };
    }
    return { grade: "상", inferred: true, note: "도보중심 접근성은 별도 원천 필드가 없어 sceneTags/place_type 기반으로 추정했습니다." };
  }
  if (containsAnyText(source, WALK_MID_HINTS).length > 0) {
    return { grade: "중", inferred: true, note: "도보중심 접근성은 별도 원천 필드가 없어 sceneTags/place_type 기반으로 추정했습니다." };
  }
  return { grade: "하", inferred: true, note: "도보중심 접근성은 별도 원천 필드가 없어 sceneTags/place_type 기반으로 추정했습니다." };
}

function getAccessGrade(place: GoatPlace, transportType?: string): { grade?: string; inferred?: boolean; note?: string } {
  if (!transportType) return {};
  if (transportType === "자차") return { grade: place.accessibility?.car ?? undefined };
  if (transportType === "대중교통") return { grade: place.accessibility?.public_transport ?? undefined };
  if (transportType === "도보중심") {
    const explicitWalkGrade = place.accessibility?.walk;
    if (explicitWalkGrade !== undefined && explicitWalkGrade !== null) {
      return {
        grade: String(explicitWalkGrade),
        inferred: false,
        note: explicitWalkGrade === "상" || explicitWalkGrade === "중" || explicitWalkGrade === "하"
          ? "운영 데이터의 accessibility.walk 등급을 사용했습니다."
          : "운영 데이터의 accessibility.walk 값이 유효하지 않아 접근성 점수는 0점 처리됩니다.",
      };
    }
    return inferWalkGrade(place);
  }
  return {};
}

function calculateMoodScore(place: GoatPlace, request: NormalizedRequest): MoodScoreBreakdown {
  const requestedMoodTags = request.userMoodTags;
  const requestedSceneTags = request.userSceneTags;
  const matchedMoodTags = intersect(requestedMoodTags, place.mood_tags ?? []);
  const matchedSceneTags = intersect(requestedSceneTags, place.sceneTags ?? []);
  const placeTypeSource = [place.place_type, place.photo_point].join(" ");
  const placeTypeHints = requestedSceneTags.filter((tag) => placeTypeSource.includes(tag));

  const themeScore = request.primaryTheme && place.primaryTheme === request.primaryTheme ? 18 : 0;
  const moodTagScore = calculateTagScore(matchedMoodTags.length, [
    { min: 1, score: 6 },
    { min: 2, score: 12 },
    { min: 3, score: 17 },
  ]);
  const sceneTagScore = calculateTagScore(matchedSceneTags.length, [
    { min: 1, score: 5 },
    { min: 2, score: 10 },
  ]);

  // txt 기준상 place_type은 baseScore에 더하지 않고, sceneTags가 부족하거나 동률일 때 쓰는 보조 힌트로 둔다.
  const placeTypeHintScore = Math.min(placeTypeHints.length * 1.5, 3);

  return {
    total: themeScore + moodTagScore + sceneTagScore,
    theme: {
      requested: request.primaryTheme,
      placeTheme: String(place.primaryTheme),
      matched: themeScore > 0,
      score: themeScore,
    },
    moodTags: {
      requested: requestedMoodTags,
      matched: matchedMoodTags,
      count: matchedMoodTags.length,
      score: moodTagScore,
    },
    sceneTags: {
      requested: requestedSceneTags,
      matched: matchedSceneTags,
      count: matchedSceneTags.length,
      score: sceneTagScore,
    },
    placeTypeHint: {
      matchedHints: placeTypeHints,
      score: placeTypeHintScore,
      note: "place_type은 baseScore에 직접 가산하지 않고 동률/보조 비교용으로만 사용합니다.",
    },
  };
}

function calculateConditionScore(place: GoatPlace, request: NormalizedRequest): ConditionScoreBreakdown {
  const purposeMatched = Boolean(request.travelPurpose && place.purpose_tags?.includes(request.travelPurpose));
  const purposeScore = purposeMatched ? 20 : 0;

  const access = getAccessGrade(place, request.transportType);
  const accessScore = getAccessibilityRecommendationScore(access.grade);

  let seasonMatchType: ConditionScoreBreakdown["season"]["matchType"] = "not_requested";
  let seasonScore = 0;
  if (request.currentSeason) {
    if (place.season_tags?.includes(request.currentSeason)) {
      seasonMatchType = "current";
      seasonScore = 13;
    } else if (place.season_tags?.includes("사계절")) {
      seasonMatchType = "all_season";
      seasonScore = 10;
    } else {
      seasonMatchType = "none";
    }
  }

  return {
    total: purposeScore + accessScore + seasonScore,
    purpose: {
      requested: request.travelPurpose,
      placePurposeTags: place.purpose_tags ?? [],
      matched: purposeMatched,
      score: purposeScore,
    },
    accessibility: {
      transportType: request.transportType,
      grade: access.grade,
      score: accessScore,
      inferred: access.inferred,
      note: access.note,
    },
    season: {
      requested: request.currentSeason,
      placeSeasonTags: place.season_tags ?? [],
      matchType: seasonMatchType,
      score: seasonScore,
    },
  };
}

function isRouteDistanceEnabled(request: RecommendRequest): boolean {
  if (typeof request.routeDistanceEnabled === "boolean") return request.routeDistanceEnabled;
  return Boolean(
    request.origin
    && request.origin.type !== "skip"
    && hasValidNumber(toNumber(request.origin.latitude))
    && hasValidNumber(toNumber(request.origin.longitude))
  );
}

function calculateOriginDistance(place: GoatPlace, request: RecommendRequest): {
  distanceKm?: number;
  source: "HAVERSINE" | "NONE";
  bonus: number;
} {
  if (!isRouteDistanceEnabled(request) || !request.origin || request.origin.type === "skip") {
    return { source: "NONE", bonus: 0 };
  }
  const from = {
    lat: toNumber(request.origin.latitude),
    lng: toNumber(request.origin.longitude),
  };
  const to = getLatLng(place);
  if (!hasValidNumber(from.lat) || !hasValidNumber(from.lng) || !to) {
    return { source: "NONE", bonus: 0 };
  }
  const distanceKm = haversineKm({ lat: from.lat, lng: from.lng }, to);
  return {
    distanceKm: Number(distanceKm.toFixed(1)),
    source: "HAVERSINE",
    bonus: routeBonusFromKm(distanceKm),
  };
}

function calculateRouteDistance(
  firstPlace: GoatPlace | undefined,
  place: GoatPlace,
  request: RecommendRequest,
): {
  distanceKm?: number;
  durationMin?: number;
  source: "KAKAO_ROUTE" | "HAVERSINE" | "NONE";
  bonus: number;
} {
  if (!firstPlace || firstPlace.place_id === place.place_id) return { source: "NONE", bonus: 0 };

  const explicitDuration = request.routeDurationMinByPlaceId?.[place.place_id];
  const explicitKm = request.routeDistanceKmByPlaceId?.[place.place_id];
  if (hasValidNumber(explicitDuration) || hasValidNumber(explicitKm)) {
    const source = request.routeSourceByPlaceId?.[place.place_id] ?? "KAKAO_ROUTE";
    return {
      ...(hasValidNumber(explicitKm) ? { distanceKm: Number(explicitKm.toFixed(1)) } : {}),
      ...(hasValidNumber(explicitDuration) ? { durationMin: Math.max(1, Math.round(explicitDuration)) } : {}),
      source,
      bonus: hasValidNumber(explicitDuration)
        ? routeBonusFromMinutes(explicitDuration)
        : routeBonusFromKm(explicitKm),
    };
  }

  const from = getLatLng(firstPlace);
  const to = getLatLng(place);
  if (!from || !to) return { source: "NONE", bonus: 0 };
  const distanceKm = haversineKm(from, to);
  return {
    distanceKm: Number(distanceKm.toFixed(1)),
    source: "HAVERSINE",
    bonus: routeBonusFromKm(distanceKm),
  };
}

function sceneSimilarity(a: GoatPlace, b: GoatPlace): number {
  const aTags = new Set(a.sceneTags ?? []);
  const bTags = new Set(b.sceneTags ?? []);
  const union = new Set([...aTags, ...bTags]);
  if (union.size === 0) return 0;
  let same = 0;
  for (const tag of aTags) if (bTags.has(tag)) same += 1;
  return same / union.size;
}

function duplicatePenalty(firstPlace: GoatPlace | undefined, place: GoatPlace, cardRole: RecommendationCardRole): number {
  if (!firstPlace || cardRole !== "SAME_MOOD_ALTERNATIVE") return 0;
  const similarity = sceneSimilarity(firstPlace, place);
  const samePlaceType = firstPlace.place_type === place.place_type;
  if (samePlaceType && similarity >= 0.66) return 6;
  if (similarity >= 0.66) return 5;
  if (samePlaceType) return 3;
  return 0;
}

function exposurePenalty(place: GoatPlace, request: RecommendRequest): number {
  const recent = request.recentExposureByPlaceId?.[place.place_id] ?? 0;
  return Math.min(Math.max(0, recent), 5);
}

function lowExposureBoost(place: GoatPlace, places: GoatPlace[], request: RecommendRequest): number {
  const totalByPlaceId = request.totalExposureByPlaceId;
  if (!totalByPlaceId) return 0;
  const current = totalByPlaceId[place.place_id] ?? 0;
  const themeAvg = request.themeAverageExposure?.[String(place.primaryTheme)];
  const fallbackValues = places.map((p) => totalByPlaceId[p.place_id] ?? 0);
  const fallbackAvg = fallbackValues.length > 0 ? fallbackValues.reduce((sum, value) => sum + value, 0) / fallbackValues.length : 0;
  const avg = hasValidNumber(themeAvg) ? themeAvg : fallbackAvg;
  if (avg <= 0) return 0;
  if (current <= avg * 0.25) return 3;
  if (current <= avg * 0.5) return 2;
  if (current < avg) return 1;
  return 0;
}

function coverageBoost(place: GoatPlace, request: NormalizedRequest): number {
  return request.referenceCard?.coveragePlaceIds?.includes(place.place_id) ? 3 : 0;
}

function scoreCandidate(params: {
  place: GoatPlace;
  request: NormalizedRequest;
  rawRequest: RecommendRequest;
  places: GoatPlace[];
  firstPlace?: GoatPlace;
  role: RecommendationCardRole;
  applyOriginDistanceBonus: boolean;
  applyRouteBonus: boolean;
  applyExposureCorrection: boolean;
  applyCoverageBoost: boolean;
}): CandidateScore {
  const moodScore = calculateMoodScore(params.place, params.request);
  const conditionScore = calculateConditionScore(params.place, params.request);
  const baseScore = moodScore.total + conditionScore.total;
  const originDistance = params.applyOriginDistanceBonus
    ? calculateOriginDistance(params.place, params.rawRequest)
    : { source: "NONE" as const, bonus: 0 };
  const originDistanceBonus = originDistance.bonus;
  const routeDistance = params.applyRouteBonus && isRouteDistanceEnabled(params.rawRequest)
    ? calculateRouteDistance(params.firstPlace, params.place, params.rawRequest)
    : { source: "NONE" as const, bonus: 0 };
  const routeDistanceBonus = routeDistance.bonus;
  const dupPenalty = duplicatePenalty(params.firstPlace, params.place, params.role);
  const expPenalty = params.applyExposureCorrection ? exposurePenalty(params.place, params.rawRequest) : 0;
  const covBoost = params.applyCoverageBoost ? coverageBoost(params.place, params.request) : 0;
  const lowBoost = params.applyExposureCorrection ? lowExposureBoost(params.place, params.places, params.rawRequest) : 0;
  // 카드 1은 거리 보정을 받지 않는다. 카드 2·3은 출발지 근접성과 카드 1 기준 연계 거리를 서로 다른 항목으로 반영한다.
  const selectionScore = baseScore + originDistanceBonus + routeDistanceBonus - dupPenalty - expPenalty + covBoost + lowBoost;
  const displayScore = clamp(baseScore + originDistanceBonus + routeDistanceBonus - dupPenalty, 0, 100);
  const score: ScoreBreakdown = {
    moodScore,
    conditionScore,
    baseScore,
    originDistanceKm: originDistance.distanceKm,
    originDistanceSource: originDistance.source,
    originDistanceBonus,
    routeDistanceKm: routeDistance.distanceKm,
    routeDurationMin: routeDistance.durationMin,
    routeDistanceSource: routeDistance.source,
    routeDistanceBonus,
    duplicatePenalty: dupPenalty,
    exposurePenalty: expPenalty,
    coverageBoost: covBoost,
    lowExposureBoost: lowBoost,
    selectionScore: Number(selectionScore.toFixed(2)),
    displayScore: Number(displayScore.toFixed(2)),
  };

  return {
    place: params.place,
    score,
    reasons: buildReasons(params.place, score, params.request),
    cautions: buildCautions(params.place, score),
  };
}

function buildReasons(place: GoatPlace, score: ScoreBreakdown, request: NormalizedRequest): string[] {
  const reasons: string[] = [];
  if (score.moodScore.theme.matched) reasons.push(`선택한 테마(${request.primaryTheme})와 장소 테마가 일치합니다.`);
  if (score.moodScore.moodTags.count > 0) reasons.push(`무드 태그 ${score.moodScore.moodTags.matched.join(", ")}가 맞습니다.`);
  if (score.moodScore.sceneTags.count > 0) reasons.push(`장면 태그 ${score.moodScore.sceneTags.matched.join(", ")}가 맞습니다.`);
  if (score.conditionScore.purpose.matched) reasons.push(`여행 목적(${request.travelPurpose})과 장소 목적 태그가 일치합니다.`);
  if (score.conditionScore.accessibility.score > 0) {
    reasons.push(`${request.transportType} 접근성이 ${score.conditionScore.accessibility.grade} 등급입니다.`);
  }
  if (score.conditionScore.season.matchType === "current") reasons.push(`현재 계절(${request.currentSeason})에 적합한 장소입니다.`);
  if (score.conditionScore.season.matchType === "all_season") reasons.push("사계절 방문 가능한 장소입니다.");
  if (score.originDistanceBonus > 0) {
    reasons.push(`선택한 출발지에서 약 ${Math.round(score.originDistanceKm ?? 0)}km 거리여서 출발지 근접 보너스 ${score.originDistanceBonus}점이 반영됐습니다.`);
  }
  if (score.routeDistanceBonus > 0) {
    const routeText = typeof score.routeDurationMin === "number"
      ? `예상 ${score.routeDurationMin}분`
      : typeof score.routeDistanceKm === "number"
        ? `약 ${Math.round(score.routeDistanceKm)}km`
        : "가까운 거리";
    reasons.push(`1번 카드에서 ${routeText} 거리여서 연계 동선 보너스 ${score.routeDistanceBonus}점이 반영됐습니다.`);
  }
  if (reasons.length === 0) reasons.push(`${place.photo_point} 중심으로 비교 가능한 후보입니다.`);
  return reasons.slice(0, 5);
}

function buildCautions(place: GoatPlace, score: ScoreBreakdown): string[] {
  const cautions: string[] = [];
  const note = String(place.note ?? "");
  const riskWords = ["통제", "위험", "안전", "도로", "기상", "운영", "입장권", "확인", "주의"];
  if (riskWords.some((word) => note.includes(word))) cautions.push(note);
  if (score.conditionScore.accessibility.transportType === "도보중심" && score.conditionScore.accessibility.inferred) {
    cautions.push("도보중심 접근성은 별도 원천 데이터가 없어 장면/장소유형 기반 추정값입니다.");
  }
  if (score.routeDistanceSource === "NONE") {
    cautions.push("연계 거리 정보를 확인하지 못한 경우 거리 보너스는 0점 처리됩니다.");
  }
  return uniq(cautions).slice(0, 3);
}

function toRecommendationCard(candidate: CandidateScore, rank: 1 | 2 | 3, role: RecommendationCardRole): RecommendationCard {
  const labels: Record<RecommendationCardRole, string> = {
    BEST_SCENE: "최적 장면 카드",
    SAME_MOOD_ALTERNATIVE: "같은 무드 대안 카드",
    CONDITION_FIT_ALTERNATIVE: "조건 맞춤 카드",
  };
  return {
    rank,
    role,
    roleLabel: labels[role],
    placeId: candidate.place.place_id,
    placeName: candidate.place.place_name,
    city: candidate.place.city,
    regionGroup: candidate.place.region_group,
    primaryTheme: String(candidate.place.primaryTheme),
    placeType: candidate.place.place_type,
    photoPoint: candidate.place.photo_point,
    recommendationUse: candidate.place.recommendation_use,
    bestTime: String(candidate.place.best_time),
    seasonTags: candidate.place.season_tags ?? [],
    purposeTags: candidate.place.purpose_tags ?? [],
    accessibility: candidate.place.accessibility,
    note: candidate.place.note,
    imageUrl: candidate.place.imageUrl ?? null,
    address: candidate.place.address ?? null,
    score: candidate.score,
    reasons: candidate.reasons,
    cautions: candidate.cautions,
  };
}

function toScoreSummary(score: ScoreBreakdown): RecommendationCardSelectionAudit["scoreSummary"] {
  return {
    moodScore: Number(score.moodScore.total.toFixed(2)),
    conditionScore: Number(score.conditionScore.total.toFixed(2)),
    baseScore: Number(score.baseScore.toFixed(2)),
    originDistanceBonus: Number(score.originDistanceBonus.toFixed(2)),
    routeDistanceBonus: Number(score.routeDistanceBonus.toFixed(2)),
    duplicatePenalty: Number(score.duplicatePenalty.toFixed(2)),
    exposurePenalty: Number(score.exposurePenalty.toFixed(2)),
    coverageBoost: Number(score.coverageBoost.toFixed(2)),
    lowExposureBoost: Number(score.lowExposureBoost.toFixed(2)),
    selectionScore: Number(score.selectionScore.toFixed(2)),
    displayScore: Number(score.displayScore.toFixed(2)),
  };
}

function toScoreDetails(score: ScoreBreakdown): RecommendationCardSelectionAudit["scoreDetails"] {
  return {
    theme: score.moodScore.theme,
    moodTags: score.moodScore.moodTags,
    sceneTags: score.moodScore.sceneTags,
    purpose: score.conditionScore.purpose,
    accessibility: score.conditionScore.accessibility,
    season: score.conditionScore.season,
  };
}

function labelForRole(role: RecommendationCardRole): string {
  const labels: Record<RecommendationCardRole, string> = {
    BEST_SCENE: "최적 장면 카드",
    SAME_MOOD_ALTERNATIVE: "같은 무드 대안 카드",
    CONDITION_FIT_ALTERNATIVE: "조건 맞춤 카드",
  };
  return labels[role];
}

function buildSelectionAudit(params: {
  candidate: CandidateScore;
  rank: 1 | 2 | 3;
  role: RecommendationCardRole;
  whySelected: string;
  candidatePool: RecommendationCardSelectionAudit["candidatePool"];
}): RecommendationCardSelectionAudit {
  return {
    rank: params.rank,
    role: params.role,
    roleLabel: labelForRole(params.role),
    placeId: params.candidate.place.place_id,
    placeName: params.candidate.place.place_name,
    whySelected: params.whySelected,
    candidatePool: params.candidatePool,
    scoreSummary: toScoreSummary(params.candidate.score),
    scoreDetails: toScoreDetails(params.candidate.score),
    reasons: params.candidate.reasons,
    cautions: params.candidate.cautions,
  };
}

function buildCard3FallbackReason(request: NormalizedRequest): string {
  return `travelPurpose(${request.travelPurpose})와 purpose_tags가 일치하는 카드3 조건맞춤 후보가 0개라서 카드 3개 보장을 위해 전체 후보로 fallback했습니다.`;
}

function sortCandidates(candidates: CandidateScore[]): CandidateScore[] {
  return [...candidates].sort((a, b) => {
    const bySelection = b.score.selectionScore - a.score.selectionScore;
    if (bySelection !== 0) return bySelection;
    const byBase = b.score.baseScore - a.score.baseScore;
    if (byBase !== 0) return byBase;
    const byCondition = b.score.conditionScore.total - a.score.conditionScore.total;
    if (byCondition !== 0) return byCondition;
    const byPlaceTypeHint = b.score.moodScore.placeTypeHint.score - a.score.moodScore.placeTypeHint.score;
    if (byPlaceTypeHint !== 0) return byPlaceTypeHint;
    return a.place.place_id.localeCompare(b.place.place_id);
  });
}

function chooseWithinSwapGap(candidates: CandidateScore[], prefer: (candidate: CandidateScore) => number): CandidateScore | undefined {
  const sorted = sortCandidates(candidates);
  const top = sorted[0];
  if (!top) return undefined;
  const swappable = sorted.filter((candidate) => top.score.selectionScore - candidate.score.selectionScore <= MAX_SWAP_GAP);
  return [...swappable].sort((a, b) => {
    const byPrefer = prefer(b) - prefer(a);
    if (byPrefer !== 0) return byPrefer;
    return b.score.selectionScore - a.score.selectionScore;
  })[0];
}

function normalizeRequest(
  rawRequest: RecommendRequest,
  placesDataset: GoatPlaceDataset,
  referenceDataset?: GoatReferenceCardDataset,
): { request: NormalizedRequest; warnings: RecommendationWarning[] } {
  const warnings: RecommendationWarning[] = [];
  const referenceCard = rawRequest.referenceCardId
    ? referenceDataset?.reference_cards.find((card) => card.referenceCardId === rawRequest.referenceCardId && card.isActive !== false)
    : undefined;

  if (rawRequest.referenceCardId && !referenceCard) {
    warnings.push({
      code: "REFERENCE_CARD_NOT_FOUND",
      message: `referenceCardId ${rawRequest.referenceCardId}를 찾지 못해 직접 입력값 기준으로 추천합니다.`,
      details: { referenceCardId: rawRequest.referenceCardId },
    });
  }

  const moodAllowed = getAllowedSet(placesDataset, "mood_tags");
  const sceneAllowed = getAllowedSet(placesDataset, "sceneTags");
  const purposeAllowed = getAllowedSet(placesDataset, "purpose_tags");
  const themeAllowed = getAllowedSet(placesDataset, "primaryTheme");
  const transportAllowed = getAllowedSet(placesDataset, "transportType");
  const seasonAllowed = getAllowedSet(placesDataset, "season_tags");

  const primaryTheme = rawRequest.primaryTheme ?? referenceCard?.primaryTheme;
  const validPrimaryTheme = primaryTheme && (themeAllowed.size === 0 || themeAllowed.has(String(primaryTheme))) ? String(primaryTheme) : undefined;
  if (primaryTheme && !validPrimaryTheme) warnings.push({
    code: "INVALID_PRIMARY_THEME",
    message: `허용되지 않은 primaryTheme(${primaryTheme})는 점수 계산에서 제외했습니다.`,
    details: { primaryTheme },
  });

  const userMoodTags = filterAllowed([...(rawRequest.userMoodTags ?? []), ...(referenceCard?.mood_tags ?? [])], moodAllowed);
  const userSceneTags = filterAllowed([...(rawRequest.userSceneTags ?? []), ...(referenceCard?.sceneTags ?? [])], sceneAllowed);

  const travelPurpose = rawRequest.travelPurpose && (purposeAllowed.size === 0 || purposeAllowed.has(rawRequest.travelPurpose))
    ? rawRequest.travelPurpose
    : referenceCard?.recommendedPurpose?.find((purpose) => purposeAllowed.size === 0 || purposeAllowed.has(purpose));
  if (rawRequest.travelPurpose && travelPurpose !== rawRequest.travelPurpose) warnings.push({
    code: "INVALID_TRAVEL_PURPOSE",
    message: `허용되지 않은 travelPurpose(${rawRequest.travelPurpose})는 제외했습니다.`,
    details: { travelPurpose: rawRequest.travelPurpose },
  });

  const transportType = rawRequest.transportType && (transportAllowed.size === 0 || transportAllowed.has(rawRequest.transportType))
    ? rawRequest.transportType
    : referenceCard?.recommendedTransport?.find((transport) => transportAllowed.size === 0 || transportAllowed.has(transport));
  if (rawRequest.transportType && transportType !== rawRequest.transportType) warnings.push({
    code: "INVALID_TRANSPORT_TYPE",
    message: `허용되지 않은 transportType(${rawRequest.transportType})는 제외했습니다.`,
    details: { transportType: rawRequest.transportType },
  });

  // visitTime/best_time은 더 이상 점수 계산에 사용하지 않습니다. 과거 프론트 요청 호환을 위해 rawRequest.visitTime은 무시합니다.

  const computedSeason = rawRequest.currentSeason ?? seasonFromMonth(rawRequest.currentMonth);
  const currentSeason = computedSeason && (seasonAllowed.size === 0 || seasonAllowed.has(String(computedSeason))) ? String(computedSeason) : undefined;
  if (computedSeason && !currentSeason) warnings.push({
    code: "INVALID_CURRENT_SEASON",
    message: `허용되지 않은 currentSeason(${computedSeason})은 제외했습니다.`,
    details: { currentSeason: computedSeason },
  });

  const candidatePlaceIds = uniq([
    ...(rawRequest.candidatePlaceIds ?? []),
    ...(referenceCard?.candidatePlaceIds ?? []),
  ]);

  return {
    request: {
      referenceCard,
      primaryTheme: validPrimaryTheme,
      userMoodTags,
      userSceneTags,
      travelPurpose,
      transportType,
      currentSeason,
      candidatePlaceIds,
      excludePlaceIds: uniq(rawRequest.excludePlaceIds ?? []),
    },
    warnings,
  };
}

function expandCandidatePool(places: GoatPlace[], request: NormalizedRequest): GoatPlace[] {
  const byId = new Map(places.map((place) => [place.place_id, place]));
  const explicitPool = request.candidatePlaceIds.map((id) => byId.get(id)).filter((place): place is GoatPlace => Boolean(place));
  const excluded = new Set(request.excludePlaceIds);

  let pool = explicitPool.length >= CARD_LIMIT ? explicitPool : [];
  if (pool.length < CARD_LIMIT && request.primaryTheme) {
    const sameTheme = places.filter((place) => place.primaryTheme === request.primaryTheme);
    pool = uniq([...pool.map((place) => place.place_id), ...sameTheme.map((place) => place.place_id)])
      .map((id) => byId.get(id))
      .filter((place): place is GoatPlace => Boolean(place));
  }
  if (pool.length < CARD_LIMIT) pool = places;
  return pool.filter((place) => !excluded.has(place.place_id));
}

function scorePool(params: {
  pool: GoatPlace[];
  request: NormalizedRequest;
  rawRequest: RecommendRequest;
  places: GoatPlace[];
  firstPlace?: GoatPlace;
  role: RecommendationCardRole;
  applyOriginDistanceBonus: boolean;
  applyRouteBonus: boolean;
  applyExposureCorrection: boolean;
  applyCoverageBoost: boolean;
}): CandidateScore[] {
  return params.pool.map((place) => scoreCandidate({ ...params, place }));
}

function buildAlternatives(
  places: GoatPlace[],
  selectedIds: Set<string>,
  request: NormalizedRequest,
  rawRequest: RecommendRequest,
  firstPlace?: GoatPlace,
): RecommendationCard[] {
  const altPool = places.filter((place) => !selectedIds.has(place.place_id));
  const scored = scorePool({
    pool: altPool,
    request,
    rawRequest,
    places,
    firstPlace,
    role: "CONDITION_FIT_ALTERNATIVE",
    applyOriginDistanceBonus: true,
    applyRouteBonus: Boolean(firstPlace),
    applyExposureCorrection: true,
    applyCoverageBoost: true,
  });
  return sortCandidates(scored)
    .slice(0, 5)
    .map((candidate, index) => toRecommendationCard(candidate, Math.min(index + 1, 3) as 1 | 2 | 3, "CONDITION_FIT_ALTERNATIVE"));
}

export function recommendGoatPlaces(
  rawRequest: RecommendRequest,
  placesDataset: GoatPlaceDataset,
  referenceDataset?: GoatReferenceCardDataset,
): RecommendResult {
  try {
    if (!placesDataset?.places?.length) {
      return {
        status: "FAILED",
        resultType: "UNKNOWN",
        score: null,
        message: "추천 후보 장소 데이터가 비어 있습니다.",
        resultData: null,
        failReason: "EMPTY_PLACE_DATASET",
      };
    }

    const { request, warnings } = normalizeRequest(rawRequest, placesDataset, referenceDataset);
    const operatingDateExcludedPlaces = placesDataset.places.flatMap((place) => {
      const reason = getOperatingDateExclusionReason(place, rawRequest.currentDate);
      return reason ? [{ placeId: place.place_id, placeName: place.place_name, reason }] : [];
    });
    const eligiblePlaces = placesDataset.places.filter((place) => isEligibleForOperatingDate(place, rawRequest.currentDate));
    const candidatePool = expandCandidatePool(eligiblePlaces, request);
    if (candidatePool.length === 0) {
      return {
        status: "FAILED",
        resultType: "UNKNOWN",
        score: null,
        message: "추천 가능한 후보가 없습니다.",
        resultData: null,
        failReason: "NO_CANDIDATE_POOL",
      };
    }

    // 1번 카드: primaryTheme 일치 후보 중 감성/조건 점수가 가장 높은 장소를 선택한다.
    // 출발지 거리·카드 간 연계 거리·노출 보정은 모두 적용하지 않는다.
    const firstPool = request.primaryTheme
      ? candidatePool.filter((place) => place.primaryTheme === request.primaryTheme)
      : candidatePool;
    const safeFirstPool = firstPool.length > 0 ? firstPool : candidatePool;
    const firstPoolName = request.primaryTheme && firstPool.length > 0
      ? "primaryTheme 일치 후보"
      : request.primaryTheme
        ? "primaryTheme 일치 후보 없음 → 전체 후보 fallback"
        : "전체 후보";
    const firstCandidates = scorePool({
      pool: safeFirstPool,
      request,
      rawRequest,
      places: placesDataset.places,
      role: "BEST_SCENE",
      applyOriginDistanceBonus: false,
      applyRouteBonus: false,
      applyExposureCorrection: false,
      applyCoverageBoost: false,
    });
    const first = sortCandidates(firstCandidates)[0];
    if (!first) {
      return {
        status: "FAILED",
        resultType: "UNKNOWN",
        score: null,
        message: "1번 카드 산정에 실패했습니다.",
        resultData: null,
        failReason: "FIRST_CARD_SELECTION_FAILED",
      };
    }

    const selectedIds = new Set<string>([first.place.place_id]);
    const blockedIds = new Set<string>([...request.excludePlaceIds, first.place.place_id]);

    // 2번 카드: 1번과 같은 primaryTheme 우선, 중복 장소 제외, 거리/노출/coverage 보정 적용.
    const sameThemePool = eligiblePlaces.filter(
      (place) => place.primaryTheme === first.place.primaryTheme && !blockedIds.has(place.place_id),
    );
    const secondPool = sameThemePool.length > 0 ? sameThemePool : candidatePool.filter((place) => !blockedIds.has(place.place_id));
    const secondPoolName = sameThemePool.length > 0 ? "1번 카드와 같은 primaryTheme 후보" : "같은 primaryTheme 후보 없음 → 전체 후보 fallback";
    const secondCandidates = scorePool({
      pool: secondPool,
      request,
      rawRequest,
      places: placesDataset.places,
      firstPlace: first.place,
      role: "SAME_MOOD_ALTERNATIVE",
      applyOriginDistanceBonus: true,
      applyRouteBonus: true,
      applyExposureCorrection: true,
      applyCoverageBoost: true,
    });
    const second = chooseWithinSwapGap(
      secondCandidates,
      (candidate) => candidate.score.routeDistanceBonus * 2 + candidate.score.lowExposureBoost + candidate.score.coverageBoost - candidate.score.exposurePenalty,
    );
    if (second) {
      selectedIds.add(second.place.place_id);
      blockedIds.add(second.place.place_id);
    }

    // 3번 카드: 조건 맞춤. travelPurpose가 있으면 purpose_tags 일치 후보를 우선 사용한다.
    // 단, 일치 후보가 0개면 카드 3개 보장을 위해 전체 후보로 fallback하고 warning을 남긴다.
    const strictConditionPool = eligiblePlaces.filter((place) => {
      if (blockedIds.has(place.place_id)) return false;
      if (request.travelPurpose && !place.purpose_tags?.includes(request.travelPurpose)) return false;
      return true;
    });
    const card3PurposeFallbackUsed = Boolean(request.travelPurpose) && strictConditionPool.length === 0;
    const card3FallbackPoolSize = eligiblePlaces.filter((place) => !blockedIds.has(place.place_id)).length;
    const card3FallbackReason = card3PurposeFallbackUsed ? buildCard3FallbackReason(request) : undefined;
    if (card3PurposeFallbackUsed) {
      warnings.push({
        code: "CARD3_PURPOSE_FALLBACK",
        message: "카드3 조건맞춤 후보 중 travelPurpose와 purpose_tags가 일치하는 장소가 없어 전체 후보로 fallback했습니다.",
        details: {
          reason: card3FallbackReason,
          travelPurpose: request.travelPurpose,
          selectedPlaceIds: Array.from(selectedIds),
          strictPurposePoolSize: strictConditionPool.length,
          fallbackUsed: true,
          fallbackPoolSize: card3FallbackPoolSize,
        },
      });
    }
    const conditionPool = card3PurposeFallbackUsed
      ? eligiblePlaces.filter((place) => !blockedIds.has(place.place_id))
      : strictConditionPool;
    const conditionPoolName = card3PurposeFallbackUsed
      ? "카드3 travelPurpose 일치 후보 없음 → 전체 후보 fallback"
      : request.travelPurpose
        ? "카드3 travelPurpose 일치 후보"
        : "카드3 전체 조건 후보";
    const thirdCandidates = scorePool({
      pool: conditionPool,
      request,
      rawRequest,
      places: placesDataset.places,
      firstPlace: first.place,
      role: "CONDITION_FIT_ALTERNATIVE",
      applyOriginDistanceBonus: true,
      applyRouteBonus: true,
      applyExposureCorrection: true,
      applyCoverageBoost: true,
    }).sort((a, b) => {
      const byCondition = b.score.conditionScore.total - a.score.conditionScore.total;
      if (byCondition !== 0) return byCondition;
      const bySelection = b.score.selectionScore - a.score.selectionScore;
      if (bySelection !== 0) return bySelection;
      return b.score.baseScore - a.score.baseScore;
    });
    const third = chooseWithinSwapGap(
      thirdCandidates,
      (candidate) => candidate.score.conditionScore.total * 2 + candidate.score.routeDistanceBonus + candidate.score.lowExposureBoost,
    );
    if (third) {
      selectedIds.add(third.place.place_id);
      blockedIds.add(third.place.place_id);
    }

    const picked = [first, second, third].filter((candidate): candidate is CandidateScore => Boolean(candidate));
    const cards = picked.slice(0, 3).map((candidate, index) => {
      const role: RecommendationCardRole = index === 0 ? "BEST_SCENE" : index === 1 ? "SAME_MOOD_ALTERNATIVE" : "CONDITION_FIT_ALTERNATIVE";
      return toRecommendationCard(candidate, (index + 1) as 1 | 2 | 3, role);
    });

    const cardSelections: RecommendationCardSelectionAudit[] = [];
    cardSelections.push(buildSelectionAudit({
      candidate: first,
      rank: 1,
      role: "BEST_SCENE",
      whySelected: "1번 카드는 선택한 primaryTheme와 감성·여행 조건에 가장 정직하게 맞는 후보를 선택했습니다. 출발지 거리, 카드 간 연계 거리, 노출 보정은 점수에 적용하지 않습니다.",
      candidatePool: {
        name: firstPoolName,
        size: safeFirstPool.length,
        totalCandidatePoolSize: candidatePool.length,
      },
    }));
    if (second) {
      cardSelections.push(buildSelectionAudit({
        candidate: second,
        rank: 2,
        role: "SAME_MOOD_ALTERNATIVE",
        whySelected: "2번 카드는 1번 카드와 같은 primaryTheme 후보를 우선 사용하고, 1번 카드 기준 연계 거리 보너스·노출 보정·coverage 보정을 반영해 선택했습니다.",
        candidatePool: {
          name: secondPoolName,
          size: secondPool.length,
          totalCandidatePoolSize: candidatePool.length,
        },
      }));
    }
    if (third) {
      cardSelections.push(buildSelectionAudit({
        candidate: third,
        rank: 3,
        role: "CONDITION_FIT_ALTERNATIVE",
        whySelected: card3PurposeFallbackUsed
          ? "3번 카드는 travelPurpose와 purpose_tags가 일치하는 후보가 0개라 전체 후보로 fallback한 뒤, 조건 점수·연계 거리 보너스·노출 보정을 기준으로 선택했습니다."
          : "3번 카드는 travelPurpose와 purpose_tags가 일치하는 후보를 우선 사용하고, 조건 점수(conditionScore)를 가장 우선해 선택했습니다.",
        candidatePool: {
          name: conditionPoolName,
          size: conditionPool.length,
          totalCandidatePoolSize: candidatePool.length,
          strictPurposePoolSize: request.travelPurpose ? strictConditionPool.length : undefined,
          fallbackUsed: card3PurposeFallbackUsed,
          fallbackReason: card3FallbackReason,
        },
      }));
    }

    const decisionAudit: RecommendationDecisionAudit = {
      schemaVersion: 2,
      policyVersion: RECOMMENDATION_POLICY_VERSION,
      candidateCount: candidatePool.length,
      operatingDate: {
        requestedDate: rawRequest.currentDate,
        excludedPlaces: operatingDateExcludedPlaces,
      },
      fallback: {
        card3PurposeFallbackUsed,
        reason: card3FallbackReason,
        travelPurpose: request.travelPurpose,
        strictPurposePoolSize: request.travelPurpose ? strictConditionPool.length : undefined,
        fallbackPoolSize: card3PurposeFallbackUsed ? card3FallbackPoolSize : undefined,
      },
      cardSelections,
    };

    const alternatives = buildAlternatives(eligiblePlaces, blockedIds, request, rawRequest, first.place);
    const avgScore = cards.length > 0 ? Math.round(cards.reduce((sum, card) => sum + card.score.displayScore, 0) / cards.length) : null;

    const debugScored = rawRequest.debug
      ? sortCandidates(
          scorePool({
            pool: candidatePool,
            request,
            rawRequest,
            places: placesDataset.places,
            firstPlace: first.place,
            role: "CONDITION_FIT_ALTERNATIVE",
            applyOriginDistanceBonus: true,
            applyRouteBonus: true,
            applyExposureCorrection: true,
            applyCoverageBoost: true,
          }),
        ).map((candidate) => ({
          placeId: candidate.place.place_id,
          placeName: candidate.place.place_name,
          primaryTheme: String(candidate.place.primaryTheme),
          baseScore: candidate.score.baseScore,
          originDistanceKm: candidate.score.originDistanceKm,
          originDistanceBonus: candidate.score.originDistanceBonus,
          routeDistanceKm: candidate.score.routeDistanceKm,
          routeDurationMin: candidate.score.routeDurationMin,
          routeDistanceSource: candidate.score.routeDistanceSource,
          selectionScore: candidate.score.selectionScore,
          displayScore: candidate.score.displayScore,
          scoreBreakdown: candidate.score,
        }))
      : undefined;

    const result: RecommendResult = {
      status: "DONE",
      resultType: "RECOMMEND",
      score: avgScore,
      message: cards.length >= 3 ? "추천 카드 3개 생성 완료" : `추천 카드 ${cards.length}개 생성 완료`,
      resultData: {
        request,
        cards,
        alternatives,
        warnings,
        decisionAudit,
        debug: rawRequest.debug
          ? {
              candidatePoolSize: candidatePool.length,
              scoredCandidates: debugScored ?? [],
            }
          : undefined,
      },
      failReason: null,
    };

    return result;
  } catch (error) {
    return {
      status: "FAILED",
      resultType: "UNKNOWN",
      score: null,
      message: "추천 로직 실행 중 오류가 발생했습니다.",
      resultData: null,
      failReason: error instanceof Error ? error.message : "UNKNOWN_ERROR",
    };
  }
}

export function getRecommendedPlaceIds(result: RecommendResult): string[] {
  return result.resultData?.cards.map((card) => card.placeId) ?? [];
}
