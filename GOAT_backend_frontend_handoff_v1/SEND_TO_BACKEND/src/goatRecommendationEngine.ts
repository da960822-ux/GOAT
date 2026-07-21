import {
  AccessGrade,
  BestTime,
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
  RecommendationCardRole,
  ScoreBreakdown,
  SeasonTag,
  TransportType,
} from "./goatRecommendationTypes";

const BEST_TIME_ORDER: BestTime[] = ["새벽", "오전", "한낮", "오후", "저녁", "야간"];
const ACCESS_SCORE: Record<AccessGrade, number> = { 상: 12, 중: 7, 하: 1 };
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

function isAdjacentTime(requested: string, placeBestTime: string): boolean {
  const reqIdx = BEST_TIME_ORDER.indexOf(requested as BestTime);
  const placeIdx = BEST_TIME_ORDER.indexOf(placeBestTime as BestTime);
  if (reqIdx === -1 || placeIdx === -1) return false;
  const diff = Math.abs(reqIdx - placeIdx);
  return diff === 1 || diff === BEST_TIME_ORDER.length - 1;
}

function seasonFromMonth(month?: number): SeasonTag | undefined {
  if (!month || month < 1 || month > 12) return undefined;
  if ([3, 4, 5].includes(month)) return "봄";
  if ([6, 7, 8].includes(month)) return "여름";
  if ([9, 10, 11].includes(month)) return "가을";
  return "겨울";
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
  if (containsAnyText(source, WALK_HIGH_HINTS).length > 0) {
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
  if (transportType === "도보중심") return inferWalkGrade(place);
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
  const purposeScore = purposeMatched ? 16 : 0;

  const access = getAccessGrade(place, request.transportType);
  const accessScore = access.grade && ACCESS_SCORE[access.grade as AccessGrade] ? ACCESS_SCORE[access.grade as AccessGrade] : 0;

  let bestTimeMatchType: ConditionScoreBreakdown["bestTime"]["matchType"] = "not_requested";
  let bestTimeScore = 0;
  if (request.visitTime) {
    if (place.best_time === request.visitTime) {
      bestTimeMatchType = "exact";
      bestTimeScore = 8;
    } else if (isAdjacentTime(request.visitTime, String(place.best_time))) {
      bestTimeMatchType = "adjacent";
      bestTimeScore = 4;
    } else {
      bestTimeMatchType = "none";
    }
  }

  let seasonMatchType: ConditionScoreBreakdown["season"]["matchType"] = "not_requested";
  let seasonScore = 0;
  if (request.currentSeason) {
    if (place.season_tags?.includes(request.currentSeason)) {
      seasonMatchType = "current";
      seasonScore = 9;
    } else if (place.season_tags?.includes("사계절")) {
      seasonMatchType = "all_season";
      seasonScore = 7;
    } else {
      seasonMatchType = "none";
    }
  }

  return {
    total: purposeScore + accessScore + bestTimeScore + seasonScore,
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
    bestTime: {
      requested: request.visitTime,
      placeBestTime: String(place.best_time),
      matchType: bestTimeMatchType,
      score: bestTimeScore,
    },
    season: {
      requested: request.currentSeason,
      placeSeasonTags: place.season_tags ?? [],
      matchType: seasonMatchType,
      score: seasonScore,
    },
  };
}

function calculateRouteDistanceBonus(
  firstPlace: GoatPlace | undefined,
  place: GoatPlace,
  request: RecommendRequest,
): number {
  if (!firstPlace || firstPlace.place_id === place.place_id) return 0;
  const explicitKm = request.routeDistanceKmByPlaceId?.[place.place_id];
  if (hasValidNumber(explicitKm)) return routeBonusFromKm(explicitKm);

  const from = getLatLng(firstPlace);
  const to = getLatLng(place);
  if (!from || !to) return 0;
  return routeBonusFromKm(haversineKm(from, to));
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
  applyRouteBonus: boolean;
  applyExposureCorrection: boolean;
  applyCoverageBoost: boolean;
}): CandidateScore {
  const moodScore = calculateMoodScore(params.place, params.request);
  const conditionScore = calculateConditionScore(params.place, params.request);
  const baseScore = moodScore.total + conditionScore.total;
  const routeDistanceBonus = params.applyRouteBonus
    ? calculateRouteDistanceBonus(params.firstPlace, params.place, params.rawRequest)
    : 0;
  const dupPenalty = duplicatePenalty(params.firstPlace, params.place, params.role);
  const expPenalty = params.applyExposureCorrection ? exposurePenalty(params.place, params.rawRequest) : 0;
  const covBoost = params.applyCoverageBoost ? coverageBoost(params.place, params.request) : 0;
  const lowBoost = params.applyExposureCorrection ? lowExposureBoost(params.place, params.places, params.rawRequest) : 0;
  const selectionScore = baseScore + routeDistanceBonus - dupPenalty - expPenalty + covBoost + lowBoost;
  const displayScore = clamp(baseScore + routeDistanceBonus - dupPenalty, 0, 100);
  const score: ScoreBreakdown = {
    moodScore,
    conditionScore,
    baseScore,
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
  if (score.conditionScore.bestTime.matchType === "exact") reasons.push(`방문 시간대(${request.visitTime})와 최적 시간대가 정확히 맞습니다.`);
  if (score.conditionScore.bestTime.matchType === "adjacent") reasons.push(`방문 시간대와 인접한 시간대라 일정 조정이 쉽습니다.`);
  if (score.conditionScore.season.matchType === "current") reasons.push(`현재 계절(${request.currentSeason})에 적합한 장소입니다.`);
  if (score.conditionScore.season.matchType === "all_season") reasons.push("사계절 방문 가능한 장소입니다.");
  if (score.routeDistanceBonus > 0) reasons.push(`1번 카드와 가까워 연계 동선 보너스 ${score.routeDistanceBonus}점이 반영됐습니다.`);
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
  if (score.routeDistanceBonus === 0) {
    cautions.push("좌표 또는 길찾기 거리값이 없으면 연계 거리 보너스는 0점 처리됩니다.");
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
): { request: NormalizedRequest; warnings: string[] } {
  const warnings: string[] = [];
  const referenceCard = rawRequest.referenceCardId
    ? referenceDataset?.reference_cards.find((card) => card.referenceCardId === rawRequest.referenceCardId && card.isActive !== false)
    : undefined;

  if (rawRequest.referenceCardId && !referenceCard) {
    warnings.push(`referenceCardId ${rawRequest.referenceCardId}를 찾지 못해 직접 입력값 기준으로 추천합니다.`);
  }

  const moodAllowed = getAllowedSet(placesDataset, "mood_tags");
  const sceneAllowed = getAllowedSet(placesDataset, "sceneTags");
  const purposeAllowed = getAllowedSet(placesDataset, "purpose_tags");
  const themeAllowed = getAllowedSet(placesDataset, "primaryTheme");
  const timeAllowed = getAllowedSet(placesDataset, "best_time");
  const transportAllowed = getAllowedSet(placesDataset, "transportType");
  const seasonAllowed = getAllowedSet(placesDataset, "season_tags");

  const primaryTheme = rawRequest.primaryTheme ?? referenceCard?.primaryTheme;
  const validPrimaryTheme = primaryTheme && (themeAllowed.size === 0 || themeAllowed.has(String(primaryTheme))) ? String(primaryTheme) : undefined;
  if (primaryTheme && !validPrimaryTheme) warnings.push(`허용되지 않은 primaryTheme(${primaryTheme})는 점수 계산에서 제외했습니다.`);

  const userMoodTags = filterAllowed([...(rawRequest.userMoodTags ?? []), ...(referenceCard?.mood_tags ?? [])], moodAllowed);
  const userSceneTags = filterAllowed([...(rawRequest.userSceneTags ?? []), ...(referenceCard?.sceneTags ?? [])], sceneAllowed);

  const travelPurpose = rawRequest.travelPurpose && (purposeAllowed.size === 0 || purposeAllowed.has(rawRequest.travelPurpose))
    ? rawRequest.travelPurpose
    : referenceCard?.recommendedPurpose?.find((purpose) => purposeAllowed.size === 0 || purposeAllowed.has(purpose));
  if (rawRequest.travelPurpose && travelPurpose !== rawRequest.travelPurpose) warnings.push(`허용되지 않은 travelPurpose(${rawRequest.travelPurpose})는 제외했습니다.`);

  const transportType = rawRequest.transportType && (transportAllowed.size === 0 || transportAllowed.has(rawRequest.transportType))
    ? rawRequest.transportType
    : referenceCard?.recommendedTransport?.find((transport) => transportAllowed.size === 0 || transportAllowed.has(transport));
  if (rawRequest.transportType && transportType !== rawRequest.transportType) warnings.push(`허용되지 않은 transportType(${rawRequest.transportType})는 제외했습니다.`);

  const visitTime = rawRequest.visitTime && (timeAllowed.size === 0 || timeAllowed.has(rawRequest.visitTime))
    ? rawRequest.visitTime
    : referenceCard?.recommendedBestTime?.find((time) => timeAllowed.size === 0 || timeAllowed.has(time));
  if (rawRequest.visitTime && visitTime !== rawRequest.visitTime) warnings.push(`허용되지 않은 visitTime(${rawRequest.visitTime})은 제외했습니다.`);

  const computedSeason = rawRequest.currentSeason ?? seasonFromMonth(rawRequest.currentMonth);
  const currentSeason = computedSeason && (seasonAllowed.size === 0 || seasonAllowed.has(String(computedSeason))) ? String(computedSeason) : undefined;
  if (computedSeason && !currentSeason) warnings.push(`허용되지 않은 currentSeason(${computedSeason})은 제외했습니다.`);

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
      visitTime,
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
    const candidatePool = expandCandidatePool(placesDataset.places, request);
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

    // 1번 카드: primaryTheme 일치 후보 중 baseScore 1위. 거리/노출 보정 미적용.
    const firstPool = request.primaryTheme
      ? candidatePool.filter((place) => place.primaryTheme === request.primaryTheme)
      : candidatePool;
    const safeFirstPool = firstPool.length > 0 ? firstPool : candidatePool;
    const firstCandidates = scorePool({
      pool: safeFirstPool,
      request,
      rawRequest,
      places: placesDataset.places,
      role: "BEST_SCENE",
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

    const selectedIds = new Set<string>([first.place.place_id, ...request.excludePlaceIds]);

    // 2번 카드: 1번과 같은 primaryTheme 우선, 중복 장소 제외, 거리/노출/coverage 보정 적용.
    const sameThemePool = placesDataset.places.filter(
      (place) => place.primaryTheme === first.place.primaryTheme && !selectedIds.has(place.place_id),
    );
    const secondCandidates = scorePool({
      pool: sameThemePool.length > 0 ? sameThemePool : candidatePool.filter((place) => !selectedIds.has(place.place_id)),
      request,
      rawRequest,
      places: placesDataset.places,
      firstPlace: first.place,
      role: "SAME_MOOD_ALTERNATIVE",
      applyRouteBonus: true,
      applyExposureCorrection: true,
      applyCoverageBoost: true,
    });
    const second = chooseWithinSwapGap(
      secondCandidates,
      (candidate) => candidate.score.routeDistanceBonus * 2 + candidate.score.lowExposureBoost + candidate.score.coverageBoost - candidate.score.exposurePenalty,
    );
    if (second) selectedIds.add(second.place.place_id);

    // 3번 카드: 조건 맞춤. travelPurpose가 있으면 purpose_tags 미일치 후보 제외.
    const conditionPool = placesDataset.places.filter((place) => {
      if (selectedIds.has(place.place_id)) return false;
      if (request.travelPurpose && !place.purpose_tags?.includes(request.travelPurpose)) return false;
      return true;
    });
    const thirdCandidates = scorePool({
      pool: conditionPool.length > 0 ? conditionPool : placesDataset.places.filter((place) => !selectedIds.has(place.place_id)),
      request,
      rawRequest,
      places: placesDataset.places,
      firstPlace: first.place,
      role: "CONDITION_FIT_ALTERNATIVE",
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
    if (third) selectedIds.add(third.place.place_id);

    const picked = [first, second, third].filter((candidate): candidate is CandidateScore => Boolean(candidate));
    const cards = picked.slice(0, 3).map((candidate, index) => {
      const role: RecommendationCardRole = index === 0 ? "BEST_SCENE" : index === 1 ? "SAME_MOOD_ALTERNATIVE" : "CONDITION_FIT_ALTERNATIVE";
      return toRecommendationCard(candidate, (index + 1) as 1 | 2 | 3, role);
    });

    const alternatives = buildAlternatives(placesDataset.places, selectedIds, request, rawRequest, first.place);
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
            applyRouteBonus: true,
            applyExposureCorrection: true,
            applyCoverageBoost: true,
          }),
        ).map((candidate) => ({
          placeId: candidate.place.place_id,
          placeName: candidate.place.place_name,
          primaryTheme: String(candidate.place.primaryTheme),
          baseScore: candidate.score.baseScore,
          selectionScore: candidate.score.selectionScore,
          displayScore: candidate.score.displayScore,
        }))
      : undefined;

    return {
      status: "DONE",
      resultType: "RECOMMEND",
      score: avgScore,
      message: cards.length >= 3 ? "추천 카드 3개 생성 완료" : `추천 카드 ${cards.length}개 생성 완료`,
      resultData: {
        request,
        cards,
        alternatives,
        warnings,
        debug: rawRequest.debug
          ? {
              candidatePoolSize: candidatePool.length,
              scoredCandidates: debugScored ?? [],
            }
          : undefined,
      },
      failReason: null,
    };
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
