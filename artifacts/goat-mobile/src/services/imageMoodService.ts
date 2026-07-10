import type { MoodCategory } from '../types/place';
import { moodCategories } from '../data/moodCategories';

export interface ImageMoodResult {
  primaryMood: string;
  moodTags: string[];
  matchedSceneTags: string[];
  confidence?: number;
  recommendedMoodId?: string;
  matchedMood: MoodCategory;
  isEstimated: boolean;
}

function getStableFallbackMood(): MoodCategory {
  const fallbackMood = moodCategories[0];

  if (!fallbackMood) {
    throw new Error('사용 가능한 감성 카테고리가 없습니다.');
  }

  return fallbackMood;
}

export async function analyzeMoodFromImage(imageUri: string): Promise<ImageMoodResult> {
  if (!imageUri || imageUri === 'mock') {
    throw new Error('유효한 이미지 URI가 필요합니다.');
  }

  await new Promise<void>((resolve) => setTimeout(resolve, 600));

  /**
   * 기존 코드:
   * const idx = Math.floor(Math.random() * moodCategories.length);
   * const mood = moodCategories[idx];
   *
   * 문제:
   * 같은 사진을 넣어도 매번 다른 mock 분석 결과가 나와서
   * 추천 결과와 시연 흐름이 흔들릴 수 있음.
   *
   * 수정:
   * mock 분석 결과를 항상 첫 번째 감성으로 고정.
   */
  const mood = getStableFallbackMood();

  return {
    primaryMood: mood.name,
    moodTags: mood.keywords.slice(0, 4),
    matchedSceneTags: mood.keywords.slice(0, 3),
    confidence: 0.7,
    recommendedMoodId: mood.id,
    matchedMood: mood,
    isEstimated: true,
  };
}