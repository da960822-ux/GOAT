import type { Place } from "@workspace/travel-domain";
import { fetchGooglePlaceDetails, type GoogleMatchConfidence } from "./google-place-photo-provider";
import { googlePlacesContentEnabled } from "../lib/feature-flags";

const googleEntities: Record<string, { googlePlaceId: string; confidence: GoogleMatchConfidence }> = {
  "GOAT-003": { googlePlaceId: "ChIJZRNC-oXvYjURFMTg6uHJHWo", confidence: "HIGH" },
  "GOAT-006": { googlePlaceId: "ChIJ9VSaTtDlYjURoLKkThBCnBQ", confidence: "HIGH" },
  "GOAT-007": { googlePlaceId: "ChIJp7IFC_sfYzUR-XP5JQ7135Q", confidence: "HIGH" },
  "GOAT-008": { googlePlaceId: "ChIJAZZrygrtYjUR0tl6sxyXdgs", confidence: "HIGH" },
  "GOAT-015": { googlePlaceId: "ChIJm7znSADTYzURkPs4BJBX5hw", confidence: "MEDIUM" },
  "GOAT-026": { googlePlaceId: "ChIJl04CBTDDYTURS_Ug_CPZhi8", confidence: "HIGH" },
  "GOAT-032": { googlePlaceId: "ChIJxYmtdAD9YTUREdhk6QusJ7w", confidence: "HIGH" },
  "GOAT-033": { googlePlaceId: "ChIJ0bwUTQDxYTURLSopNwqlHGs", confidence: "HIGH" },
  "GOAT-039": { googlePlaceId: "ChIJT_9b-By92F8RiV25me3JnB0", confidence: "HIGH" },
  "GOAT-042": { googlePlaceId: "ChIJZUP2cLhV318RjPPZSOkFYdI", confidence: "HIGH" },
  "GOAT-045": { googlePlaceId: "ChIJAzYhDNSX2F8RAb6Utv8VOZE", confidence: "HIGH" },
  "GOAT-046": { googlePlaceId: "ChIJtfXJumGN2F8RsJCcuGjWV-s", confidence: "HIGH" },
  "GOAT-048": { googlePlaceId: "ChIJ357uuJO3YTURZEto5Ibu4hs", confidence: "HIGH" },
  "GOAT-050": { googlePlaceId: "ChIJ_aZNXgC3YTURWvfyB45N5A4", confidence: "HIGH" },
};

export async function fetchExternalPlaceInfo(placeId: string, place: Place) {
  if (placeId === "GOAT-031") {
    return {
      provider: "GOAT_EDITORIAL" as const,
      confidence: null,
      canonicalName: place.place_name,
      address: place.address ?? null,
      latitude: place.lat ?? null,
      longitude: place.lng ?? null,
      businessStatus: null,
      phone: null,
      homepage: null,
      openingHours: null,
      googleMapsUri: null,
      scopeNotice: "강릉 교동의 여러 소품샵과 골목을 묶은 GOAT 편집 장소입니다.",
      representativePointNotice: "주소와 좌표는 교동 소품샵 일대 탐색을 위한 대표점이며 개별 매장의 위치나 영업정보를 뜻하지 않습니다.",
      coordinateSource: "KAKAO_MAP_SEARCH_REPRESENTATIVE",
      attribution: { label: "GOAT 자체 큐레이션" },
    };
  }

  const entity = googleEntities[placeId];
  if (!entity || !googlePlacesContentEnabled()) return null;
  const details = await fetchGooglePlaceDetails(entity.googlePlaceId);
  return {
    provider: "GOOGLE_PLACES" as const,
    confidence: entity.confidence,
    ...details,
    scopeNotice: null,
    representativePointNotice: null,
    coordinateSource: "GOOGLE_PLACES",
    attribution: {
      label: "Google Maps",
      ...(details.googleMapsUri ? { sourceUrl: details.googleMapsUri } : {}),
    },
  };
}

export function getGoogleExternalPlaceEntities() {
  return { ...googleEntities };
}
