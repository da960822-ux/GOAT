import type { ImageSource } from "expo-image";

export type EditorialSceneCover = Readonly<{
  source: ImageSource | number;
  picturedPlaceName: string;
  attribution: string;
}>;

const generated = (source: number, picturedPlaceName: string): EditorialSceneCover => ({
  source,
  picturedPlaceName,
  attribution: "생성형 이미지 · 실제 한국 장소 사진 기반",
});

const covers: Readonly<Record<string, EditorialSceneCover>> = {
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
