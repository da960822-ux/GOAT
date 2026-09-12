import type { AccessGrade, GoatPlace } from "./goatRecommendationTypes";

export const DISCOVERY_POLICY_VERSION = "goat-discovery-r4" as const;
export const DISCOVERY_RELATION_RULE_VERSION = "goat-relation-r4" as const;
const TODAY_COMPARISON_LIMIT = 8;

export type DiscoveryMode = "SCENE" | "TODAY";
export type DiscoveryTransportType = "CAR" | "PUBLIC_TRANSIT";
export type MatchType = "EXACT" | "SIMILAR" | "EXPANDED" | "NONE";
export type SceneFitBand = "RICH" | "BASE";
export type ReplaceReason =
  | "ANY"
  | "LESS_RAIN"
  | "LESS_CROWDED"
  | "BETTER_PUBLIC_TRANSIT";
export type SelectionAvailability =
  | "AVAILABLE"
  | "RULE_INCOMPLETE"
  | "SELECTION_UNAVAILABLE";
export type FeatureState = "SUPPORTED" | "CONTRADICTED" | "UNCONFIRMED";
export type TodayFactor = "WEATHER" | "VISIT_CONCENTRATION";
export type TodayStatus =
  | "NOT_REQUESTED"
  | "APPLIED"
  | "NO_CHANGE"
  | "UNAVAILABLE";
export type TodaySkipReason =
  | "TIMEOUT"
  | "NO_DATA"
  | "NOT_COMPARABLE"
  | "SINGLE_CANDIDATE"
  | "INVALID_DATA";

export type DiscoveryPlace = GoatPlace;

export interface AllowedExpansion {
  ruleId: string;
  relaxedFeatures: string[];
  substituteFeatures: string[];
  explanation: string;
}

export interface SelectionDefinition {
  selectionId: string;
  kind: "MOOD" | "SCENE";
  title: string;
  description: string;
  featuredOrder: number;
  parentMoodId: string | null;
  protectedFeatures: string[];
  requiredFeatures: string[];
  supportingFeatures: string[];
  allowedExpansion: AllowedExpansion[];
  sceneCoverCandidates: string[];
  sceneCoverToken: string;
}

export interface CatalogSelection extends SelectionDefinition {
  enabled: boolean;
  availability: SelectionAvailability;
  initialReplacementAvailable: boolean;
  exactCount: number;
  exactOrSimilarCount: number;
  eligibleCount: number;
}

export interface FeatureEvidence {
  state: FeatureState;
  sources: string[];
  conflicts: string[];
}

export interface PlaceRelation {
  matchType: MatchType;
  relationMethod: "RULE_DERIVED";
  sceneFitBand: SceneFitBand;
  matchedFeatures: string[];
  notConfirmedFeatures: string[];
  differenceNote: string | null;
  ruleVersion: typeof DISCOVERY_RELATION_RULE_VERSION;
  ruleComplete: boolean;
}

export interface NormalizedComparableCondition {
  status: "COMPARABLE";
  comparisonKey: string;
  /** B가 정규화한 선호도. 큰 값이 더 유리하다. */
  preference: number;
}

export interface NormalizedUnavailableCondition {
  status: "UNAVAILABLE";
  reason?: TodaySkipReason;
}

export interface NormalizedCandidateConditions {
  weather?: NormalizedComparableCondition | NormalizedUnavailableCondition;
  visitConcentration?:
    | NormalizedComparableCondition
    | NormalizedUnavailableCondition;
}

export type NormalizedConditionsByPlaceId = Record<
  string,
  NormalizedCandidateConditions | undefined
>;

export interface DiscoveryRequest {
  selectionId: string;
  mode: DiscoveryMode;
  transportType?: DiscoveryTransportType;
  normalizedConditions?: NormalizedConditionsByPlaceId;
  /** B/오케스트레이터가 정규화한 이용 불가 장소만 받는다. 공급자 원문은 받지 않는다. */
  unavailablePlaceIds?: string[];
}

export interface PhotoSearchHints {
  kind: "SEARCH_HINT";
  selectionId: string;
  placeId: string;
  requiredTags: string[];
  preferredTags: string[];
  avoidTags: ["지도", "메뉴", "안내판"];
  cropHint: "CENTER";
  heroAspect: "4:5";
}

export interface RankedDiscoveryCandidate extends PlaceRelation {
  placeId: string;
  place: DiscoveryPlace;
}

export interface DiscoveryCard extends Omit<RankedDiscoveryCandidate, "place"> {
  replacementCount: number;
  replaceOptions: ReplaceReason[];
  canReplace: boolean;
}

export interface DiscoverySession extends DiscoveryRequest {
  snapshotAt: string;
  cards: DiscoveryCard[];
  seenIds: string[];
  revision: number;
  todayStatus: TodayStatus;
  appliedFactors: TodayFactor[];
  skippedFactors: Array<{ factor: TodayFactor; reason: TodaySkipReason }>;
  partialApplied: boolean;
}

export interface ReplaceDiscoveryRequest extends DiscoveryRequest {
  snapshotAt: string;
  revision: number;
  currentPlaceIds: string[];
  targetSlot: 1 | 2 | 3;
  seenIds: string[];
  replaceReason: ReplaceReason;
}

export type ReplaceDiscoveryResult =
  | { ok: true; session: DiscoverySession }
  | {
      ok: false;
      code:
        | "NO_REPLACEMENT"
        | "NO_IMPROVING_CANDIDATE"
        | "REVISION_CONFLICT"
        | "STALE_REQUEST";
      session: DiscoverySession;
    };

export function canonicalFeatureId(value: string): string {
  // 기존 tag-dictionary의 aliases에는 연관/확장 의미가 섞여 있으므로
  // r4 관계 판정에서는 명시 태그의 완전 일치만 canonical feature로 쓴다.
  return value.normalize("NFKC").trim();
}

function unique(values: Iterable<string>): string[] {
  return Array.from(
    new Set(Array.from(values, canonicalFeatureId).filter(Boolean)),
  );
}

function sameValues(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function sameMembers(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value) => b.includes(value));
}

function evidenceTokens(value: unknown): string[] {
  if (typeof value !== "string") return [];
  const normalized = value.normalize("NFKC").trim();
  if (!normalized) return [];
  return unique([
    normalized,
    ...normalized
      .split(/[,·/()]+/u)
      .map((part) => part.trim())
      .filter(Boolean),
  ]);
}

function publicFeatureId(feature: string): string {
  return feature.startsWith("theme:")
    ? feature.slice("theme:".length)
    : feature;
}

function explicitFeatureSources(
  place: DiscoveryPlace,
): Array<[string, string]> {
  const sources: Array<[string, string]> = [];
  sources.push([`theme:${String(place.primaryTheme)}`, "primaryTheme"]);
  for (const [field, values] of [
    ["sceneTags", place.sceneTags],
    ["mood_tags", place.mood_tags],
  ] as const) {
    for (const value of values ?? []) sources.push([value, field]);
  }
  for (const [field, value] of [
    ["photo_point", place.photo_point],
    ["place_type", place.place_type],
  ] as const) {
    for (const token of evidenceTokens(value)) sources.push([token, field]);
  }
  return sources;
}

export function normalizePlaceFeatures(
  place: DiscoveryPlace,
  requestedFeatures: string[],
): Record<string, FeatureEvidence> {
  const positive = new Map<string, string[]>();
  for (const [feature, source] of explicitFeatureSources(place)) {
    const id = feature.startsWith("theme:")
      ? feature
      : canonicalFeatureId(feature);
    positive.set(id, [...(positive.get(id) ?? []), source]);
  }
  const negative = new Map<string, string[]>();
  const explicitNegatives = [place.contradictedFeatures, place.negativeFeatures]
    .flatMap((value) => (Array.isArray(value) ? value : []))
    .filter((value): value is string => typeof value === "string");
  for (const feature of explicitNegatives) {
    const id = canonicalFeatureId(feature);
    negative.set(id, [...(negative.get(id) ?? []), "explicit-negative"]);
  }

  return Object.fromEntries(
    requestedFeatures.map((feature) => {
      const id = feature.startsWith("theme:")
        ? feature
        : canonicalFeatureId(feature);
      const positiveSources = positive.get(id) ?? [];
      const negativeSources = negative.get(id) ?? [];
      const conflict = positiveSources.length > 0 && negativeSources.length > 0;
      return [
        feature,
        {
          state: conflict
            ? "UNCONFIRMED"
            : positiveSources.length > 0
              ? "SUPPORTED"
              : negativeSources.length > 0
                ? "CONTRADICTED"
                : "UNCONFIRMED",
          sources: conflict ? [] : positiveSources,
          conflicts: conflict ? [...positiveSources, ...negativeSources] : [],
        } satisfies FeatureEvidence,
      ];
    }),
  );
}

function isRuleComplete(selection: SelectionDefinition): boolean {
  const protectedSet = new Set(selection.protectedFeatures);
  const requiredSet = new Set(selection.requiredFeatures);
  const supportingSet = new Set(selection.supportingFeatures);
  const isCanonicalUnique = (values: string[]) =>
    values.length === new Set(values).size &&
    values.every(
      (value) => value.length > 0 && canonicalFeatureId(value) === value,
    );
  if (
    protectedSet.size === 0 ||
    requiredSet.size === 0 ||
    !isCanonicalUnique(selection.protectedFeatures) ||
    !isCanonicalUnique(selection.requiredFeatures) ||
    !isCanonicalUnique(selection.supportingFeatures) ||
    new Set(selection.allowedExpansion.map(({ ruleId }) => ruleId)).size !==
      selection.allowedExpansion.length
  )
    return false;
  if ([...protectedSet].some((feature) => !requiredSet.has(feature)))
    return false;
  if ([...supportingSet].some((feature) => requiredSet.has(feature)))
    return false;
  return selection.allowedExpansion.every(
    (rule) =>
      rule.ruleId.length > 0 &&
      rule.explanation.length > 0 &&
      rule.relaxedFeatures.length > 0 &&
      rule.substituteFeatures.length > 0 &&
      isCanonicalUnique(rule.relaxedFeatures) &&
      isCanonicalUnique(rule.substituteFeatures) &&
      rule.relaxedFeatures.every(
        (feature) => requiredSet.has(feature) && !protectedSet.has(feature),
      ),
  );
}

export function derivePlaceRelation(
  selection: SelectionDefinition,
  place: DiscoveryPlace,
): PlaceRelation {
  const ruleComplete = isRuleComplete(selection);
  const allFeatures = unique([
    ...selection.requiredFeatures,
    ...selection.supportingFeatures,
    ...selection.allowedExpansion.flatMap(
      ({ substituteFeatures }) => substituteFeatures,
    ),
  ]);
  const evidence = normalizePlaceFeatures(place, allFeatures);
  const state = (feature: string) => evidence[feature]?.state ?? "UNCONFIRMED";
  const protectedSupported = selection.protectedFeatures.every(
    (feature) => state(feature) === "SUPPORTED",
  );
  const exact =
    ruleComplete &&
    selection.requiredFeatures.every(
      (feature) => state(feature) === "SUPPORTED",
    );
  const optionalRequired = selection.requiredFeatures.filter(
    (feature) => !selection.protectedFeatures.includes(feature),
  );
  const similar =
    ruleComplete &&
    !exact &&
    protectedSupported &&
    optionalRequired.some((feature) => state(feature) === "SUPPORTED") &&
    optionalRequired.every((feature) => state(feature) !== "CONTRADICTED");
  const expansion =
    ruleComplete && !exact && !similar && protectedSupported
      ? selection.allowedExpansion.find((rule) => {
          const maintained = selection.requiredFeatures.filter(
            (feature) => !rule.relaxedFeatures.includes(feature),
          );
          return (
            maintained.every((feature) => state(feature) === "SUPPORTED") &&
            rule.substituteFeatures.every(
              (feature) => state(feature) === "SUPPORTED",
            )
          );
        })
      : undefined;
  const matchType: MatchType = !ruleComplete
    ? "NONE"
    : exact
      ? "EXACT"
      : similar
        ? "SIMILAR"
        : expansion
          ? "EXPANDED"
          : "NONE";
  const supportingMatches = selection.supportingFeatures.filter(
    (feature) => state(feature) === "SUPPORTED",
  );
  const matchedFeatures = unique([
    ...selection.requiredFeatures.filter(
      (feature) => state(feature) === "SUPPORTED",
    ),
    ...supportingMatches,
    ...(expansion?.substituteFeatures ?? []),
  ]).map(publicFeatureId);
  const notConfirmedFeatures = selection.requiredFeatures
    .filter((feature) => state(feature) === "UNCONFIRMED")
    .map(publicFeatureId);

  return {
    matchType,
    relationMethod: "RULE_DERIVED",
    sceneFitBand:
      selection.supportingFeatures.length > 0 &&
      supportingMatches.length * 2 >= selection.supportingFeatures.length
        ? "RICH"
        : "BASE",
    matchedFeatures,
    notConfirmedFeatures,
    differenceNote:
      expansion?.explanation ??
      (similar && notConfirmedFeatures.length > 0
        ? `${notConfirmedFeatures.join(", ")} 특징은 아직 확인되지 않았어요.`
        : null),
    ruleVersion: DISCOVERY_RELATION_RULE_VERSION,
    ruleComplete,
  };
}

export function getPhotoSearchHints(
  selection: SelectionDefinition,
  place: DiscoveryPlace,
): PhotoSearchHints {
  const requiredTags = selection.requiredFeatures.filter(
    (feature) => !feature.startsWith("theme:"),
  );
  const requiredSet = new Set(requiredTags);
  const explicitPlaceFeatures = unique([
    ...(place.sceneTags ?? []),
    ...evidenceTokens(place.photo_point),
  ]);
  return {
    kind: "SEARCH_HINT",
    selectionId: selection.selectionId,
    placeId: place.place_id,
    requiredTags,
    preferredTags: explicitPlaceFeatures.filter(
      (feature) =>
        !requiredSet.has(feature) &&
        selection.supportingFeatures.includes(feature),
    ),
    avoidTags: ["지도", "메뉴", "안내판"],
    cropHint: "CENTER",
    heroAspect: "4:5",
  };
}

function isKnownUnavailable(place: DiscoveryPlace): boolean {
  const operatingCondition = place.operatingCondition;
  return (
    place.operationStatus === "UNAVAILABLE" ||
    place.available === false ||
    Boolean(
      operatingCondition &&
      operatingCondition.status === "verified" &&
      operatingCondition.requiresExactDate &&
      operatingCondition.unknownDatePolicy === "exclude",
    )
  );
}

function eligibleUniquePlaces(
  places: DiscoveryPlace[],
  unavailablePlaceIds: string[] = [],
): DiscoveryPlace[] {
  const seenPlaceIds = new Set<string>();
  const seenContentIds = new Set<string>();
  const unavailable = new Set(unavailablePlaceIds);
  return places.filter((place) => {
    if (
      unavailable.has(place.place_id) ||
      isKnownUnavailable(place) ||
      seenPlaceIds.has(place.place_id)
    )
      return false;
    const contentId =
      typeof place.contentId === "string"
        ? place.contentId
        : typeof place.externalIds === "object" && place.externalIds !== null
          ? String(
              (place.externalIds as Record<string, unknown>).ktoContentId ?? "",
            )
          : "";
    if (contentId && seenContentIds.has(contentId)) return false;
    seenPlaceIds.add(place.place_id);
    if (contentId) seenContentIds.add(contentId);
    return true;
  });
}

export function computeSelectionAvailability(
  selection: SelectionDefinition,
  places: DiscoveryPlace[],
  unavailablePlaceIds: string[] = [],
): {
  enabled: boolean;
  availability: SelectionAvailability;
  exactCount: number;
  exactOrSimilarCount: number;
  eligibleCount: number;
} {
  if (!isRuleComplete(selection)) {
    return {
      enabled: false,
      availability: "RULE_INCOMPLETE",
      exactCount: 0,
      exactOrSimilarCount: 0,
      eligibleCount: 0,
    };
  }
  const relations = eligibleUniquePlaces(places, unavailablePlaceIds).map(
    (place) => derivePlaceRelation(selection, place),
  );
  const exactCount = relations.filter(
    ({ matchType }) => matchType === "EXACT",
  ).length;
  const exactOrSimilarCount = relations.filter(
    ({ matchType }) => matchType === "EXACT" || matchType === "SIMILAR",
  ).length;
  const eligibleCount = relations.filter(
    ({ matchType }) => matchType !== "NONE",
  ).length;
  const enabled =
    exactCount >= 1 && exactOrSimilarCount >= 2 && eligibleCount >= 3;
  return {
    enabled,
    availability: enabled ? "AVAILABLE" : "SELECTION_UNAVAILABLE",
    exactCount,
    exactOrSimilarCount,
    eligibleCount,
  };
}

const matchOrder: Record<Exclude<MatchType, "NONE">, number> = {
  EXACT: 0,
  SIMILAR: 1,
  EXPANDED: 2,
};
const fitOrder: Record<SceneFitBand, number> = { RICH: 0, BASE: 1 };
const accessOrder: Record<AccessGrade, number> = { 상: 3, 중: 2, 하: 1 };

function accessGrade(
  place: DiscoveryPlace,
  transportType: DiscoveryTransportType,
): number | null {
  const grade =
    transportType === "CAR"
      ? place.accessibility?.car
      : place.accessibility?.public_transport;
  return grade === "상" || grade === "중" || grade === "하"
    ? accessOrder[grade]
    : null;
}

function groupKey(candidate: RankedDiscoveryCandidate): string {
  return `${candidate.matchType}:${candidate.sceneFitBand}`;
}

function comparablePreference(
  candidate: RankedDiscoveryCandidate,
  factor: keyof NormalizedCandidateConditions,
  conditions: NormalizedConditionsByPlaceId | undefined,
): NormalizedComparableCondition | null {
  const value = conditions?.[candidate.placeId]?.[factor];
  return value?.status === "COMPARABLE" && Number.isFinite(value.preference)
    ? value
    : null;
}

const conditionFactors = ["weather", "visitConcentration"] as const;
const factorNames: Record<(typeof conditionFactors)[number], TodayFactor> = {
  weather: "WEATHER",
  visitConcentration: "VISIT_CONCENTRATION",
};

function usableConditionFactors(
  candidates: RankedDiscoveryCandidate[],
  conditions?: NormalizedConditionsByPlaceId,
): Array<(typeof conditionFactors)[number]> {
  if (candidates.length < 2) return [];
  return conditionFactors.filter((factor) => {
    const values = candidates.map((candidate) =>
      comparablePreference(candidate, factor, conditions),
    );
    return (
      values.every(Boolean) &&
      new Set(values.map((value) => value?.comparisonKey)).size === 1
    );
  });
}

function skippedFactorReason(
  candidates: RankedDiscoveryCandidate[],
  factor: (typeof conditionFactors)[number],
  conditions?: NormalizedConditionsByPlaceId,
): TodaySkipReason {
  if (candidates.length < 2) return "SINGLE_CANDIDATE";
  const values = candidates.map(
    (candidate) => conditions?.[candidate.placeId]?.[factor],
  );
  const explicitReason = values.find(
    (value) => value?.status === "UNAVAILABLE",
  ) as NormalizedUnavailableCondition | undefined;
  if (explicitReason?.reason) return explicitReason.reason;
  if (values.some((value) => value?.status !== "COMPARABLE")) return "NO_DATA";
  return "NOT_COMPARABLE";
}

function rankWithinBoundary(
  candidates: RankedDiscoveryCandidate[],
  mode: DiscoveryMode,
  transportType?: DiscoveryTransportType,
  conditions?: NormalizedConditionsByPlaceId,
  transportComparableOverride?: boolean,
): RankedDiscoveryCandidate[] {
  const usableFactors =
    mode === "TODAY" ? usableConditionFactors(candidates, conditions) : [];
  const transportComparable =
    transportComparableOverride ??
    (Boolean(transportType) &&
      candidates.every(
        (candidate) => accessGrade(candidate.place, transportType!) !== null,
      ));

  return [...candidates].sort((a, b) => {
    for (const factor of usableFactors) {
      const byFactor =
        comparablePreference(b, factor, conditions)!.preference -
        comparablePreference(a, factor, conditions)!.preference;
      if (byFactor !== 0) return byFactor;
    }
    if (transportType && transportComparable) {
      const byTransport =
        accessGrade(b.place, transportType)! -
        accessGrade(a.place, transportType)!;
      if (byTransport !== 0) return byTransport;
    }
    return a.placeId.localeCompare(b.placeId);
  });
}

interface RankingResult {
  candidates: RankedDiscoveryCandidate[];
  baseline: RankedDiscoveryCandidate[];
  appliedFactors: TodayFactor[];
  skippedFactors: Array<{ factor: TodayFactor; reason: TodaySkipReason }>;
}

function rankDiscoveryCandidatesDetailed(params: {
  selection: SelectionDefinition;
  places: DiscoveryPlace[];
  mode: DiscoveryMode;
  transportType?: DiscoveryTransportType;
  normalizedConditions?: NormalizedConditionsByPlaceId;
  unavailablePlaceIds?: string[];
}): RankingResult {
  const candidates = eligibleUniquePlaces(
    params.places,
    params.unavailablePlaceIds,
  )
    .map((place) => ({
      place,
      placeId: place.place_id,
      ...derivePlaceRelation(params.selection, place),
    }))
    .filter(
      (
        candidate,
      ): candidate is RankedDiscoveryCandidate & {
        matchType: Exclude<MatchType, "NONE">;
      } => candidate.matchType !== "NONE",
    )
    .sort(
      (a, b) =>
        matchOrder[a.matchType] - matchOrder[b.matchType] ||
        fitOrder[a.sceneFitBand] - fitOrder[b.sceneFitBand] ||
        a.placeId.localeCompare(b.placeId),
    );
  const groups = new Map<string, RankedDiscoveryCandidate[]>();
  for (const candidate of candidates)
    groups.set(groupKey(candidate), [
      ...(groups.get(groupKey(candidate)) ?? []),
      candidate,
    ]);
  const baseline = Array.from(groups.values()).flatMap((group) =>
    rankWithinBoundary(
      group,
      "SCENE",
      params.transportType,
      params.normalizedConditions,
    ),
  );
  if (params.mode === "SCENE")
    return {
      candidates: baseline,
      baseline,
      appliedFactors: [],
      skippedFactors: [],
    };

  const comparisonIds = new Set(
    baseline.slice(0, TODAY_COMPARISON_LIMIT).map(({ placeId }) => placeId),
  );
  const result = [...baseline];
  const applied = new Set<TodayFactor>();
  const skipped = new Map<TodayFactor, TodaySkipReason>();
  for (const group of groups.values()) {
    const comparable = baseline.filter(
      (candidate) =>
        groupKey(candidate) === groupKey(group[0]!) &&
        comparisonIds.has(candidate.placeId),
    );
    if (comparable.length === 0) continue;
    const usable = new Set(
      usableConditionFactors(comparable, params.normalizedConditions),
    );
    for (const factor of conditionFactors) {
      const name = factorNames[factor];
      if (usable.has(factor)) applied.add(name);
      else if (!skipped.has(name))
        skipped.set(
          name,
          skippedFactorReason(comparable, factor, params.normalizedConditions),
        );
    }
    const reordered = rankWithinBoundary(
      comparable,
      "TODAY",
      params.transportType,
      params.normalizedConditions,
      Boolean(params.transportType) &&
        group.every(
          (candidate) =>
            accessGrade(candidate.place, params.transportType!) !== null,
        ),
    );
    const positions = result
      .map((candidate, index) =>
        comparisonIds.has(candidate.placeId) &&
        groupKey(candidate) === groupKey(group[0]!)
          ? index
          : -1,
      )
      .filter((index) => index >= 0);
    positions.forEach((position, index) => {
      result[position] = reordered[index]!;
    });
  }
  return {
    candidates: result,
    baseline,
    appliedFactors: [...applied],
    skippedFactors: [...skipped].map(([factor, reason]) => ({
      factor,
      reason,
    })),
  };
}

export function rankDiscoveryCandidates(
  params: Parameters<typeof rankDiscoveryCandidatesDetailed>[0],
): RankedDiscoveryCandidate[] {
  return rankDiscoveryCandidatesDetailed(params).candidates;
}

function slotCandidates(
  candidates: RankedDiscoveryCandidate[],
  targetSlot: 1 | 2 | 3,
): RankedDiscoveryCandidate[] {
  if (targetSlot === 1)
    return candidates.filter(({ matchType }) => matchType === "EXACT");
  if (targetSlot === 2)
    return candidates.filter(
      ({ matchType }) => matchType === "EXACT" || matchType === "SIMILAR",
    );
  const strict = candidates.filter(
    ({ matchType }) => matchType === "EXACT" || matchType === "SIMILAR",
  );
  return strict.length > 0
    ? strict
    : candidates.filter(({ matchType }) => matchType === "EXPANDED");
}

function isStrictImprovement(
  reason: Exclude<ReplaceReason, "ANY">,
  candidate: RankedDiscoveryCandidate,
  current: RankedDiscoveryCandidate,
  conditions?: NormalizedConditionsByPlaceId,
): boolean {
  if (
    candidate.matchType !== current.matchType ||
    candidate.sceneFitBand !== current.sceneFitBand
  )
    return false;
  if (reason === "BETTER_PUBLIC_TRANSIT") {
    const candidateGrade = accessGrade(candidate.place, "PUBLIC_TRANSIT");
    const currentGrade = accessGrade(current.place, "PUBLIC_TRANSIT");
    return (
      candidateGrade !== null &&
      currentGrade !== null &&
      candidateGrade > currentGrade
    );
  }
  const factor = reason === "LESS_RAIN" ? "weather" : "visitConcentration";
  const candidateValue = comparablePreference(candidate, factor, conditions);
  const currentValue = comparablePreference(current, factor, conditions);
  return (
    candidateValue !== null &&
    currentValue !== null &&
    candidateValue.comparisonKey === currentValue.comparisonKey &&
    candidateValue.preference > currentValue.preference
  );
}

export function getReplacementCandidates(params: {
  selection: SelectionDefinition;
  places: DiscoveryPlace[];
  currentPlaceIds: string[];
  targetSlot: 1 | 2 | 3;
  seenIds: string[];
  mode: DiscoveryMode;
  transportType?: DiscoveryTransportType;
  normalizedConditions?: NormalizedConditionsByPlaceId;
  unavailablePlaceIds?: string[];
  replaceReason: ReplaceReason;
}): RankedDiscoveryCandidate[] {
  const ranked = rankDiscoveryCandidates(params);
  const blocked = new Set([...params.currentPlaceIds, ...params.seenIds]);
  const allowed = slotCandidates(
    ranked.filter(({ placeId }) => !blocked.has(placeId)),
    params.targetSlot,
  );
  const replaceReason = params.replaceReason;
  if (replaceReason === "ANY") return allowed;
  const currentId = params.currentPlaceIds[params.targetSlot - 1];
  const current = ranked.find(({ placeId }) => placeId === currentId);
  return current
    ? allowed.filter((candidate) =>
        isStrictImprovement(
          replaceReason,
          candidate,
          current,
          params.normalizedConditions,
        ),
      )
    : [];
}

function decorateCards(params: {
  selection: SelectionDefinition;
  places: DiscoveryPlace[];
  currentPlaceIds: string[];
  seenIds: string[];
  request: DiscoveryRequest;
}): DiscoveryCard[] {
  const ranked = rankDiscoveryCandidates({
    selection: params.selection,
    places: params.places,
    mode: params.request.mode,
    transportType: params.request.transportType,
    normalizedConditions: params.request.normalizedConditions,
    unavailablePlaceIds: params.request.unavailablePlaceIds,
  });
  return params.currentPlaceIds.map((placeId, index) => {
    const candidate = ranked.find((item) => item.placeId === placeId);
    if (!candidate) throw new Error(`PLACE_NOT_FOUND:${placeId}`);
    const common = {
      selection: params.selection,
      places: params.places,
      currentPlaceIds: params.currentPlaceIds,
      targetSlot: (index + 1) as 1 | 2 | 3,
      seenIds: params.seenIds,
      mode: params.request.mode,
      transportType: params.request.transportType,
      normalizedConditions: params.request.normalizedConditions,
      unavailablePlaceIds: params.request.unavailablePlaceIds,
    };
    const replacements = getReplacementCandidates({
      ...common,
      replaceReason: "ANY",
    });
    const replaceOptions: ReplaceReason[] =
      replacements.length > 0 ? ["ANY"] : [];
    for (const reason of [
      "LESS_RAIN",
      "LESS_CROWDED",
      "BETTER_PUBLIC_TRANSIT",
    ] as const) {
      if (
        getReplacementCandidates({ ...common, replaceReason: reason }).length >
        0
      )
        replaceOptions.push(reason);
    }
    const { place: _place, ...relation } = candidate;
    return {
      ...relation,
      replacementCount: replacements.length,
      replaceOptions,
      canReplace: replacements.length > 0,
    };
  });
}

function pickInitialPlaceIds(
  ranked: RankedDiscoveryCandidate[],
): string[] | null {
  const first = ranked.find(({ matchType }) => matchType === "EXACT");
  const second = ranked.find(
    ({ placeId, matchType }) =>
      placeId !== first?.placeId &&
      (matchType === "EXACT" || matchType === "SIMILAR"),
  );
  const strictThird = ranked.find(
    ({ placeId, matchType }) =>
      placeId !== first?.placeId &&
      placeId !== second?.placeId &&
      (matchType === "EXACT" || matchType === "SIMILAR"),
  );
  const third =
    strictThird ??
    ranked.find(
      ({ placeId, matchType }) =>
        placeId !== first?.placeId &&
        placeId !== second?.placeId &&
        matchType === "EXPANDED",
    );
  return first && second && third
    ? [first.placeId, second.placeId, third.placeId]
    : null;
}

export function buildDiscoverySession(params: {
  selection: SelectionDefinition;
  places: DiscoveryPlace[];
  request: DiscoveryRequest;
  snapshotAt: string;
  revision?: number;
}): DiscoverySession {
  if (params.request.selectionId !== params.selection.selectionId)
    throw new Error("SELECTION_NOT_FOUND");
  const ranking = rankDiscoveryCandidatesDetailed({
    selection: params.selection,
    places: params.places,
    mode: params.request.mode,
    transportType: params.request.transportType,
    normalizedConditions: params.request.normalizedConditions,
    unavailablePlaceIds: params.request.unavailablePlaceIds,
  });
  const currentPlaceIds = pickInitialPlaceIds(ranking.candidates);
  const baselinePlaceIds = pickInitialPlaceIds(ranking.baseline);
  if (!currentPlaceIds || !baselinePlaceIds)
    throw new Error("SELECTION_UNAVAILABLE");
  const seenIds = [...currentPlaceIds];
  const todayStatus: TodayStatus =
    params.request.mode === "SCENE"
      ? "NOT_REQUESTED"
      : ranking.appliedFactors.length === 0
        ? "UNAVAILABLE"
        : sameValues(currentPlaceIds, baselinePlaceIds)
          ? "NO_CHANGE"
          : "APPLIED";
  return {
    ...params.request,
    snapshotAt: params.snapshotAt,
    cards: decorateCards({
      selection: params.selection,
      places: params.places,
      currentPlaceIds,
      seenIds,
      request: params.request,
    }),
    seenIds,
    revision: params.revision ?? 0,
    todayStatus,
    appliedFactors: ranking.appliedFactors,
    skippedFactors: ranking.skippedFactors,
    partialApplied:
      ranking.appliedFactors.length > 0 && ranking.skippedFactors.length > 0,
  };
}

export function replaceDiscoveryCard(params: {
  selection: SelectionDefinition;
  places: DiscoveryPlace[];
  session: DiscoverySession;
  request: ReplaceDiscoveryRequest;
}): ReplaceDiscoveryResult {
  const currentIds = params.session.cards.map(({ placeId }) => placeId);
  if (params.request.revision !== params.session.revision) {
    return { ok: false, code: "REVISION_CONFLICT", session: params.session };
  }
  if (
    params.request.selectionId !== params.session.selectionId ||
    params.request.mode !== params.session.mode ||
    params.request.snapshotAt !== params.session.snapshotAt ||
    params.request.transportType !== params.session.transportType ||
    !sameMembers(
      params.request.unavailablePlaceIds ?? [],
      params.session.unavailablePlaceIds ?? [],
    ) ||
    params.request.currentPlaceIds.length !== 3 ||
    !sameValues(params.request.currentPlaceIds, currentIds) ||
    !sameMembers(params.request.seenIds, params.session.seenIds)
  )
    return { ok: false, code: "STALE_REQUEST", session: params.session };

  const candidateInput = {
    selection: params.selection,
    places: params.places,
    currentPlaceIds: currentIds,
    targetSlot: params.request.targetSlot,
    seenIds: params.request.seenIds,
    mode: params.request.mode,
    transportType: params.request.transportType,
    normalizedConditions: params.session.normalizedConditions,
    unavailablePlaceIds: params.session.unavailablePlaceIds,
  };
  const generalCandidates = getReplacementCandidates({
    ...candidateInput,
    replaceReason: "ANY",
  });
  if (generalCandidates.length === 0) {
    return { ok: false, code: "NO_REPLACEMENT", session: params.session };
  }
  const candidates =
    params.request.replaceReason === "ANY"
      ? generalCandidates
      : getReplacementCandidates({
          ...candidateInput,
          replaceReason: params.request.replaceReason,
        });
  const replacement = candidates[0];
  if (!replacement) {
    return {
      ok: false,
      code: "NO_IMPROVING_CANDIDATE",
      session: params.session,
    };
  }

  const nextIds = [...currentIds];
  nextIds[params.request.targetSlot - 1] = replacement.placeId;
  const seenIds = Array.from(
    new Set([...params.request.seenIds, replacement.placeId]),
  );
  const request: DiscoveryRequest = {
    selectionId: params.request.selectionId,
    mode: params.request.mode,
    ...(params.request.transportType
      ? { transportType: params.request.transportType }
      : {}),
    ...(params.session.normalizedConditions
      ? { normalizedConditions: params.session.normalizedConditions }
      : {}),
    ...(params.session.unavailablePlaceIds
      ? { unavailablePlaceIds: params.session.unavailablePlaceIds }
      : {}),
  };
  return {
    ok: true,
    session: {
      ...request,
      snapshotAt: params.session.snapshotAt,
      cards: decorateCards({
        selection: params.selection,
        places: params.places,
        currentPlaceIds: nextIds,
        seenIds,
        request,
      }),
      seenIds,
      revision: params.session.revision + 1,
      todayStatus: params.session.todayStatus,
      appliedFactors: params.session.appliedFactors,
      skippedFactors: params.session.skippedFactors,
      partialApplied: params.session.partialApplied,
    },
  };
}
