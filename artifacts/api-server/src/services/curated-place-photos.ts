import type { ProviderPhoto } from "./place-photo-service";

type CuratedPhoto = ProviderPhoto & { placeId: string };

const photos: CuratedPhoto[] = [
  ["GOAT-010", "2545211", "https://tong.visitkorea.or.kr/cms2/website/11/2545211.jpg", "한국관광공사 김지호", ["협곡", "출렁다리", "물길"]],
  ["GOAT-012", "1840370", "https://tong.visitkorea.or.kr/cms2/website/70/1840370.jpg", "한국관광공사 박은경", ["자작나무", "숲"]],
  ["GOAT-015", "2778521", "https://tong.visitkorea.or.kr/cms2/website/21/2778521.jpg", "강원지사 모먼트스튜디오", ["고원", "산", "성당", "데크"]],
  ["GOAT-016", "3567289", "https://tong.visitkorea.or.kr/cms2/website/89/3567289.jpg", "신동하", ["목장", "초원", "양떼", "길"]],
  ["GOAT-017", "2028799", "https://tong.visitkorea.or.kr/cms2/website/99/2028799.jpg", "한국관광공사 이범수", ["풍력발전기", "초원", "목장", "길"]],
  ["GOAT-018", "1126777", "https://tong.visitkorea.or.kr/cms2/website/77/1126777.jpg", "한국관광공사 김지호", ["풍력발전기", "초원", "목장", "고원"]],
  ["GOAT-019", "2446102", "https://tong.visitkorea.or.kr/cms2/website/02/2446102.jpg", "이상윤", ["설산", "침엽수", "케이블카", "산"]],
  ["GOAT-020", "2461653", "https://tong.visitkorea.or.kr/cms2/website/53/2461653.jpg", "BOKEH", ["레일", "배관", "산업유산", "실내"]],
  ["GOAT-021", "2516886", "https://tong.visitkorea.or.kr/cms2/website/86/2516886.jpg", "한국관광공사 김지호", ["억새", "능선", "산", "길"]],
  ["GOAT-022", "1093183", "https://tong.visitkorea.or.kr/cms2/website/83/1093183.jpg", "한국관광공사 김지호", ["풍력발전기", "고원", "배추밭", "안개"]],
  ["GOAT-024", "2617262", "https://tong.visitkorea.or.kr/cms2/website/62/2617262.jpg", "테마상품팀 IR 스튜디오", ["바다", "해변", "카페", "테라스"]],
].map(([placeId, sourceRef, url, author, keywords]) => ({
  placeId: placeId as string,
  provider: "KTO_PHOTO" as const,
  sourceRef: sourceRef as string,
  url: url as string,
  placeVerified: true,
  rightsConfirmed: true,
  license: "공공누리 제1유형",
  author: author as string,
  keywords: keywords as string[],
}));

export function getCuratedPlacePhotos(placeId: string): ProviderPhoto[] {
  return photos.filter((photo) => photo.placeId === placeId);
}
