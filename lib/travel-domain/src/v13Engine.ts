import tagDictionaryData from "./data/tag-dictionary.json";

/**
 * GOAT 태그 기반 추천 로직 v1.3_api_first_fallback
 *
 * 핵심 정책
 * - 원본 seed pool은 항상 GOAT-001 ~ GOAT-058, 총 58개다.
 * - 58개에서 장소를 삭제하지 않는다.
 * - 다만 요청 조건에 따라 "검증 완료 + 비숙박/비리조트" 중심의 43개 1차 방문지 pool로 좁혀 추천할 수 있다.
 * - 숙소/료칸/리조트/카라반 감성이 들어오면 43개 pool에서 제외하지 않고 58개 pool을 사용한다.
 * - future_candidate / needs_verification은 기본적으로 제외값이 아니라 배지·주의문구·점수 보정값이다.
 */

export type PoolMode = "auto" | "all58" | "primary43";
export type PoolPolicy = "ALL58" | "PRIMARY43";

export type CompanionType = "solo" | "couple" | "friends" | "family" | string;
export type TravelPurpose = "photo" | "walk" | "activity" | "healing" | "food" | string;
export type TransportType = "car" | "public" | "walk" | string;

export type GoatPlace = {
  placeId: string;
  name: string;
  city: string;
  regionGroup: string;
  placeType: string;
  primaryMood: string;
  moodTags: string[];
  searchTags: string[];
  photoPoint?: string | null;
  bestTime?: string[];
  bestTimeRaw?: string | null;
  bestSeason?: string[];
  bestSeasonRaw?: string | null;
  accessibility?: { publicTransport?: string | null; car?: string | null; raw?: string | null };
  dataStatus: "confirmed" | "future_candidate" | "needs_verification" | string;
  recommendationUse?: string | null;
  note?: string | null;
  isRecommendationCandidate?: boolean;
  imageUrl?: string | null;
  mapSearchQuery?: string | null;
};

export type RecommendationInput = {
  requestId?: string;
  source?: "llm" | "manual-demo" | "reference-card" | string;
  extractedTags?: string[];
  moodTags?: string[];
  sceneTags?: string[];
  preferredSeason?: string | null;
  preferredTime?: string | null;
  regionGroup?: string | null;
  weatherTag?: string | null;

  /**
   * 선택 입력값. 없으면 0점 처리되어 기존 추천 결과를 흔들지 않는다.
   * - companionType: 혼자/연인/친구/가족 등 동행 유형
   * - travelPurpose: 사진위주/산책/액티비티/휴식/먹거리 등 여행 목적. 문자열 또는 배열 모두 허용
   * - transportType: 자차/대중교통/도보 등 이동수단
   */
  companionType?: CompanionType | null;
  travelPurpose?: TravelPurpose | TravelPurpose[] | null;
  transportType?: TransportType | null;
  excludeIds?: string[];
  limit?: number;

  /**
   * auto      : 기본값. 숙소/후보/확장 감성이 있으면 ALL58, 아니면 PRIMARY43로 좁힐 수 있다.
   * all58     : 58개 전체 seed pool 사용.
   * primary43 : 검증 완료 + 비숙박/비리조트 중심의 43개 1차 방문지 pool 사용.
   */
  poolMode?: PoolMode;
};

export type RecommendationCard = {
  rank: number;
  cardType: "SCENE_BEST" | "SAME_MOOD_ALTERNATIVE" | "CONDITION_FIT";
  cardLabel: string;
  placeId: string;
  name: string;
  city: string;
  regionGroup: string;
  placeType: string;
  primaryMood: string;
  dataStatus: string;
  dataStatusLabel: string;
  score: number;
  matchedTags: string[];
  scoreBreakdown: Record<string, number>;
  reason: string;
  photoPoint?: string | null;
  bestTime?: string | null;
  bestSeason?: string | null;
  weatherFit: string;
  crowdLevel: string;
  safetyNotes: string[];
  parkingInfo: string;
  accessibility?: string | null;
  imageUrl?: string | null;
  mapSearchQuery?: string | null;
};

export type RecommendationApiResponse = {
  status: "DONE" | "FAILED";
  resultType: "RECOMMEND" | "UNKNOWN";
  score: number | null;
  message: string;
  failReason: string | null;
  resultData: null | {
    requestId: string;
    inputTags: string[];

    /** 전체 seed pool 수. 정상 데이터라면 58. */
    seedPoolSize: number;

    /** 실제 추천 계산에 사용된 pool 수. 조건에 따라 58 또는 43이 될 수 있다. */
    candidatePoolSize: number;

    /** 실제 사용한 pool 정책. */
    poolPolicy: PoolPolicy;
    poolReason: string;

    fallbackUsed: boolean;
    /** PRIMARY43 결과가 약할 때 58개 전체 pool로 재시도했는지 여부. */
    adaptivePoolRetryUsed: boolean;
    recommendations: RecommendationCard[];
  };
};

type ScoredPlace = GoatPlace & {
  _score: number;
  _matchedTags: string[];
  _scoreBreakdown: Record<string, number>;
};

/**
 * 태그 사전 v1.2 기반, v1.3 API-first fallback 패키지에서 사용
 * - aliases: 같은 의미/검색어 변형. 비교적 높은 점수로 취급한다.
 * - relatedTags: 같은 의미는 아니지만 함께 보면 좋은 연관 장면. 낮은 점수로 확장한다.
 * - moodExpansion: "청량함/이국적"처럼 추상적인 무드가 들어왔을 때 실제 장소 태그로 풀어준다.
 */
type TagDictionary = {
  aliases: Record<string, string[]>;
  relatedTags: Record<string, string[]>;
  moodExpansion: Record<string, string[]>;
  weakStandaloneTags: string[];
};

const TAG_DICTIONARY = tagDictionaryData as TagDictionary;
const TAG_ALIASES = TAG_DICTIONARY.aliases;
const RELATED_TAGS = TAG_DICTIONARY.relatedTags;
const MOOD_EXPANSION = TAG_DICTIONARY.moodExpansion;

const WEAK_STANDALONE_TAGS = new Set(
  TAG_DICTIONARY.weakStandaloneTags.map(normalizeTag),
);

const GENERIC_TAGS = new Set([
  "일본", "바다", "자연", "감성적", "조용함", "이국적", "청량함", "탁트임",
  "낭만적", "도시적", "자연친화", "추천", "코스", "대안", "포토스팟", "사진스팟",
  "오후", "오전", "사계절", "맑은날"
].map(normalizeTag));

const LODGING_INTENT_TAGS = new Set([
  "숙소", "숙박", "리조트", "료칸", "풀빌라", "자쿠지", "카라반", "체크인", "다도",
  "히노끼탕", "노천탕", "히노끼사우나", "유카타", "프리미엄숙소", "독채풀빌라"
].map(normalizeTag));

const EXPANSION_INTENT_TAGS = new Set([
  "후보", "브랜딩", "숨은", "신규", "대안", "로드트립", "해안도로", "주상절리",
  "잔도", "용화해변", "헌화로", "미검증", "프라이빗비치", "나트랑"
].map(normalizeTag));

function normalizeTag(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

function splitTokens(value: unknown): string[] {
  const raw = String(value ?? "");
  if (!raw) return [];
  return [raw, ...raw.split(/[·/(),~\-\s]+/g)].map(normalizeTag).filter(Boolean);
}

function buildAliasMap(): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  Object.entries(TAG_ALIASES).forEach(([key, values]) => {
    const group = [key, ...values].map(normalizeTag);
    group.forEach((tag) => map.set(tag, new Set(group)));
  });
  return map;
}

const ALIAS_MAP = buildAliasMap();

function expandAliasTags(tag: string): Set<string> {
  const normalized = normalizeTag(tag);
  return ALIAS_MAP.get(normalized) ?? new Set([normalized]);
}

function getSoftExpansionTags(tag: string, source: WeightedTagSource): string[] {
  const normalized = normalizeTag(tag);
  const related = RELATED_TAGS[normalized] ?? [];
  const moodExpansion = source === "mood" ? (MOOD_EXPANSION[normalized] ?? []) : [];
  return Array.from(new Set([...moodExpansion, ...related].map(normalizeTag).filter(Boolean)));
}

type WeightedTagSource = "extracted" | "scene" | "mood" | "moodExpansion" | "related";

function getWeightedInputTags(input: RecommendationInput): Array<{ tag: string; source: WeightedTagSource; weight: number }> {
  const base: Array<{ tag: string; source: WeightedTagSource; weight: number }> = [
    ...((input.extractedTags ?? []).map((tag) => ({ tag, source: "extracted" as const, weight: 3.0 }))),
    ...((input.sceneTags ?? []).map((tag) => ({ tag, source: "scene" as const, weight: 2.6 }))),
    ...((input.moodTags ?? []).map((tag) => ({ tag, source: "mood" as const, weight: 1.2 })))
  ].filter((item) => normalizeTag(item.tag));

  const byTag = new Map<string, { tag: string; source: WeightedTagSource; weight: number }>();
  for (const item of base) {
    const key = normalizeTag(item.tag);
    const prev = byTag.get(key);
    if (!prev || item.weight > prev.weight) byTag.set(key, item);
  }

  for (const item of base) {
    const expansionWeight = item.source === "mood" ? 0.85 : 0.65;
    const expansionSource: WeightedTagSource = item.source === "mood" ? "moodExpansion" : "related";
    for (const tag of getSoftExpansionTags(item.tag, item.source)) {
      const key = normalizeTag(tag);
      if (!key || byTag.has(key)) continue;
      byTag.set(key, { tag, source: expansionSource, weight: expansionWeight });
    }
  }

  return Array.from(byTag.values());
}

function getAllInputTags(input: RecommendationInput): string[] {
  return getWeightedInputTags(input).map((item) => item.tag);
}

function rawInputTagSet(input: RecommendationInput): Set<string> {
  return new Set([
    ...(input.extractedTags ?? []),
    ...(input.sceneTags ?? []),
    ...(input.moodTags ?? [])
  ].map(normalizeTag).filter(Boolean));
}

function inputTagSet(input: RecommendationInput): Set<string> {
  return new Set(getAllInputTags(input).map(normalizeTag).filter(Boolean));
}

function hasAny(set: Set<string>, tags: string[]): boolean {
  return tags.map(normalizeTag).some((tag) => set.has(tag));
}

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.map(normalizeTag).some((keyword) => text.includes(keyword));
}

function getPlaceTokens(place: GoatPlace): Set<string> {
  const values = [
    ...(place.searchTags ?? []),
    ...(place.moodTags ?? []),
    place.primaryMood,
    place.placeType,
    place.name,
    place.photoPoint,
    place.recommendationUse
  ];
  const tokens = new Set<string>();
  values.forEach((value) => splitTokens(value).forEach((token) => tokens.add(token)));
  return tokens;
}

function isLodgingOrResort(place: GoatPlace): boolean {
  // GOAT-002 레고랜드 코리아 리조트는 이름에 리조트가 있지만 placeType은 테마파크이므로 제외하지 않는다.
  if (place.placeId === "GOAT-002") return false;

  const text = normalizeTag([place.placeType, place.primaryMood, place.recommendationUse, place.note].filter(Boolean).join(" "));
  const exactTags = new Set([...(place.searchTags ?? []), ...(place.moodTags ?? [])].map(normalizeTag));

  // "다도"처럼 짧은 태그를 substring으로 검사하면 "바다도로"가 숙소로 오탐될 수 있으므로
  // 숙박 성격을 직접 나타내는 태그만 substring/정확일치 검사에 사용한다.
  const lodgingKeywords = [
    "숙소", "숙박", "리조트", "료칸", "풀빌라", "자쿠지", "카라반",
    "히노끼탕", "노천탕", "히노끼사우나", "프리미엄숙소", "독채풀빌라"
  ].map(normalizeTag);

  return lodgingKeywords.some((keyword) => text.includes(keyword) || exactTags.has(keyword));
}

function wantsLodging(input: RecommendationInput): boolean {
  const tags = rawInputTagSet(input);
  return Array.from(LODGING_INTENT_TAGS).some((tag) => tags.has(tag));
}

function wantsExpandedPool(input: RecommendationInput): boolean {
  const tags = rawInputTagSet(input);
  return Array.from(EXPANSION_INTENT_TAGS).some((tag) => tags.has(tag));
}

function hasWeakStandaloneSignal(input: RecommendationInput): boolean {
  const tags = rawInputTagSet(input);
  return Array.from(WEAK_STANDALONE_TAGS).some((tag) => tags.has(tag));
}

function shouldRetryWithAll58(input: RecommendationInput, policy: PoolPolicy, scored: ScoredPlace[]): boolean {
  if (policy !== "PRIMARY43") return false;
  if (input.poolMode === "primary43") return false;
  const topScore = scored[0]?._score ?? 0;
  const thirdScore = scored[2]?._score ?? 0;
  if (topScore < 25 || thirdScore < 22) return true;
  return hasWeakStandaloneSignal(input) && thirdScore < 35;
}

function scoreCandidatePool(input: RecommendationInput, activePool: GoatPlace[]): ScoredPlace[] {
  return activePool
    .map((place) => {
      const result = scorePlace(input, place);
      return { ...place, _score: result.score, _matchedTags: result.matchedTags, _scoreBreakdown: result.scoreBreakdown } as ScoredPlace;
    })
    .sort((a, b) => b._score - a._score || a.placeId.localeCompare(b.placeId));
}

function resolvePoolPolicy(input: RecommendationInput): { policy: PoolPolicy; reason: string } {
  if (input.poolMode === "all58") {
    return { policy: "ALL58", reason: "요청에서 58개 전체 후보 사용을 지정했습니다." };
  }
  if (input.poolMode === "primary43") {
    return { policy: "PRIMARY43", reason: "요청에서 검증 완료 비숙박 1차 방문지 pool 사용을 지정했습니다." };
  }
  if (wantsLodging(input)) {
    return { policy: "ALL58", reason: "숙소·료칸·리조트 감성이 포함되어 58개 전체 후보를 사용했습니다." };
  }
  if (wantsExpandedPool(input)) {
    return { policy: "ALL58", reason: "후보 장소나 확장 장면 태그가 포함되어 58개 전체 후보를 사용했습니다." };
  }
  return { policy: "PRIMARY43", reason: "기본 방문지 추천이므로 검증 완료 비숙박 1차 pool로 좁혔습니다." };
}

function buildCandidatePool(input: RecommendationInput, places: GoatPlace[]) {
  const seedPool = places.filter((place) => place.isRecommendationCandidate !== false);
  const excluded = new Set(input.excludeIds ?? []);
  const availableSeedPool = seedPool.filter((place) => !excluded.has(place.placeId));
  const { policy, reason } = resolvePoolPolicy(input);
  const activePool = policy === "PRIMARY43"
    ? availableSeedPool.filter((place) => place.dataStatus === "confirmed" && !isLodgingOrResort(place))
    : availableSeedPool;
  return { seedPool, availableSeedPool, activePool, policy, reason };
}

function tagMatchScore(input: RecommendationInput, place: GoatPlace): { score: number; matchedTags: string[]; directMatchCount: number } {
  const placeTokens = getPlaceTokens(place);
  const matched = new Set<string>();
  let score = 0;
  let directMatchCount = 0;

  for (const item of getWeightedInputTags(input)) {
    const tag = normalizeTag(item.tag);
    if (!tag) continue;

    const weight = item.weight * (GENERIC_TAGS.has(tag) ? 0.55 : 1);

    if (placeTokens.has(tag)) {
      score += 11 * weight;
      matched.add(tag);
      directMatchCount += 1;
      continue;
    }

    let found = false;
    if (tag.length >= 2) {
      for (const placeToken of placeTokens) {
        if (placeToken.length >= 2 && (tag.includes(placeToken) || placeToken.includes(tag))) {
          score += 7 * weight;
          matched.add(placeToken);
          directMatchCount += 1;
          found = true;
          break;
        }
      }
    }
    if (found) continue;

    for (const synonym of expandAliasTags(tag)) {
      if (synonym === tag) continue;
      if (placeTokens.has(synonym)) {
        score += 5 * weight;
        matched.add(synonym);
        found = true;
        break;
      }
      for (const placeToken of placeTokens) {
        if (synonym.length >= 2 && placeToken.length >= 2 && (synonym.includes(placeToken) || placeToken.includes(synonym))) {
          score += 3 * weight;
          matched.add(placeToken);
          found = true;
          break;
        }
      }
      if (found) break;
    }
  }

  return {
    score,
    matchedTags: Array.from(matched).slice(0, 8),
    directMatchCount
  };
}

function seasonScore(input: RecommendationInput, place: GoatPlace): number {
  if (!input.preferredSeason) return 0;
  const preferred = normalizeTag(input.preferredSeason);
  const raw = normalizeTag(place.bestSeasonRaw ?? "");
  const seasons = new Set((place.bestSeason ?? []).map(normalizeTag));
  if (seasons.has("사계절") || seasons.has(preferred) || raw.includes(preferred)) return 5;
  return -1;
}

function timeScore(input: RecommendationInput, place: GoatPlace): number {
  if (!input.preferredTime) return 0;
  const preferred = normalizeTag(input.preferredTime);
  const raw = normalizeTag(place.bestTimeRaw ?? "");
  if (!raw) return 0;
  if (preferred.includes(raw) || raw.includes(preferred)) return 4;

  const groups = [
    ["오전", "이른아침", "일출"],
    ["오후", "늦은오후", "정오"],
    ["일몰", "해질녘", "블루아워"],
    ["밤", "저녁", "새벽"]
  ];

  for (const group of groups) {
    const normalized = group.map(normalizeTag);
    if (normalized.some((tag) => preferred.includes(tag)) && normalized.some((tag) => raw.includes(tag))) return 3;
  }
  return 0;
}

function weatherScore(input: RecommendationInput, place: GoatPlace): number {
  if (!input.weatherTag) return 0;

  const weather = normalizeTag(input.weatherTag);
  const text = placeSearchText(place);
  let score = 0;

  // 직접 명시된 날씨 키워드는 가장 강하게 반영한다.
  if (text.includes(weather)) score += 5;

  // 맑은 날: 야외 경관형 장소가 유리하다.
  if (weather.includes("맑") || weather.includes("화창")) {
    if (includesAny(text, ["해변", "해안", "오션뷰", "고원", "목장", "초원", "숲", "정원", "호수", "전망", "일몰", "일출"])) score += 4;
    if (includesAny(text, ["실내", "미술관", "서점", "카페"])) score += 1;
  }

  // 비/우천: 실내·대안 코스는 올리고, 해안/산악/고원/도로형은 낮춘다.
  if (weather.includes("비") || weather.includes("우천") || weather.includes("강수")) {
    if (includesAny(text, ["미술관", "카페", "서점", "시장", "실내", "폐광", "산업유산", "비오는", "흐린날", "대안코스"])) score += 6;
    if (includesAny(text, ["해변", "해안", "방파제", "파도", "절벽", "산", "등산", "트레킹", "고원", "목장", "초원", "서핑", "도로", "드라이브", "별", "은하수", "일출", "일몰"])) score -= 7;
  }

  // 흐린 날: 폐광/전시/카페/시장처럼 날씨 영향이 적거나 분위기가 살아나는 장소를 우대한다.
  if (weather.includes("흐린") || weather.includes("흐림")) {
    if (includesAny(text, ["폐광", "산업유산", "미술관", "카페", "서점", "시장", "항구", "흐린날"])) score += 5;
    if (includesAny(text, ["별", "은하수", "일출", "일몰", "오션뷰", "전망"])) score -= 3;
  }

  // 바람 강한 날: 해안/절벽/고원/풍력발전/서핑은 주의가 필요하다.
  if (weather.includes("바람") || weather.includes("강풍") || weather.includes("풍속")) {
    if (includesAny(text, ["해변", "해안", "절벽", "데크", "고원", "풍력발전기", "서핑", "방파제"])) score -= 6;
    if (includesAny(text, ["미술관", "카페", "서점", "시장", "실내"])) score += 3;
  }

  // 눈/겨울: 설경 장소는 올리고 도로형 장소는 소폭 주의 처리한다.
  if (weather.includes("눈") || weather.includes("겨울") || weather.includes("설경")) {
    if (includesAny(text, ["설경", "설원", "눈꽃", "상고대", "겨울", "스키", "북유럽", "자작나무"])) score += 6;
    if (includesAny(text, ["해안도로", "도로", "드라이브", "절벽", "데크"])) score -= 3;
  }

  return Math.max(-8, Math.min(10, score));
}

function statusScore(place: GoatPlace): number {
  if (place.dataStatus === "confirmed") return 3;
  if (place.dataStatus === "future_candidate") return 1;
  if (place.dataStatus === "needs_verification") return -2;
  return 0;
}

function sceneSpecificScore(input: RecommendationInput, place: GoatPlace): { score: number; reasons: string[] } {
  const tags = inputTagSet(input);
  const rawTags = rawInputTagSet(input);
  const tokenText = normalizeTag(Array.from(getPlaceTokens(place)).join(" "));
  let score = 0;
  const reasons: string[] = [];

  if (hasAny(tags, ["해안도로", "로드트립", "드라이브", "캘리포니아"])) {
    if (includesAny(tokenText, ["해안도로", "로드트립", "캘리포니아1번국도"])) {
      score += 16;
      reasons.push("해안도로/로드트립 직접 일치");
    }
    if (includesAny(tokenText, ["서프비치"])) {
      score += 60;
      reasons.push("서프비치 대안 강함");
    } else if (includesAny(tokenText, ["서핑", "팜트리"])) {
      score += 28;
      reasons.push("서핑/비치 대안 일치");
    }
    if (includesAny(tokenText, ["해안데크", "오션뷰"])) {
      score += 12;
      reasons.push("해안 산책/오션뷰 조건 일치");
    }
    if (tokenText.includes("카페거리")) {
      score -= 20;
      reasons.push("카페거리 성격으로 로드트립 우선순위 감점");
    }
    if (tokenText.includes("서프타운") || tokenText.includes("권역")) {
      score -= 8;
      reasons.push("권역형 장소라 단일 포토스팟보다 후순위");
    }
  }

  if (hasAny(tags, ["가마쿠라", "철길", "골목산책", "소도시"])) {
    if (tokenText.includes("철길")) score += 16;
    if (tokenText.includes("가마쿠라")) score += 30;
    if (tokenText.includes("바다도로") || tokenText.includes("포토존")) score += 8;
    if (tokenText.includes("골목산책") || tokenText.includes("오노미치")) score += 10;
    if (tokenText.includes("소품샵")) score -= 6;
    if (tokenText.includes("서점")) score -= 8;
  }

  if (hasAny(tags, ["목장", "초원", "알프스"])) {
    if (tokenText.includes("목장")) score += 15;
    if (place.regionGroup === "고원권") score += 8;
  }

  if (hasAny(tags, ["협곡", "주상절리", "잔도", "절벽", "아이슬란드"])) {
    if (tokenText.includes("주상절리")) score += 20;
    if (tokenText.includes("잔도")) score += 16;
    if (tokenText.includes("협곡")) score += 15;
    if (includesAny(tokenText, ["절벽트레일", "해식동굴", "촛대바위"])) score += 14;
    if (includesAny(tokenText, ["절벽", "출렁다리", "스카이워크"])) score += 8;
    if (includesAny(tokenText, ["스카이타워", "울렁다리", "소금산"])) score += 12;
    if (tokenText.includes("호수") && !tokenText.includes("협곡")) score -= 6;
    if (tokenText.includes("숲") || tokenText.includes("자작나무")) score -= 12;
  }


  if (hasAny(tags, ["북유럽", "숲", "자작나무", "겨울", "설경"])) {
    if (tokenText.includes("자작나무")) score += 30;
    if (tokenText.includes("침엽수림") || tokenText.includes("흑림") || tokenText.includes("가문비나무")) score += 22;
    if (tokenText.includes("상고대") || tokenText.includes("눈꽃") || tokenText.includes("설산")) score += 17;
    if (tokenText.includes("북유럽") || tokenText.includes("핀란드")) score += 12;
  }

  if (hasAny(tags, ["레트로", "시장", "야간", "오사카", "후쿠오카", "구도심"])) {
    if (tokenText.includes("시장")) score += 24;
    if (tokenText.includes("항구") && (tokenText.includes("밤거리") || tokenText.includes("야타이"))) score += 20;
    if (tokenText.includes("야간거리") || tokenText.includes("월화거리")) score += 18;
    if (tokenText.includes("브라운관tv") || tokenText.includes("빈티지")) score += 8;
  }

  if (hasAny(rawTags, ["고원", "별", "은하수", "몽골", "풍력발전기"])) {
    if (tokenText.includes("별") || tokenText.includes("은하수")) score += 28;
    if (tokenText.includes("고원")) score += 18;
    if (tokenText.includes("몽골")) score += 18;
    if (tokenText.includes("풍력발전기")) score += 8;
  }

  if (hasAny(rawTags, ["발리", "서핑", "서프비치", "서프타운", "라탄"])) {
    if (tokenText.includes("서프비치")) score += 32;
    if (tokenText.includes("서프타운") || tokenText.includes("양리단길")) score += 20;
    if (tokenText.includes("발리") || tokenText.includes("라탄") || tokenText.includes("프라이빗비치")) score += 18;
    if (tokenText.includes("해안도로") && !tokenText.includes("서핑")) score -= 8;
  }

  if (hasAny(rawTags, ["유럽감성", "유럽", "정원", "성당", "프로방스", "산토리니"])) {
    if (tokenText.includes("정원") || tokenText.includes("수목원")) score += 18;
    if (tokenText.includes("성당") || tokenText.includes("유럽마을")) score += 16;
    if (tokenText.includes("작은유럽") || tokenText.includes("프로방스") || tokenText.includes("산토리니")) score += 12;
    if (tokenText.includes("알프스") && !hasAny(tags, ["목장", "초원"])) score -= 4;
  }

  if (hasAny(rawTags, ["호수", "반영", "sns", "데크길", "에메랄드호수"])) {
    if (tokenText.includes("한반도섬") || tokenText.includes("반영")) score += 28;
    if (tokenText.includes("에메랄드호수")) score += 24;
    if (tokenText.includes("호수") || tokenText.includes("데크길")) score += 14;
    if (tokenText.includes("료칸") || tokenText.includes("숙소")) score -= 12;
  }

  if (hasAny(rawTags, ["카페", "일본풍", "일본감성", "디저트", "서점", "브라운관tv"])) {
    if (tokenText.includes("일본풍") || tokenText.includes("브라운관tv")) score += 26;
    if (tokenText.includes("카페")) score += 14;
    if (tokenText.includes("서점")) score += 10;
    if (tokenText.includes("소품샵")) score += 8;
  }

  if (hasAny(rawTags, ["꽃밭", "라벤더", "양귀비", "샤스타데이지"])) {
    if (tokenText.includes("라벤더")) score += 32;
    if (tokenText.includes("양귀비")) score += 22;
    if (tokenText.includes("샤스타데이지")) score += 16;
    if (tokenText.includes("정원")) score += 8;
  }

  if (hasAny(rawTags, ["폐광", "산업유산"])) {
    if (tokenText.includes("폐광")) score += 30;
    if (tokenText.includes("산업유산")) score += 20;
    if (tokenText.includes("흐린날") || tokenText.includes("비오는")) score += 8;
  }


  if (wantsLodging(input)) {
    if (hasAny(rawTags, ["히노끼탕", "히노끼사우나"]) && tokenText.includes("히노끼탕")) score += 14;
    if (hasAny(rawTags, ["다도"]) && tokenText.includes("다도")) score += 10;
    if (hasAny(rawTags, ["자쿠지"]) && tokenText.includes("자쿠지")) score += 8;
    if (tokenText.includes("리조트") && !hasAny(rawTags, ["리조트"])) score -= 10;
  }

  return { score, reasons };
}

function normalizeInputList(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => normalizeInputList(item));
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  return raw.split(/[,/·|]+/g).map(normalizeTag).filter(Boolean);
}

function placeSearchText(place: GoatPlace): string {
  return normalizeTag([
    place.name,
    place.city,
    place.regionGroup,
    place.placeType,
    place.primaryMood,
    ...(place.moodTags ?? []),
    ...(place.searchTags ?? []),
    place.photoPoint,
    place.recommendationUse,
    place.bestTimeRaw,
    place.bestSeasonRaw,
    place.accessibility?.raw,
    place.note,
    place.dataStatus
  ].filter(Boolean).join(" "));
}

function companionScore(input: RecommendationInput, place: GoatPlace): number {
  const companions = normalizeInputList(input.companionType);
  if (companions.length === 0) return 0;

  const text = placeSearchText(place);
  let score = 0;

  for (const companion of companions) {
    if (["혼자", "혼행", "solo", "1인", "나홀로"].some((keyword) => companion.includes(normalizeTag(keyword)))) {
      if (includesAny(text, ["조용함", "서점", "미술관", "숲길", "정원", "성당", "카페", "산책", "호수"])) score += 5;
      if (includesAny(text, ["가족여행", "테마파크", "동물교감", "극혼잡"])) score -= 2;
    }

    if (["연인", "커플", "데이트", "couple"].some((keyword) => companion.includes(normalizeTag(keyword)))) {
      if (includesAny(text, ["일몰", "블루아워", "카페", "정원", "오션뷰", "전망", "산토리니", "료칸", "낭만", "해변"])) score += 5;
    }

    if (["친구", "우정", "friends", "동기"].some((keyword) => companion.includes(normalizeTag(keyword)))) {
      if (includesAny(text, ["서핑", "시장", "야간", "먹거리", "카페거리", "로드트립", "포토존", "sns", "액티비티", "버스킹"])) score += 5;
    }

    if (["가족", "아이", "부모", "family", "어린이"].some((keyword) => companion.includes(normalizeTag(keyword)))) {
      if (includesAny(text, ["가족여행", "동물", "목장", "수목원", "정원", "테마파크", "동물교감", "대중상", "자차상"])) score += 6;
      if (includesAny(text, ["차도", "도로촬영", "급경사", "야간", "등산난이도", "절벽", "통제"])) score -= 4;
    }
  }

  return Math.max(-8, Math.min(12, score));
}

function travelPurposeScore(input: RecommendationInput, place: GoatPlace): number {
  const purposes = normalizeInputList(input.travelPurpose);
  if (purposes.length === 0) return 0;

  const text = placeSearchText(place);
  let score = 0;

  for (const purpose of purposes) {
    if (["사진", "사진위주", "포토", "인스타", "sns", "photospot"].some((keyword) => purpose.includes(normalizeTag(keyword)))) {
      if (place.photoPoint) score += 3;
      if (includesAny(text, ["사진스팟", "포토스팟", "포토존", "sns", "인스타", "전망", "오션뷰", "반영", "일몰", "일출", "철길", "라벤더"])) score += 5;
    }

    if (["산책", "가볍게", "걷기", "힐링", "walk"].some((keyword) => purpose.includes(normalizeTag(keyword)))) {
      if (includesAny(text, ["산책", "데크길", "골목산책", "숲길", "정원", "호수", "카페거리", "서점", "해안데크"])) score += 6;
      if (includesAny(text, ["등산", "트레킹", "산악", "고원", "새벽", "밤", "절벽", "출렁다리"])) score -= 4;
    }

    if (["액티비티", "체험", "서핑", "트레킹", "activity"].some((keyword) => purpose.includes(normalizeTag(keyword)))) {
      if (includesAny(text, ["서핑", "스카이워크", "출렁다리", "울렁다리", "케이블카", "트레킹", "목장", "동물", "레포츠", "협곡"])) score += 6;
    }

    if (["휴식", "조용한", "조용함", "감성", "healing", "relax"].some((keyword) => purpose.includes(normalizeTag(keyword)))) {
      if (includesAny(text, ["조용함", "숲", "정원", "카페", "서점", "성당", "미술관", "호수", "료칸", "힐링"])) score += 5;
      if (includesAny(text, ["시장", "야간", "서핑", "액티비티", "버스킹", "극혼잡"])) score -= 3;
    }

    if (["먹거리", "시장", "야간", "food", "night"].some((keyword) => purpose.includes(normalizeTag(keyword)))) {
      if (includesAny(text, ["시장", "먹거리", "항구", "야간", "밤거리", "해산물", "버스킹", "오사카", "후쿠오카"])) score += 5;
    }
  }

  return Math.max(-10, Math.min(15, score));
}

function accessLevelScore(level: string | null | undefined, high: number, mid: number, low: number): number {
  const normalized = normalizeTag(level);
  if (normalized.includes("상")) return high;
  if (normalized.includes("중")) return mid;
  if (normalized.includes("하")) return low;
  return 0;
}

function transportScore(input: RecommendationInput, place: GoatPlace): number {
  const transport = normalizeTag(input.transportType);
  if (!transport) return 0;

  const text = placeSearchText(place);
  if (transport.includes("자차") || transport.includes("자동차") || transport.includes("차") || transport.includes("car")) {
    return accessLevelScore(place.accessibility?.car, 6, 3, -3);
  }

  if (transport.includes("대중") || transport.includes("버스") || transport.includes("기차") || transport.includes("뚜벅") || transport.includes("public")) {
    return accessLevelScore(place.accessibility?.publicTransport, 7, 3, -7);
  }

  if (transport.includes("도보") || transport.includes("걷") || transport.includes("walk")) {
    let score = accessLevelScore(place.accessibility?.publicTransport, 4, 1, -5);
    if (includesAny(text, ["산책", "데크길", "골목", "시장", "카페거리", "서점"])) score += 3;
    if (includesAny(text, ["고원", "산", "목장", "드라이브", "자차상", "대중하"])) score -= 3;
    return Math.max(-8, Math.min(8, score));
  }

  return 0;
}

function regionScore(input: RecommendationInput, place: GoatPlace): number {
  if (!input.regionGroup) return 0;
  return input.regionGroup === place.regionGroup ? 26 : -35;
}

function lodgingScore(input: RecommendationInput, place: GoatPlace): number {
  if (!wantsLodging(input)) return 0;
  return isLodgingOrResort(place) ? 30 : -28;
}

function scorePlace(input: RecommendationInput, place: GoatPlace) {
  const tagResult = tagMatchScore(input, place);
  const sceneResult = sceneSpecificScore(input, place);
  const region = regionScore(input, place);
  const lodging = lodgingScore(input, place);
  const season = seasonScore(input, place);
  const time = timeScore(input, place);
  const weather = weatherScore(input, place);
  const companion = companionScore(input, place);
  const travelPurpose = travelPurposeScore(input, place);
  const transport = transportScore(input, place);
  const status = statusScore(place);

  const rawScore = tagResult.score + sceneResult.score + region + lodging + season + time + weather + companion + travelPurpose + transport + status;
  const displayScore = Math.min(98, Math.max(0, rawScore / 2.4));

  return {
    score: Number(displayScore.toFixed(1)),
    matchedTags: tagResult.matchedTags,
    scoreBreakdown: {
      tag: Number(tagResult.score.toFixed(1)),
      sceneSpecific: Number(sceneResult.score.toFixed(1)),
      region: Number(region.toFixed(1)),
      lodgingIntent: Number(lodging.toFixed(1)),
      season: Number(season.toFixed(1)),
      time: Number(time.toFixed(1)),
      weather: Number(weather.toFixed(1)),
      companion: Number(companion.toFixed(1)),
      travelPurpose: Number(travelPurpose.toFixed(1)),
      transport: Number(transport.toFixed(1)),
      dataStatus: Number(status.toFixed(1)),
      directMatchCount: tagResult.directMatchCount
    }
  };
}

function dataStatusLabel(place: GoatPlace): string {
  if (place.dataStatus === "confirmed") return "검증 완료";
  if (place.dataStatus === "future_candidate") return "후보 장소";
  if (place.dataStatus === "needs_verification") return "운영 확인 필요";
  return "확인 필요";
}

function getSafetyNotes(place: GoatPlace): string[] {
  const text = [place.note, place.recommendationUse, place.placeType, place.bestTimeRaw, place.dataStatus].filter(Boolean).join(" ");
  const rules: Array<[string, string]> = [
    ["needs_verification", "운영 상태 확인 필요"],
    ["future_candidate", "후보 장소로 방문 전 정보 확인 권장"],
    ["도로", "도로·기상 상태 확인 필요"],
    ["통제", "운영·통제 여부 확인 필요"],
    ["안전", "안전 공지 확인 필요"],
    ["야간", "야간 방문 주의"],
    ["파도", "해안 안전 주의"],
    ["입산", "입산 통제 확인 필요"],
    ["운영", "운영 여부 확인 필요"]
  ];
  return Array.from(new Set(rules.filter(([keyword]) => text.includes(keyword)).map(([, note]) => note))).slice(0, 3);
}

function buildReason(place: GoatPlace, matchedTags: string[]): string {
  const readable = (place.moodTags ?? []).filter((tag) => matchedTags.includes(normalizeTag(tag))).slice(0, 3);
  const tags = readable.length > 0 ? readable.join(", ") : (place.moodTags ?? []).slice(0, 2).join(", ");
  const statusTail = place.dataStatus === "future_candidate"
    ? " 후보 장소라 방문 전 운영·접근 정보를 확인하면 좋아요."
    : place.dataStatus === "needs_verification"
      ? " 단, 운영 상태 확인이 필요해요."
      : "";
  return `선택한 분위기와 ${tags} 태그가 맞고, ${place.photoPoint ?? "대표 포인트"}에서 사진 결과물이 기대돼요.${statusTail}`;
}

function weatherFitLabel(place: ScoredPlace): string {
  const score = place._scoreBreakdown.weather ?? 0;
  if (score >= 6) return "날씨 적합도 좋음";
  if (score >= 2) return "날씨 적합도 보통 이상";
  if (score < 0) return "날씨 주의 필요";
  return "보통";
}

function parkingInfoLabel(place: GoatPlace): string {
  const car = normalizeTag(place.accessibility?.car);
  if (car.includes("상")) return "자차 접근성 좋음";
  if (car.includes("중")) return "자차 접근성 보통";
  if (car.includes("하")) return "자차 접근성 낮음";
  return "확인 필요";
}

function toCard(place: ScoredPlace, rank: number): RecommendationCard {
  const cardTypes = ["SCENE_BEST", "SAME_MOOD_ALTERNATIVE", "CONDITION_FIT"] as const;
  const labels = {
    SCENE_BEST: "장면 최적",
    SAME_MOOD_ALTERNATIVE: "같은 분위기 대안",
    CONDITION_FIT: "조건 맞춤"
  };
  const cardType = cardTypes[Math.min(rank - 1, 2)];

  return {
    rank,
    cardType,
    cardLabel: labels[cardType],
    placeId: place.placeId,
    name: place.name,
    city: place.city,
    regionGroup: place.regionGroup,
    placeType: place.placeType,
    primaryMood: place.primaryMood,
    dataStatus: place.dataStatus,
    dataStatusLabel: dataStatusLabel(place),
    score: place._score,
    matchedTags: place._matchedTags,
    scoreBreakdown: place._scoreBreakdown,
    reason: buildReason(place, place._matchedTags),
    photoPoint: place.photoPoint ?? null,
    bestTime: place.bestTimeRaw ?? null,
    bestSeason: place.bestSeasonRaw ?? null,
    weatherFit: weatherFitLabel(place),
    crowdLevel: "보통",
    safetyNotes: getSafetyNotes(place),
    parkingInfo: parkingInfoLabel(place),
    accessibility: place.accessibility?.raw ?? null,
    imageUrl: place.imageUrl ?? null,
    mapSearchQuery: place.mapSearchQuery ?? `${place.city} ${place.name}`
  };
}

function fallbackPlaces(input: RecommendationInput, activePool: GoatPlace[], seedPool: GoatPlace[]): ScoredPlace[] {
  const tags = new Set(getWeightedInputTags(input).map((item) => normalizeTag(item.tag)));
  const groups: Array<{ match: string[]; ids: string[] }> = [
    { match: ["숙소", "료칸", "자쿠지"], ids: ["GOAT-007", "GOAT-008", "GOAT-033"] },
    { match: ["바다", "해변", "서핑", "청량함"], ids: ["GOAT-044", "GOAT-040", "GOAT-025"] },
    { match: ["해안도로", "로드트립", "캘리포니아"], ids: ["GOAT-031", "GOAT-044", "GOAT-040"] },
    { match: ["목장", "초원", "알프스"], ids: ["GOAT-017", "GOAT-018", "GOAT-019"] },
    { match: ["일본감성", "일본", "가마쿠라", "골목", "철길"], ids: ["GOAT-029", "GOAT-037", "GOAT-032"] },
    { match: ["숲", "북유럽", "겨울", "설경"], ids: ["GOAT-012", "GOAT-020", "GOAT-024"] },
    { match: ["시장", "야간", "레트로"], ids: ["GOAT-043", "GOAT-038", "GOAT-035"] },
    { match: ["고원", "별", "몽골"], ids: ["GOAT-030", "GOAT-016", "GOAT-023"] },
    { match: ["협곡", "주상절리", "잔도"], ids: ["GOAT-058", "GOAT-010", "GOAT-057"] },
    { match: ["호수", "반영", "sns"], ids: ["GOAT-014", "GOAT-036", "GOAT-010"] },
    { match: ["정원", "유럽감성", "성당"], ids: ["GOAT-001", "GOAT-013", "GOAT-050"] }
  ];

  const matchedGroup = groups.find((group) => group.match.map(normalizeTag).some((tag) => tags.has(tag)));
  const defaultIds = matchedGroup?.ids ?? ["GOAT-025", "GOAT-009", "GOAT-017"];
  const lookupPool = seedPool.length > 0 ? seedPool : activePool;

  const prioritized = [
    ...defaultIds.map((id) => lookupPool.find((item) => item.placeId === id)),
    ...activePool,
    ...lookupPool,
  ].filter((place): place is GoatPlace => Boolean(place));
  const unique = Array.from(new Map(prioritized.map((place) => [place.placeId, place])).values());

  return unique
    .slice(0, 3)
    .map((place, index) => ({
      ...place,
      _score: 75 - index * 3,
      _matchedTags: (place.moodTags ?? []).slice(0, 2).map(normalizeTag),
      _scoreBreakdown: { fallback: 1 },
    } as ScoredPlace));
}

export function getGoatRecommendations(input: RecommendationInput, places: GoatPlace[]): RecommendationApiResponse {
  try {
    const { seedPool, availableSeedPool, activePool, policy, reason } = buildCandidatePool(input, places);

    if (seedPool.length === 0) {
      return {
        status: "FAILED",
        resultType: "UNKNOWN",
        score: null,
        message: "추천 가능한 장소 seed 데이터가 없습니다.",
        failReason: "EMPTY_SEED_POOL",
        resultData: null
      };
    }

    if (activePool.length === 0) {
      return {
        status: "FAILED",
        resultType: "UNKNOWN",
        score: null,
        message: "현재 조건으로 추천 가능한 장소가 없습니다.",
        failReason: "EMPTY_ACTIVE_POOL",
        resultData: null
      };
    }

    let effectiveActivePool = activePool;
    let effectivePolicy = policy;
    let effectiveReason = reason;
    let scored = scoreCandidatePool(input, effectiveActivePool);
    let adaptivePoolRetryUsed = false;

    if (shouldRetryWithAll58(input, effectivePolicy, scored)) {
      const all58Scored = scoreCandidatePool(input, availableSeedPool);
      const currentTop = scored[0]?._score ?? 0;
      const all58Top = all58Scored[0]?._score ?? 0;
      const all58AddsNewTop3 = all58Scored.slice(0, 3).some((place) => !effectiveActivePool.some((item) => item.placeId === place.placeId));
      if (all58Top >= currentTop || all58AddsNewTop3) {
        effectiveActivePool = availableSeedPool;
        effectivePolicy = "ALL58";
        effectiveReason = `${reason} 단, 태그 조합의 후보 폭이 좁거나 3번째 후보 점수가 약해 58개 전체 pool로 재시도했습니다.`;
        scored = all58Scored;
        adaptivePoolRetryUsed = true;
      }
    }

    const fallbackUsed = (scored[0]?._score ?? 0) < 25;
    const selected = fallbackUsed ? fallbackPlaces(input, effectiveActivePool, availableSeedPool) : scored.slice(0, input.limit ?? 3);
    const recommendations = selected.slice(0, input.limit ?? 3).map((place, index) => toCard(place, index + 1));
    const averageScore = recommendations.reduce((sum, card) => sum + card.score, 0) / Math.max(1, recommendations.length);

    return {
      status: "DONE",
      resultType: "RECOMMEND",
      score: Number(averageScore.toFixed(1)),
      message: fallbackUsed
        ? "일치도가 낮아 기본 추천으로 대체했습니다."
        : `${seedPool.length}개 seed 후보 중 ${effectiveActivePool.length}개 조건 pool 기반 추천이 완료되었습니다.`,
      failReason: null,
      resultData: {
        requestId: input.requestId ?? "demo-request-001",
        inputTags: Array.from(new Set(getAllInputTags(input))),
        seedPoolSize: seedPool.length,
        candidatePoolSize: effectiveActivePool.length,
        poolPolicy: effectivePolicy,
        poolReason: effectiveReason,
        fallbackUsed,
        adaptivePoolRetryUsed,
        recommendations
      }
    };
  } catch (error) {
    return {
      status: "FAILED",
      resultType: "UNKNOWN",
      score: null,
      message: "추천 처리 중 오류가 발생했습니다.",
      failReason: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      resultData: null
    };
  }
}
