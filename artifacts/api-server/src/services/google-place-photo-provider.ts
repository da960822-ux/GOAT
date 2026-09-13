import type { GoatPlace } from "@workspace/travel-domain";
import type { ProviderPhoto } from "./place-photo-service";

const PLACES_BASE = "https://places.googleapis.com/v1";
const REQUEST_TIMEOUT_MS = 10_000;

type GoogleAuthorAttribution = {
  displayName?: string;
  uri?: string;
  photoUri?: string;
};

type GooglePhoto = {
  name?: string;
  widthPx?: number;
  heightPx?: number;
  authorAttributions?: GoogleAuthorAttribution[];
  googleMapsUri?: string;
};

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  types?: string[];
  googleMapsUri?: string;
  businessStatus?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  photos?: GooglePhoto[];
};

export type GoogleMatchConfidence = "HIGH" | "MEDIUM" | "LOW";

export type GooglePlaceMatch = {
  placeId: string;
  resolvedName: string;
  formattedAddress: string;
  latitude?: number;
  longitude?: number;
  types: string[];
  googleMapsUri?: string;
  confidence: GoogleMatchConfidence;
};

const normalize = (value: string) => value.toLowerCase().replace(/[^0-9a-z가-힣]/g, "");

const number = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const apiKey = () => {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY_MISSING");
  return key;
};

async function googleRequest(url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "X-Goog-Api-Key": apiKey(),
      ...init.headers,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`GOOGLE_PLACES_${response.status}`);
  return response;
}

const distanceKm = (
  left: { latitude?: number; longitude?: number },
  right: { latitude?: number; longitude?: number },
) => {
  if (left.latitude === undefined || left.longitude === undefined || right.latitude === undefined || right.longitude === undefined) {
    return undefined;
  }
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const deltaLatitude = radians(right.latitude - left.latitude);
  const deltaLongitude = radians(right.longitude - left.longitude);
  const a = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(radians(left.latitude)) * Math.cos(radians(right.latitude)) * Math.sin(deltaLongitude / 2) ** 2;
  return 6_371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

function matchScore(place: GoatPlace, canonicalName: string, candidate: GooglePlace) {
  const expectedNames = [place.place_name, canonicalName].map(normalize).filter(Boolean);
  const candidateName = normalize(candidate.displayName?.text ?? "");
  const address = normalize(candidate.formattedAddress ?? "");
  const city = normalize(place.city);
  let score = 0;
  if (expectedNames.includes(candidateName)) score += 60;
  else if (expectedNames.some((name) => candidateName.includes(name) || name.includes(candidateName))) score += 38;
  if (city && address.includes(city)) score += 20;
  const distance = distanceKm(
    { latitude: number(place.latitude ?? place.lat), longitude: number(place.longitude ?? place.lng) },
    candidate.location ?? {},
  );
  if (distance !== undefined) score += distance <= 1 ? 20 : distance <= 5 ? 12 : distance <= 20 ? 4 : -25;
  return { score, distance };
}

export async function searchGooglePlace(place: GoatPlace, canonicalName = place.place_name): Promise<GooglePlaceMatch | null> {
  const latitude = number(place.latitude ?? place.lat);
  const longitude = number(place.longitude ?? place.lng);
  const body: Record<string, unknown> = {
    textQuery: [canonicalName, place.city, place.address].filter(Boolean).join(" "),
    languageCode: "ko",
    regionCode: "KR",
    maxResultCount: 5,
  };
  if (latitude !== undefined && longitude !== undefined) {
    body.locationBias = { circle: { center: { latitude, longitude }, radius: 20_000 } };
  }
  const response = await googleRequest(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.googleMapsUri",
    },
    body: JSON.stringify(body),
  });
  const candidates = ((await response.json()) as { places?: GooglePlace[] }).places ?? [];
  const ranked = candidates
    .map((candidate) => ({ candidate, ...matchScore(place, canonicalName, candidate) }))
    .sort((left, right) => right.score - left.score);
  const best = ranked[0];
  if (!best?.candidate.id) return null;
  const confidence: GoogleMatchConfidence = best.score >= 75 ? "HIGH" : best.score >= 50 ? "MEDIUM" : "LOW";
  return {
    placeId: best.candidate.id,
    resolvedName: best.candidate.displayName?.text ?? canonicalName,
    formattedAddress: best.candidate.formattedAddress ?? "",
    latitude: best.candidate.location?.latitude,
    longitude: best.candidate.location?.longitude,
    types: best.candidate.types ?? [],
    googleMapsUri: best.candidate.googleMapsUri,
    confidence,
  };
}

async function getGooglePlace(placeId: string): Promise<GooglePlace> {
  const response = await googleRequest(`${PLACES_BASE}/places/${encodeURIComponent(placeId)}`, {
    headers: {
      "X-Goog-FieldMask": "id,displayName,formattedAddress,location,types,googleMapsUri,photos",
    },
  });
  return response.json() as Promise<GooglePlace>;
}

export async function fetchGooglePlaceDetails(placeId: string) {
  const response = await googleRequest(`${PLACES_BASE}/places/${encodeURIComponent(placeId)}`, {
    headers: {
      "X-Goog-FieldMask": "id,displayName,formattedAddress,location,businessStatus,nationalPhoneNumber,websiteUri,regularOpeningHours.weekdayDescriptions,googleMapsUri",
    },
  });
  const place = await response.json() as GooglePlace;
  return {
    canonicalName: place.displayName?.text ?? null,
    address: place.formattedAddress ?? null,
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
    businessStatus: place.businessStatus ?? null,
    phone: place.nationalPhoneNumber ?? null,
    homepage: place.websiteUri ?? null,
    openingHours: place.regularOpeningHours?.weekdayDescriptions?.length
      ? place.regularOpeningHours.weekdayDescriptions
      : null,
    googleMapsUri: place.googleMapsUri ?? null,
  };
}

function publicApiBaseUrl() {
  const configured = (process.env.GOAT_PUBLIC_API_BASE_URL ?? process.env.AUTH_BASE_URL ?? "").trim();
  if (configured) return configured.replace(/\/+$/, "");
  const vercelHost = (process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? "").trim().replace(/\/+$/, "");
  if (!vercelHost) throw new Error("GOAT_PUBLIC_API_BASE_URL_MISSING");
  return /^https?:\/\//i.test(vercelHost) ? vercelHost : `https://${vercelHost}`;
}

export async function fetchGooglePlacePhotos(
  goatPlaceId: string,
  googlePlaceId: string,
  candidateIndexes: number[],
): Promise<ProviderPhoto[]> {
  const place = await getGooglePlace(googlePlaceId);
  const sourceUrl = place.googleMapsUri;
  return candidateIndexes.flatMap((candidateIndex, selectionRank) => {
    const photo = place.photos?.[candidateIndex];
    if (!photo?.name || !sourceUrl) return [];
    const authorAttribution = photo.authorAttributions?.[0];
    return [{
      provider: "GOOGLE_PLACES" as const,
      sourceRef: `google:${googlePlaceId}:${candidateIndex}`,
      url: `${publicApiBaseUrl()}/api/google-place-photo/${encodeURIComponent(goatPlaceId)}/${candidateIndex}`,
      placeVerified: true,
      rightsConfirmed: true,
      width: photo.widthPx,
      height: photo.heightPx,
      author: authorAttribution?.displayName,
      attribution: {
        label: "Google Maps",
        author: authorAttribution?.displayName,
        authorUri: authorAttribution?.uri,
        sourceUrl: photo.googleMapsUri ?? sourceUrl,
      },
      cacheEnabled: false,
      selectionRank,
    }];
  });
}

export async function fetchGooglePhotoMedia(googlePlaceId: string, candidateIndex: number, maxWidthPx = 1200) {
  const place = await getGooglePlace(googlePlaceId);
  const photo = place.photos?.[candidateIndex];
  if (!photo?.name) throw new Error("GOOGLE_PHOTO_NOT_FOUND");
  const response = await googleRequest(
    `${PLACES_BASE}/${photo.name}/media?maxWidthPx=${Math.min(Math.max(maxWidthPx, 64), 4800)}&skipHttpRedirect=true`,
  );
  const payload = await response.json() as { photoUri?: string };
  if (!payload.photoUri) throw new Error("GOOGLE_PHOTO_URI_MISSING");
  const media = await fetch(payload.photoUri, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!media.ok) throw new Error(`GOOGLE_PHOTO_MEDIA_${media.status}`);
  return media;
}
