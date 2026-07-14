import {
  GoatPlaceDataset,
  GoatReferenceCardDataset,
  PrimaryTheme,
  RecommendRequest,
  RecommendResult,
  RecommendationWarning,
  TransportType,
  PurposeTag,
  SeasonTag,
} from "./goatRecommendationTypes";
import { recommendGoatPlaces } from "./goatRecommendationEngine";

export type AiPhotoAnalysisStatus = "DONE" | "LOW_CONFIDENCE" | "NEEDS_REVIEW" | "FAILED";

export interface AiThemeCandidate {
  /** AI가 사진과 가장 비슷하다고 판단한 GOAT 메인 테마. 프론트는 이 후보 3개를 사용자에게 보여준다. */
  primaryTheme: PrimaryTheme | string;
  /** 후보 테마 확신도. 없으면 전체 confidence만 사용한다. */
  confidence?: number;
  /** 왜 이 테마가 추천됐는지 보여주는 화면 표시용 설명. 점수 계산에는 사용하지 않는다. */
  reason?: string;
  /** 해당 테마를 선택했을 때 함께 보정해서 쓸 수 있는 무드 태그. */
  mood_tags?: string[];
  /** 해당 테마를 선택했을 때 함께 보정해서 쓸 수 있는 장면 태그. */
  sceneTags?: string[];
}

export interface AiPhotoAnalysisResult {
  status: AiPhotoAnalysisStatus;
  /** 전체 사진 분석 확신도. 0~1 범위를 권장한다. */
  confidence?: number;
  /** AI가 1순위로 본 테마. primaryThemeCandidates가 있으면 보조값으로만 사용한다. */
  primaryTheme?: PrimaryTheme | string;
  /** 프론트가 보여줄 자동 추천 메인 테마 후보 3개. */
  primaryThemeCandidates?: AiThemeCandidate[];
  /** AI가 사진에서 추출한 공통 무드 태그. 추천 점수 계산에 사용한다. */
  mood_tags?: string[];
  /** AI가 사진에서 추출한 공통 장면 태그. 추천 점수 계산에 사용한다. */
  sceneTags?: string[];
  /** 사용자에게 보여줄 한 줄 요약. 추천 점수 계산에는 사용하지 않는다. */
  summary?: string;
  /** 실패, 낮은 확신도, 판단 보류일 때 원인. */
  failReason?: string | null;
  /** 원본 AI 응답 보관용. 추천 엔진은 사용하지 않는다. */
  raw?: unknown;
}

export interface PhotoRecommendationRequest
  extends Omit<
    RecommendRequest,
    "referenceCardId" | "primaryTheme" | "userMoodTags" | "userSceneTags" | "visitTime"
  > {
  /** AI Vision 모듈이 반환한 분석 JSON. */
  aiAnalysis: AiPhotoAnalysisResult;
  /** 사용자가 AI 추천 테마 3개 중 최종 선택한 테마. 없으면 AI 1순위 후보를 사용한다. */
  selectedPrimaryTheme?: PrimaryTheme | string;
  /** selectedPrimaryTheme 대신 후보 배열 index로 선택하고 싶을 때 사용한다. 0부터 시작한다. */
  selectedThemeIndex?: number;
  travelPurpose?: PurposeTag | string;
  transportType?: TransportType | string;
  currentSeason?: SeasonTag | string;
}

export interface NormalizedPhotoAnalysisForRecommendation {
  primaryTheme?: string;
  userMoodTags: string[];
  userSceneTags: string[];
  selectedThemeCandidate?: AiThemeCandidate;
  themeCandidates: AiThemeCandidate[];
  photoAnalysisConfidence?: number;
  warnings: RecommendationWarning[];
}

const LOW_CONFIDENCE_THRESHOLD = 0.5;
const MIN_TOTAL_TAG_COUNT = 2;

const PHOTO_WARNING_CODES = {
  ANALYSIS_FAILED: "PHOTO_ANALYSIS_FAILED",
  LOW_CONFIDENCE: "PHOTO_ANALYSIS_LOW_CONFIDENCE",
  NEEDS_REVIEW: "PHOTO_ANALYSIS_NEEDS_REVIEW",
  NO_THEME_CANDIDATE: "PHOTO_ANALYSIS_NO_THEME_CANDIDATE",
  INVALID_SELECTED_THEME: "PHOTO_SELECTED_THEME_NOT_IN_CANDIDATES",
  INSUFFICIENT_TAGS: "PHOTO_ANALYSIS_INSUFFICIENT_TAGS",
} as const;

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

function safeNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getAllowedSet(dataset: GoatPlaceDataset, key: string): Set<string> {
  return new Set(dataset.tag_sets?.[key] ?? []);
}

function filterAllowed(values: string[] | undefined, allowed: Set<string>): string[] {
  const clean = uniq(values ?? []);
  if (allowed.size === 0) return clean;
  return clean.filter((value) => allowed.has(value));
}

function normalizeThemeCandidates(
  aiAnalysis: AiPhotoAnalysisResult,
  placesDataset: GoatPlaceDataset,
): AiThemeCandidate[] {
  const themeAllowed = getAllowedSet(placesDataset, "primaryTheme");
  const candidates = aiAnalysis.primaryThemeCandidates?.length
    ? aiAnalysis.primaryThemeCandidates
    : aiAnalysis.primaryTheme
      ? [{ primaryTheme: aiAnalysis.primaryTheme, confidence: aiAnalysis.confidence }]
      : [];

  const validCandidates = candidates
    .filter((candidate) => {
      const theme = String(candidate.primaryTheme ?? "").trim();
      return theme && (themeAllowed.size === 0 || themeAllowed.has(theme));
    })
    .sort((a, b) => (safeNumber(b.confidence) ?? 0) - (safeNumber(a.confidence) ?? 0));

  return validCandidates.slice(0, 3);
}

function pickSelectedThemeCandidate(params: {
  request: PhotoRecommendationRequest;
  candidates: AiThemeCandidate[];
  warnings: RecommendationWarning[];
}): AiThemeCandidate | undefined {
  const { request, candidates, warnings } = params;
  if (candidates.length === 0) return undefined;

  if (typeof request.selectedThemeIndex === "number") {
    const byIndex = candidates[request.selectedThemeIndex];
    if (byIndex) return byIndex;
  }

  if (request.selectedPrimaryTheme) {
    const selected = candidates.find((candidate) => String(candidate.primaryTheme) === String(request.selectedPrimaryTheme));
    if (selected) return selected;

    warnings.push({
      code: PHOTO_WARNING_CODES.INVALID_SELECTED_THEME,
      message: "사용자가 선택한 selectedPrimaryTheme이 AI 추천 후보 3개 안에 없어 AI 1순위 테마로 fallback했습니다.",
      details: {
        selectedPrimaryTheme: String(request.selectedPrimaryTheme),
        aiCandidateThemes: candidates.map((candidate) => String(candidate.primaryTheme)),
      },
    });
  }

  return candidates[0];
}

export function normalizePhotoAnalysisForRecommendation(
  request: PhotoRecommendationRequest,
  placesDataset: GoatPlaceDataset,
): NormalizedPhotoAnalysisForRecommendation {
  const warnings: RecommendationWarning[] = [];
  const aiAnalysis = request.aiAnalysis;
  const confidence = safeNumber(aiAnalysis.confidence);

  if (aiAnalysis.status === "FAILED") {
    warnings.push({
      code: PHOTO_WARNING_CODES.ANALYSIS_FAILED,
      message: "AI 사진 분석이 FAILED 상태입니다. 그래도 사용 가능한 테마/태그가 있으면 추천은 계속 시도합니다.",
      details: { failReason: aiAnalysis.failReason ?? null },
    });
  }

  if (aiAnalysis.status === "LOW_CONFIDENCE" || (confidence !== undefined && confidence < LOW_CONFIDENCE_THRESHOLD)) {
    warnings.push({
      code: PHOTO_WARNING_CODES.LOW_CONFIDENCE,
      message: "AI 사진 분석 confidence가 낮습니다. 사용자가 선택한 테마와 여행 조건 중심으로 추천합니다.",
      details: { confidence, threshold: LOW_CONFIDENCE_THRESHOLD },
    });
  }

  if (aiAnalysis.status === "NEEDS_REVIEW") {
    warnings.push({
      code: PHOTO_WARNING_CODES.NEEDS_REVIEW,
      message: "AI 사진 분석 결과가 애매합니다. 태그가 있으면 추천은 계속 진행하되, 필요하면 프론트에서 재업로드를 안내합니다.",
      details: { failReason: aiAnalysis.failReason ?? null },
    });
  }

  const themeCandidates = normalizeThemeCandidates(aiAnalysis, placesDataset);
  if (themeCandidates.length === 0) {
    warnings.push({
      code: PHOTO_WARNING_CODES.NO_THEME_CANDIDATE,
      message: "AI 분석 결과에서 사용할 수 있는 primaryTheme 후보를 찾지 못했습니다.",
      details: { primaryTheme: aiAnalysis.primaryTheme, candidateCount: aiAnalysis.primaryThemeCandidates?.length ?? 0 },
    });
  }

  const selectedThemeCandidate = pickSelectedThemeCandidate({ request, candidates: themeCandidates, warnings });
  const moodAllowed = getAllowedSet(placesDataset, "mood_tags");
  const sceneAllowed = getAllowedSet(placesDataset, "sceneTags");

  const userMoodTags = filterAllowed(
    [...(aiAnalysis.mood_tags ?? []), ...(selectedThemeCandidate?.mood_tags ?? [])],
    moodAllowed,
  );
  const userSceneTags = filterAllowed(
    [...(aiAnalysis.sceneTags ?? []), ...(selectedThemeCandidate?.sceneTags ?? [])],
    sceneAllowed,
  );

  if (userMoodTags.length + userSceneTags.length < MIN_TOTAL_TAG_COUNT) {
    warnings.push({
      code: PHOTO_WARNING_CODES.INSUFFICIENT_TAGS,
      message: "AI 분석에서 추천 점수 계산에 쓸 수 있는 mood_tags + sceneTags가 2개 미만입니다.",
      details: {
        moodTagCount: userMoodTags.length,
        sceneTagCount: userSceneTags.length,
        minimumTotalTagCount: MIN_TOTAL_TAG_COUNT,
      },
    });
  }

  return {
    primaryTheme: selectedThemeCandidate ? String(selectedThemeCandidate.primaryTheme) : undefined,
    userMoodTags,
    userSceneTags,
    selectedThemeCandidate,
    themeCandidates,
    photoAnalysisConfidence: confidence,
    warnings,
  };
}

/**
 * 사진으로 찾기 전용 어댑터.
 * AI Vision 분석 JSON + 사용자가 고른 테마 + 여행 조건을 기존 추천 엔진 입력값으로 변환한다.
 */
export function recommendGoatPlacesFromPhotoAnalysis(
  photoRequest: PhotoRecommendationRequest,
  placesDataset: GoatPlaceDataset,
  referenceDataset?: GoatReferenceCardDataset,
): RecommendResult {
  const normalizedPhoto = normalizePhotoAnalysisForRecommendation(photoRequest, placesDataset);

  const engineRequest: RecommendRequest = {
    ...photoRequest,
    primaryTheme: normalizedPhoto.primaryTheme,
    userMoodTags: normalizedPhoto.userMoodTags,
    userSceneTags: normalizedPhoto.userSceneTags,
    logContext: {
      ...(photoRequest.logContext ?? {}),
      inputMode: "PHOTO",
      photoAnalysisStatus: photoRequest.aiAnalysis.status,
      photoAnalysisConfidence: normalizedPhoto.photoAnalysisConfidence,
      selectedPrimaryTheme: normalizedPhoto.primaryTheme,
      aiCandidateThemes: normalizedPhoto.themeCandidates.map((candidate) => String(candidate.primaryTheme)),
    },
  };

  const result = recommendGoatPlaces(engineRequest, placesDataset, referenceDataset);

  if (result.resultData) {
    result.resultData.warnings = [...normalizedPhoto.warnings, ...result.resultData.warnings];
    result.resultData.request = {
      ...result.resultData.request,
      primaryTheme: normalizedPhoto.primaryTheme ?? result.resultData.request.primaryTheme,
      userMoodTags: normalizedPhoto.userMoodTags,
      userSceneTags: normalizedPhoto.userSceneTags,
    };

    if (photoRequest.debug) {
      result.resultData.debug = {
        ...(result.resultData.debug ?? { candidatePoolSize: 0, scoredCandidates: [] }),
        photoAnalysis: {
          status: photoRequest.aiAnalysis.status,
          confidence: normalizedPhoto.photoAnalysisConfidence,
          selectedPrimaryTheme: normalizedPhoto.primaryTheme,
          candidateThemes: normalizedPhoto.themeCandidates.map((candidate) => ({
            primaryTheme: String(candidate.primaryTheme),
            confidence: candidate.confidence,
            reason: candidate.reason,
          })),
          summary: photoRequest.aiAnalysis.summary,
        },
      };
    }
  }

  return result;
}
