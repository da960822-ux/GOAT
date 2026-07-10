export interface TourPhoto {
  url: string;
  credit?: string;
  keyword?: string;
}

export async function fetchTourPhotos(_placeName: string): Promise<TourPhoto[]> {
  // TODO: Connect to Korea Tourism Organization (한국관광공사) 관광사진 API
  // API docs: https://www.data.go.kr
  // Use CutMatch keyword image matching for photo source and card image
  // Return empty array until API key is configured
  return [];
}

export async function getBestPhotoUrl(_placeName: string): Promise<string | null> {
  // TODO: Fetch photos and return best matching URL for card thumbnail
  // const photos = await fetchTourPhotos(placeName);
  // return photos[0]?.url ?? null;
  return null;
}
