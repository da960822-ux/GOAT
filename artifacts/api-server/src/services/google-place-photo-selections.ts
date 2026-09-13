export type GooglePlacePhotoSelection = {
  googlePlaceId: string;
  candidateIndexes: number[];
};

// Photo resource names and media URLs are intentionally resolved at request
// time and never persisted. Most entries below are visually approved. A small
// set of identity-only entries is also retained when the Google entity is
// verified but no candidate proves every editorial `photo_point`; those photos
// are still useful as same-place gallery evidence and must not be described as
// proof of the missing point.
const selections: Record<string, GooglePlacePhotoSelection> = {
  "GOAT-002": { googlePlaceId: "ChIJoxIhVlnmYjURx0blpULBf0k", candidateIndexes: [1, 0, 4] },
  "GOAT-003": { googlePlaceId: "ChIJZRNC-oXvYjURFMTg6uHJHWo", candidateIndexes: [2] },
  "GOAT-004": { googlePlaceId: "ChIJHYiZDCfpYjURqelkYhvTJoQ", candidateIndexes: [1, 3] },
  "GOAT-005": { googlePlaceId: "ChIJNxGN3_8kYzUR9tDc2TMGQcI", candidateIndexes: [4] },
  "GOAT-008": { googlePlaceId: "ChIJAZZrygrtYjUR0tl6sxyXdgs", candidateIndexes: [3, 2] },
  "GOAT-014": { googlePlaceId: "ChIJvQRKgoqKYTUR5ybt_Zf203M", candidateIndexes: [4, 1] },
  "GOAT-015": { googlePlaceId: "ChIJm7znSADTYzURkPs4BJBX5hw", candidateIndexes: [1, 0, 3] },
  "GOAT-016": { googlePlaceId: "ChIJJ-wqKnLzYTUR_Tro9d6ViAU", candidateIndexes: [0, 2] },
  "GOAT-017": { googlePlaceId: "ChIJ4eo104v0YTURiVZaVMmLxAI", candidateIndexes: [1, 3] },
  "GOAT-019": { googlePlaceId: "ChIJJ3buh5GJYTUR0IwWXiAnxVk", candidateIndexes: [2, 1, 3] },
  "GOAT-020": { googlePlaceId: "ChIJt3cSDwtxYTUR5EMxx-Q2L1o", candidateIndexes: [1, 3, 4] },
  "GOAT-023": { googlePlaceId: "ChIJsXph90dKYjURwC32xY1e2iU", candidateIndexes: [1] },
  "GOAT-025": { googlePlaceId: "ChIJm6SmvyvDYTURnQOt0HNja1Y", candidateIndexes: [2] },
  "GOAT-032": { googlePlaceId: "ChIJxYmtdAD9YTUREdhk6QusJ7w", candidateIndexes: [0] },
  "GOAT-033": { googlePlaceId: "ChIJ0bwUTQDxYTURLSopNwqlHGs", candidateIndexes: [4] },
  "GOAT-042": { googlePlaceId: "ChIJZUP2cLhV318RjPPZSOkFYdI", candidateIndexes: [2, 4, 0] },
  "GOAT-045": { googlePlaceId: "ChIJAzYhDNSX2F8RAb6Utv8VOZE", candidateIndexes: [0] },
  "GOAT-046": { googlePlaceId: "ChIJtfXJumGN2F8RsJCcuGjWV-s", candidateIndexes: [0] },
  "GOAT-048": { googlePlaceId: "ChIJ357uuJO3YTURZEto5Ibu4hs", candidateIndexes: [4] },
  "GOAT-056": { googlePlaceId: "ChIJMcqExLQ3YjURXAaC_wk-9n0", candidateIndexes: [3, 0] },
  "GOAT-060": { googlePlaceId: "ChIJc6IdTKQhYjURpjSewX_yq64", candidateIndexes: [0, 4] },

  // Identity verified; editorial photo-point fit is partial. Keep the
  // provider path available instead of discarding all same-place photos.
  "GOAT-006": { googlePlaceId: "ChIJ9VSaTtDlYjURoLKkThBCnBQ", candidateIndexes: [0, 4, 1, 2, 3] },
  "GOAT-011": { googlePlaceId: "ChIJmWyoUCP6YjURlrKKvVD1W4o", candidateIndexes: [0, 1, 2, 3, 4] },
  "GOAT-024": { googlePlaceId: "ChIJPWMuyALnYTURTC17g5aCCoU", candidateIndexes: [1, 0, 2, 3, 4] },
  "GOAT-036": { googlePlaceId: "ChIJeye7GgDHYTURN3JY6fVHXk8", candidateIndexes: [4, 0, 1, 2, 3] },
  "GOAT-039": { googlePlaceId: "ChIJT_9b-By92F8RiV25me3JnB0", candidateIndexes: [0, 2, 1, 3, 4] },
  "GOAT-050": { googlePlaceId: "ChIJ_aZNXgC3YTURWvfyB45N5A4", candidateIndexes: [0] },
};

export function getGooglePlacePhotoSelection(placeId: string) {
  return selections[placeId];
}

export function getGooglePlacePhotoSelections() {
  return Object.entries(selections);
}
