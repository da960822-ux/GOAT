import { MoodCategory } from '../types/place';
import { moodCategories } from '../data/moodCategories';

export interface ImageMoodResult {
  extractedTags: string[];
  matchedMood: MoodCategory;
  confidence: number;
}

const MOCK_TAG_POOLS: string[][] = [
  ['초원', '방목', '넓은 하늘', '풍차', '목가적'],
  ['눈 덮인 산', '크리스마스 감성', '통나무', '알프스 마을'],
  ['지중해', '파란 지붕', '화이트 벽', '햇빛', '아치'],
  ['해변', '노을', '서핑', '야자수 없는 여름'],
  ['골목', '빈티지 상점', '레트로 카페', '소도시'],
  ['숲 안개', '피오르', '차가운 공기', '스칸디나비아'],
  ['야경', '항구 불빛', '밤바다', '라이브 음악'],
  ['절벽 전망대', '드라마틱한 뷰', '오션뷰', '고도감'],
  ['어시장', '골목 먹거리', '전통 시장', '현지 느낌'],
];

export async function analyzeMoodFromImage(_imageUri: string): Promise<ImageMoodResult> {
  await new Promise<void>((resolve) => setTimeout(resolve, 1800));

  const idx = Math.floor(Math.random() * moodCategories.length);
  const mood = moodCategories[idx];
  const tags = MOCK_TAG_POOLS[idx] ?? mood.keywords.slice(0, 4);

  return {
    extractedTags: tags.slice(0, 4),
    matchedMood: mood,
    confidence: Math.floor(74 + Math.random() * 22),
  };
}
