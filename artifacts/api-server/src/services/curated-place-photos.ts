import type { ProviderPhoto } from "./place-photo-service";

type CuratedPhoto = ProviderPhoto & { placeId: string };
type CuratedRow = readonly [string, string, string, string | null, readonly string[]];

// Visually reviewed KTO winners only. Failed candidates remain absent so they
// cannot displace a verified Google image or the explicit fallback state.
const rows: CuratedRow[] = [
  ["GOAT-001", "1658415", "https://tong.visitkorea.or.kr/cms2/website/15/1658415.jpg", "한국관광공사 김지호", ["유럽식 정원", "벽돌 게이트", "산책로"]],
  ["GOAT-009", "3584408", "https://tong.visitkorea.or.kr/cms/resource/08/3584408_image2_1.jpg", null, ["현대미술관", "조각정원", "야경"]],
  ["GOAT-010", "2778323", "https://tong.visitkorea.or.kr/cms2/website/23/2778323.jpg", "강원지사 모먼트스튜디오", ["협곡", "출렁다리", "고도감"]],
  ["GOAT-012", "2647634", "https://tong.visitkorea.or.kr/cms2/website/34/2647634.jpg", "두드림", ["자작나무", "목재 숲길", "가을"]],
  ["GOAT-013", "3502670", "https://tong.visitkorea.or.kr/cms/resource/70/3502670_image2_1.jpg", null, ["흰 성당", "종탑", "십자가"]],
  ["GOAT-018", "3477094", "https://tong.visitkorea.or.kr/cms/resource_photo/94/3477094_image2_1.jpg", null, ["설원", "풍력발전기", "고원"]],
  ["GOAT-021", "3414852", "https://tong.visitkorea.or.kr/cms2/website/52/3414852.jpg", "박윤준", ["돌리네", "분지", "능선"]],
  ["GOAT-022", "3566003", "https://tong.visitkorea.or.kr/cms/resource/03/3566003_image2_1.jpg", null, ["고랭지 밭", "능선도로", "풍력발전기"]],
  ["GOAT-026", "2525778", "https://tong.visitkorea.or.kr/cms2/website/78/2525778.jpg", "IR 스튜디오", ["크루즈 리조트", "해안 절벽", "항공"]],
  ["GOAT-027", "2947593", "https://tong.visitkorea.or.kr/cms/resource/93/2947593_image2_1.jpg", null, ["BTS", "버스정류장", "바다"]],
  ["GOAT-028", "2506180", "https://tong.visitkorea.or.kr/cms2/website/80/2506180.jpg", "IR 스튜디오", ["철길 건널목", "바다", "해변", "정동진"]],
  ["GOAT-029", "1964026", "https://tong.visitkorea.or.kr/cms2/website/26/1964026.jpg", "한국관광공사 김지호", ["농로", "고랭지 밭", "풍력발전기"]],
  ["GOAT-030", "3541519", "https://tong.visitkorea.or.kr/cms/resource_photo/19/3541519_image2_1.jpg", null, ["해안도로", "터키색 바다", "항공"]],
  ["GOAT-034", "4068776", "https://tong.visitkorea.or.kr/cms/resource/76/4068776_image2_1.jpg", null, ["청옥호", "금곡호", "광산 지형"]],
  ["GOAT-037", "2563881", "https://tong.visitkorea.or.kr/cms2/website/81/2563881.jpg", "유상진", ["비탈 마을", "등대", "야경"]],
  ["GOAT-038", "2774619", "https://tong.visitkorea.or.kr/cms2/website/19/2774619.jpg", "강원지사 모먼트스튜디오", ["암반 해안", "데크", "소나무"]],
  ["GOAT-040", "2562902", "https://tong.visitkorea.or.kr/cms2/website/02/2562902.jpg", "한국관광공사 김지호", ["서프비치", "비치바", "바다"]],
  ["GOAT-043", "2689471", "https://tong.visitkorea.or.kr/cms/resource/71/2689471_image2_1.jpg", null, ["서핑보드", "계단식 좌석", "바다"]],
  ["GOAT-044", "3516882", "https://tong.visitkorea.or.kr/cms/resource/82/3516882_image2_1.jpg", null, ["에메랄드 수면", "백사장", "갯바위"]],
  ["GOAT-047", "3363773_6", "https://tong.visitkorea.or.kr/cms/resource/73/3363773_image2_1.jpg", null, ["타포니 암반", "해안선", "푸른 수면"]],
  ["GOAT-049", "4041798_5", "https://tong.visitkorea.or.kr/cms/resource/98/4041798_image2_1.jpg", null, ["흰 아치", "종", "석양"]],
  ["GOAT-051", "3478657", "https://tong.visitkorea.or.kr/cms/resource_photo/57/3478657_image2_1.jpg", null, ["청록빛 만", "암초", "항공"]],
  ["GOAT-052", "3561035_4", "https://tong.visitkorea.or.kr/cms/resource/35/3561035_image2_1.jpg", null, ["코발트 바다", "백사장", "케이블카"]],
  ["GOAT-053", "3421443_10", "https://tong.visitkorea.or.kr/cms/resource/43/3421443_image2_1.jpg", null, ["암초 해안", "절벽길", "항공"]],
  ["GOAT-054", "3096032_2", "https://tong.visitkorea.or.kr/cms/resource/32/3096032_image2_1.jpg", null, ["청록 물길", "절벽", "협곡"]],
  ["GOAT-055", "4071201", "https://tong.visitkorea.or.kr/cms/resource/01/4071201_image2_1.jpg", null, ["백색 리조트", "붉은 기와", "동해"]],
  ["GOAT-057", "3352853", "https://tong.visitkorea.or.kr/cms/resource/53/3352853_image2_1.jpg", null, ["산등성이", "가시버시성", "정원"]],
  ["GOAT-058", "4062476", "https://tong.visitkorea.or.kr/cms/resource_photo/76/4062476_image2_1.jpg", null, ["꽃밭", "라벤더", "산"]],
  ["GOAT-059", "3086452_17", "https://tong.visitkorea.or.kr/cms/resource/52/3086452_image2_1.jpg", null, ["석양", "산능선", "명상 테라스"]],
  ["GOAT-061", "4097732_3", "https://tong.visitkorea.or.kr/cms/resource/32/4097732_image2_1.jpg", null, ["울산바위", "인피니티풀", "리조트"]],
];

const photos: CuratedPhoto[] = rows.map(([placeId, sourceRef, url, author, keywords]) => ({
  placeId,
  provider: "KTO_PHOTO",
  sourceRef,
  url,
  placeVerified: true,
  rightsConfirmed: true,
  ...(author ? { author } : {}),
  keywords: [...keywords],
}));

export function getCuratedPlacePhotos(placeId: string): ProviderPhoto[] {
  return photos.filter((photo) => photo.placeId === placeId);
}
