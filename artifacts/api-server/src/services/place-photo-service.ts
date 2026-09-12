import type {
  PhotoAsset,
  SceneCover,
  SourceAttribution,
} from "@workspace/api-zod";

const KTO_ATTRIBUTION: SourceAttribution = {
  label: "한국관광공사",
  sourceUrl: "https://www.data.go.kr/data/15101914/openapi.do",
};

export type PhotoMetadata = {
  title?: string;
  keywords?: string[];
  photographyLocation?: string;
};

export type ProviderPhoto = PhotoMetadata & {
  provider: "KTO_PHOTO" | "KTO_TOUR_INFO";
  sourceRef: string;
  url: string;
  placeVerified: boolean;
  rightsConfirmed: boolean;
  license?: string;
  author?: string;
};

export type PlacePhotoInput = {
  placeId: string;
  placeName: string;
  city: string;
  selectionId: string;
  requiredPhotoTerms?: string[];
  preferredPhotoTerms?: string[];
};

type SelectionResult = {
  placeHero: PhotoAsset | null;
  evidenceImages: PhotoAsset[];
  galleryStatus: "AVAILABLE" | "EMPTY";
  sourceAttributions: SourceAttribution[];
};

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^0-9a-z가-힣]/g, "");

const metadataText = (photo: ProviderPhoto) =>
  [photo.title, photo.photographyLocation, ...(photo.keywords ?? [])]
    .filter(Boolean)
    .join(" ");

const photoId = (photo: ProviderPhoto) =>
  `${photo.provider}:${photo.sourceRef}`;

const isInappropriateMetadata = (photo: ProviderPhoto) =>
  /(포스터|로고|지도|전단|배너)/.test(metadataText(photo));

const termsMatch = (photo: ProviderPhoto, terms: string[]) => {
  const text = normalize(metadataText(photo));
  return terms.every((term) => text.includes(normalize(term)));
};

const toAsset = (input: PlacePhotoInput, photo: ProviderPhoto): PhotoAsset => ({
  photoId: photoId(photo),
  placeId: input.placeId,
  provider: photo.provider,
  sourceRef: photo.sourceRef,
  url: photo.url,
  title: photo.title,
  keywords: photo.keywords ?? [],
  photographyLocation: photo.photographyLocation,
  attribution: {
    ...KTO_ATTRIBUTION,
    author: photo.author,
    license: photo.license,
  },
  // KTO API records that reach this service have a confirmed, same-place
  // content record. The provider's crop/share restrictions remain conservative.
  licenseStatus: "CONFIRMED",
  cropPermission: "DENIED",
  identityStatus: "MATCHED",
  contentFit: "contain",
  cacheEnabled: true,
  shareAllowed: false,
});

/**
 * Selects only provider records that are already verified as the requested
 * place. Ranking reads supplied textual metadata only; it is never a
 * recommendation input.
 */
export function selectPlacePhotos(
  input: PlacePhotoInput,
  photos: ProviderPhoto[],
): SelectionResult {
  const seen = new Set<string>();
  const usable = photos.filter((photo) => {
    if (
      !photo.placeVerified ||
      !photo.rightsConfirmed ||
      !photo.url.startsWith("https://") ||
      isInappropriateMetadata(photo)
    ) {
      return false;
    }
    if (seen.has(photo.url)) return false;
    seen.add(photo.url);
    return true;
  });

  const preferred = input.preferredPhotoTerms?.length
    ? usable.filter((photo) => termsMatch(photo, input.preferredPhotoTerms!))
    : [];
  const ordered = [...preferred, ...usable.filter((photo) => !preferred.includes(photo))];
  const evidenceImages = ordered.map((photo) => toAsset(input, photo));

  return {
    placeHero: evidenceImages[0] ?? null,
    evidenceImages,
    galleryStatus: evidenceImages.length ? "AVAILABLE" : "EMPTY",
    sourceAttributions: evidenceImages.length ? [KTO_ATTRIBUTION] : [],
  };
}

export function selectSceneCover(
  input: PlacePhotoInput,
  photos: ProviderPhoto[],
): SceneCover {
  const required = input.requiredPhotoTerms ?? [];
  if (!required.length) {
    return {
      selectionId: input.selectionId,
      kind: "EDITORIAL",
      token: `editorial:${input.selectionId}`,
      fallbackReason: "NO_PHOTO",
    };
  }
  const eligible = photos.filter(
    (photo) =>
      photo.url.startsWith("https://") &&
      photo.placeVerified &&
      photo.rightsConfirmed &&
      !isInappropriateMetadata(photo) &&
      termsMatch(photo, required),
  );
  const selected = selectPlacePhotos(input, eligible).placeHero;

  if (selected) {
    return {
      selectionId: input.selectionId,
      kind: "PHOTO",
      photo: selected,
      picturedPlaceId: input.placeId,
      picturedPlaceName: input.placeName,
      sourceAttributions: [selected.attribution],
    };
  }

  return {
    selectionId: input.selectionId,
    kind: "EDITORIAL",
    token: `editorial:${input.selectionId}`,
    fallbackReason: photos.length ? "IDENTITY_UNKNOWN" : "NO_PHOTO",
  };
}

export { KTO_ATTRIBUTION };
