import type { ReferenceCardId } from "@workspace/travel-domain/catalog";
import type { ImageSourcePropType } from "react-native";

export const referenceFilters = [
  "바다·해안",
  "일본 골목",
  "알프스 목장",
  "숲·정원",
  "레트로·항구",
  "건축·전시",
  "리조트·카페",
] as const;

export type ReferenceFilter = (typeof referenceFilters)[number];
export type ReferenceCard = Readonly<{
  id: ReferenceCardId;
  name: string;
  region: string;
  category: ReferenceFilter;
  image: ImageSourcePropType;
}>;

export const referenceCardImages = {
  REF_SEA_01: require("@/assets/images/reference/reference-17.jpg"),
  REF_SEA_02: require("@/assets/images/reference/reference-12.jpg"),
  REF_SEA_03: require("@/assets/images/reference/reference-9.jpg"),
  REF_JP_01: require("@/assets/images/reference/reference-4.jpg"),
  REF_JP_02: require("@/assets/images/reference/reference-15.jpg"),
  REF_JP_03: require("@/assets/images/reference/reference-19.jpg"),
  REF_ALPS_01: require("@/assets/images/reference/reference-7.jpg"),
  REF_ALPS_02: require("@/assets/images/reference/reference-18.webp"),
  REF_ALPS_03: require("@/assets/images/reference/reference-21.jpg"),
  REF_NATURE_01: require("@/assets/images/reference/reference-8.jpg"),
  REF_NATURE_02: require("@/assets/images/reference/reference-16.jpg"),
  REF_NATURE_03: require("@/assets/images/reference/reference-20.jpg"),
  REF_RETRO_01: require("@/assets/images/reference/reference-5.jpg"),
  REF_RETRO_02: require("@/assets/images/reference/reference-1.jpg"),
  REF_RETRO_03: require("@/assets/images/reference/reference-2.jpg"),
  REF_ARCH_01: require("@/assets/images/reference/reference-6.jpg"),
  REF_ARCH_02: require("@/assets/images/reference/reference-3.webp"),
  REF_ARCH_03: require("@/assets/images/reference/reference-13.jpg"),
  REF_RESORT_01: require("@/assets/images/reference/reference-10.jpg"),
  REF_RESORT_02: require("@/assets/images/reference/reference-11.jpg"),
  REF_RESORT_03: require("@/assets/images/reference/reference-14.jpg"),
} as const satisfies Record<ReferenceCardId, ImageSourcePropType>;

const rows = [
  ["REF_SEA_01", "죽도 해변", "양양", "바다·해안"],
  ["REF_SEA_02", "어달 해변", "동해", "바다·해안"],
  ["REF_SEA_03", "대포항", "속초", "바다·해안"],
  ["REF_JP_01", "묵호 논골담길", "동해", "일본 골목"],
  ["REF_JP_02", "이와림", "춘천", "일본 골목"],
  ["REF_JP_03", "춘천 교토정원", "춘천", "일본 골목"],
  ["REF_ALPS_01", "발왕산 애니포레", "평창", "알프스 목장"],
  ["REF_ALPS_02", "초곡용굴촛대바위길", "삼척", "알프스 목장"],
  ["REF_ALPS_03", "켄싱턴리조트 설악밸리", "고성", "알프스 목장"],
  ["REF_NATURE_01", "사유의 숲", "원주", "숲·정원"],
  ["REF_NATURE_02", "정동진 철길", "강릉", "숲·정원"],
  ["REF_NATURE_03", "카페 흰다정", "강릉", "숲·정원"],
  ["REF_RETRO_01", "묵호항 일대", "동해", "레트로·항구"],
  ["REF_RETRO_02", "두둥실 카페", "춘천", "레트로·항구"],
  ["REF_RETRO_03", "라메종드마리", "춘천", "레트로·항구"],
  ["REF_ARCH_01", "뮤지엄SAN", "원주", "건축·전시"],
  ["REF_ARCH_02", "레고랜드 코리아 리조트", "춘천", "건축·전시"],
  ["REF_ARCH_03", "에이프레임", "양양", "건축·전시"],
  ["REF_RESORT_01", "스테이 조각밤", "강릉", "리조트·카페"],
  ["REF_RESORT_02", "쏠비치 삼척", "삼척", "리조트·카페"],
  ["REF_RESORT_03", "유메모리 리조트", "속초", "리조트·카페"],
] as const satisfies readonly (readonly [ReferenceCardId, string, string, ReferenceFilter])[];

export const referenceCards: readonly ReferenceCard[] = rows.map(([id, name, region, category]) => ({
  id,
  name,
  region,
  category,
  image: referenceCardImages[id],
}));
