/** Catalog entries held out of first-release recommendations until photography is verified. */
export const FIRST_RELEASE_PHOTO_HOLDOUT_IDS = new Set([
  "GOAT-007",
  "GOAT-031",
  "GOAT-035",
  "GOAT-041",
]);

export function isFirstReleaseCandidate(placeId: string): boolean {
  return !FIRST_RELEASE_PHOTO_HOLDOUT_IDS.has(placeId);
}
