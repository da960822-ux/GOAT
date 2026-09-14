import type { GoatPlace } from "./goatRecommendationTypes";

/**
 * 방문 결정을 돕는 최소 정보 세트입니다.
 * 운영시간·요금처럼 변동성이 큰 값은 추정하지 않고 확인 필요로 남깁니다.
 */
export type PlaceMinimumDetail = Readonly<{
  description: string;
  stayMinutes: number;
  parkingNote: string;
  visitCheck: string;
  sourceLabel: string;
  sourceUrl: string;
  checkedAt: string;
  photoRights: string;
}>;

const CHECKED_AT = "2026-09-14";
const KTO_SOURCE = "https://www.data.go.kr/data/15101578/openapi.do";

function stayMinutes(placeType: string): number {
  if (/숙소|리조트|카라반/.test(placeType)) return 120;
  if (/카페|디저트/.test(placeType)) return 60;
  if (/미술관|전시|테마파크|동물/.test(placeType)) return 150;
  if (/산|고원|숲|해안|해변|협곡|트레일|목장|정원|농장/.test(placeType)) return 100;
  return 80;
}

export function getPlaceMinimumDetail(place: GoatPlace): PlaceMinimumDetail {
  const transport = [
    place.accessibility?.car ? `자차 ${place.accessibility.car}` : null,
    place.accessibility?.public_transport ? `대중교통 ${place.accessibility.public_transport}` : null,
  ].filter(Boolean).join(" · ") || "접근성 확인 필요";
  const sourceUrl = place.sourceUrls?.[0] ?? (place.coordinateSource === "KTO_SEARCH" ? KTO_SOURCE : `https://map.kakao.com/?q=${encodeURIComponent(`${place.city} ${place.place_name}`)}`);
  const sourceLabel = place.sourceUrls?.length ? "장소 출처" : place.coordinateSource === "KTO_SEARCH" ? "한국관광공사 좌표·카탈로그" : "GOAT 카탈로그·지도 검색";
  const rights = "사진별 출처 라벨 기준(실제 사진 또는 참고 이미지)";
  const purpose = place.recommendation_use || place.purpose_tags?.[0] || "여행";
  return {
    description: `${place.city}에 있는 ${place.place_type} ${place.place_name}입니다. 주요 포토 포인트는 ${place.photo_point}이고, 추천 포인트는 ${purpose}입니다.`,
    stayMinutes: stayMinutes(place.place_type),
    parkingNote: `${transport} · 주차 운영은 방문 전 공식 안내를 확인해 주세요.`,
    visitCheck: `${place.note ? `${place.note} ` : ""}운영시간·요금·예약은 방문 전 공식 채널에서 확인해 주세요.`,
    sourceLabel,
    sourceUrl,
    checkedAt: CHECKED_AT,
    photoRights: rights,
  };
}
