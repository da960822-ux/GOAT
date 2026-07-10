import {
  GoatPlaceDataset,
  GoatReferenceCardDataset,
  RecommendRequest,
  RecommendResult,
  RecommendationCard,
} from "./goatRecommendationTypes";
import { recommendGoatPlaces } from "./goatRecommendationEngine";
import {
  RecommendationExposureRepository,
} from "./recommendationExposureRepository";

export interface RecommendationServiceBody extends Omit<RecommendRequest, "recentExposureByPlaceId" | "totalExposureByPlaceId" | "themeAverageExposure" | "excludePlaceIds"> {
  /** 다시 추천 버튼을 눌렀을 때 직전 추천 requestId. 이 요청의 카드 3개는 excludePlaceIds로 강제 제외된다. */
  rerollOfRequestId?: string;
  /** 프론트/백엔드가 이미 제외해야 할 장소를 알고 있을 때 추가로 전달한다. */
  excludePlaceIds?: string[];
}

export interface RecommendationServiceContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  /** 최근 몇 개의 노출 카드 row를 recentExposureByPlaceId 계산에 쓸지. 기본 20. */
  recentLimit?: number;
  now?: Date;
}

export interface CreateGoatRecommendationParams {
  body: RecommendationServiceBody;
  context?: RecommendationServiceContext;
  placesDataset: GoatPlaceDataset;
  referenceDataset?: GoatReferenceCardDataset;
  exposureRepository: RecommendationExposureRepository;
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function createRequestId(now: Date): string {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `REQ_${now.getTime()}_${random}`;
}

function pickPrimaryThemeForExposure(body: RecommendationServiceBody, result: RecommendResult): string | undefined {
  return result.resultData?.request.primaryTheme ?? (body.primaryTheme ? String(body.primaryTheme) : undefined);
}

function toExposureCards(cards: RecommendationCard[]) {
  return cards.map((card) => ({
    placeId: card.placeId,
    rankNo: card.rank,
    cardRole: card.role,
  }));
}

/**
 * 실제 백엔드 API에서 호출할 서비스 레이어 예시.
 * 핵심은 추천 엔진 호출 전 exposureStats를 조회해서 넘기고,
 * 추천 결과를 exposure log로 저장해 다음 추천/다시 추천에 반영하는 것이다.
 */
export async function createGoatRecommendation(params: CreateGoatRecommendationParams): Promise<RecommendResult> {
  const now = params.context?.now ?? new Date();
  const requestId = params.context?.requestId ?? createRequestId(now);

  const previousPlaceIds = params.body.rerollOfRequestId
    ? await params.exposureRepository.findPlaceIdsByRequestId(params.body.rerollOfRequestId)
    : [];

  const exposureStats = await params.exposureRepository.getExposureStats({
    userId: params.context?.userId,
    sessionId: params.context?.sessionId,
    referenceCardId: params.body.referenceCardId,
    primaryTheme: params.body.primaryTheme ? String(params.body.primaryTheme) : undefined,
    recentLimit: params.context?.recentLimit ?? 20,
  });

  const excludePlaceIds = uniq([
    ...(params.body.excludePlaceIds ?? []),
    ...previousPlaceIds,
  ]);

  const result = recommendGoatPlaces(
    {
      ...params.body,
      currentMonth: params.body.currentMonth ?? now.getMonth() + 1,
      excludePlaceIds,
      recentExposureByPlaceId: exposureStats.recentExposureByPlaceId,
      totalExposureByPlaceId: exposureStats.totalExposureByPlaceId,
      themeAverageExposure: exposureStats.themeAverageExposure,
      logContext: {
        ...(params.body.logContext ?? {}),
        requestId,
        userId: params.context?.userId,
        sessionId: params.context?.sessionId,
        rerollOfRequestId: params.body.rerollOfRequestId,
        excludePlaceIds,
      },
    },
    params.placesDataset,
    params.referenceDataset,
  );

  if (result.resultData) {
    result.resultData.requestId = requestId;
  }

  if (result.status === "DONE" && result.resultData?.cards.length) {
    await params.exposureRepository.saveExposures({
      requestId,
      userId: params.context?.userId,
      sessionId: params.context?.sessionId,
      referenceCardId: params.body.referenceCardId,
      primaryTheme: pickPrimaryThemeForExposure(params.body, result),
      travelPurpose: params.body.travelPurpose ? String(params.body.travelPurpose) : undefined,
      cards: toExposureCards(result.resultData.cards),
      createdAt: now,
    });
  }

  return result;
}
