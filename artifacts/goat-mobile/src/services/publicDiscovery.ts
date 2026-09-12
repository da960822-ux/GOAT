import {
  createLatestRequest,
  createPublicRecommendation,
  getPlace,
  replacePublicRecommendationCard,
  type DiscoveryMode,
  type DiscoveryTransportType,
  type Place,
  type PublicRecommendationCard,
  type PublicRecommendationData,
  type ReplaceReason,
} from "@workspace/api-client-react";

const recommendationRequests = createLatestRequest();

export type DisplayCard = PublicRecommendationCard & { place: Place | null };

export class StaleDiscoveryResponse extends Error {
  constructor() {
    super("A newer discovery request replaced this response.");
  }
}

export async function requestPublicRecommendation(input: {
  selectionId: string;
  mode?: DiscoveryMode;
  transportType?: DiscoveryTransportType;
}) {
  const request = recommendationRequests.begin();
  const response = await createPublicRecommendation(input);
  if (!recommendationRequests.isLatest(request)) throw new StaleDiscoveryResponse();
  return response.data;
}

export async function replacePublicCard(
  recommendation: PublicRecommendationData,
  targetSlot: number,
  seenIds: string[],
  replaceReason: ReplaceReason,
  transportType?: DiscoveryTransportType,
) {
  const request = recommendationRequests.begin();
  const currentPlaceIds = recommendation.cards.map((card) => card.placeId);
  const response = await replacePublicRecommendationCard({
    selectionId: recommendation.selectionId,
    mode: recommendation.mode,
    transportType,
    revision: recommendation.revision,
    snapshotAt: recommendation.snapshotAt,
    currentPlaceIds,
    targetSlot,
    seenIds,
    replaceReason,
  });
  if (!recommendationRequests.isLatest(request)) throw new StaleDiscoveryResponse();
  return response.data;
}

export async function hydrateDisplayCards(cards: PublicRecommendationCard[]): Promise<DisplayCard[]> {
  return Promise.all(
    cards.map(async (card) => {
      try {
        const response = await getPlace(card.placeId);
        return { ...card, place: response.data.place };
      } catch {
        return { ...card, place: null };
      }
    }),
  );
}
