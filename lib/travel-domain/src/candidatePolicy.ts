/** Reserved for future temporary exclusions; the first release exposes all 61 catalog entries. */
export const FIRST_RELEASE_PHOTO_HOLDOUT_IDS = new Set<string>();

export function isFirstReleaseCandidate(placeId: string): boolean {
  return !FIRST_RELEASE_PHOTO_HOLDOUT_IDS.has(placeId);
}
