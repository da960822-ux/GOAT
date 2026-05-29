import { MoodCategory } from '../types/place';
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

export async function analyzeMoodFromImage(imageUri: string): Promise<ImageMoodResult> {
  if (!imageUri || imageUri === 'mock') {
    throw new Error('유효한 이미지 URI가 필요합니다.');
  }

  await new Promise<void>((resolve) => setTimeout(resolve, 600));

  const idx = Math.floor(Math.random() * moodCategories.length);
  const mood = moodCategories[idx];

  return {
    primaryMood: mood.name,
    moodTags: mood.keywords.slice(0, 4),
    matchedSceneTags: mood.keywords.slice(0, 3),
    confidence: undefined,
    recommendedMoodId: mood.id,
    matchedMood: mood,
    isEstimated: true,
  };
}
