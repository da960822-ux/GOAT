import type { ImageSource } from "expo-image";
import { referenceCards } from "@/src/data/referenceCards";

export type EditorialSceneCover = Readonly<{
  source: ImageSource | number;
  picturedPlaceName: string;
  attribution: string;
}>;

const generated = (source: number, picturedPlaceName: string): EditorialSceneCover => ({
  source,
  picturedPlaceName,
  attribution: "생성형 이미지 · 사용자 제공 장소 사진 참고",
});

const referenceCovers = Object.fromEntries(referenceCards.map((card) => [card.id, {
  source: card.image,
  picturedPlaceName: `${card.region} ${card.name}`,
  attribution: "장소 참고 이미지 · 앱 보유 자산",
}])) as Readonly<Record<string, EditorialSceneCover>>;

const covers: Readonly<Record<string, EditorialSceneCover>> = {
  ...referenceCovers,
  "REF_SEA_01": generated(require("@/assets/images/generated-scenes/mood-architecture.jpg"), "고성 에이프레임"),
  "REF_SEA_02": { source: require("@/assets/images/reference/reference-12.jpg"), picturedPlaceName: "동해 어달 해안도로", attribution: "장소 참고 이미지 · 앱 보유 자산" },
  "REF_SEA_03": { source: require("@/assets/images/reference/reference-18.webp"), picturedPlaceName: "삼척 초곡용굴촛대바위길", attribution: "장소 참고 이미지 · 앱 보유 자산" },
  "sea-coast": generated(require("@/assets/images/generated-scenes/mood-sea-coast.jpg"), "쏠비치 삼척"),
  "japan-alley": generated(require("@/assets/images/generated-scenes/mood-japan-alley.jpg"), "춘천 이와림"),
  "alps-ranch": generated(require("@/assets/images/generated-scenes/mood-alps-ranch.jpg"), "켄싱턴리조트 설악밸리"),
  "forest-garden-rest": generated(require("@/assets/images/generated-scenes/mood-forest-garden.jpg"), "원주 뮤지엄 SAN"),
  "retro-market-harbor": generated(require("@/assets/images/generated-scenes/mood-retro-harbor.jpg"), "동해 묵호 논골담길"),
  "architecture-exhibit-landmark": generated(require("@/assets/images/generated-scenes/mood-architecture.jpg"), "고성 에이프레임"),
  "resort-cafe-exotic": generated(require("@/assets/images/generated-scenes/mood-resort-cafe.jpg"), "양양 두둥실 카페"),
};

export function getEditorialSceneCover(selectionId: string): EditorialSceneCover | null {
  return covers[selectionId] ?? null;
}
