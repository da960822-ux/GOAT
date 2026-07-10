import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Mood } from '@workspace/api-client-react';

import type { RecommendationCard } from '@/src/types/place';

import type {

  TravelOrigin,

  TravelPreferences,

} from '@/src/types/preferences';

const STORAGE_KEY = '@goat_recent_recommendation_v1';

export interface RecentRecommendation {

  mood: Mood;

  preferences: TravelPreferences | null;

  recommendations: RecommendationCard[];

  origin: TravelOrigin | null;

  savedAt: string;

}

export async function saveRecentRecommendation(

  value: Omit<RecentRecommendation, 'savedAt'>

): Promise<void> {

  await AsyncStorage.setItem(

    STORAGE_KEY,

    JSON.stringify({

      ...value,

      savedAt: new Date().toISOString(),

    })

  );

}

export async function getRecentRecommendation(): Promise<RecentRecommendation | null> {

  try {

    const raw = await AsyncStorage.getItem(STORAGE_KEY);

    if (!raw) {

      return null;

    }

    const parsed = JSON.parse(raw) as RecentRecommendation;

    if (!parsed.mood || !Array.isArray(parsed.recommendations)) {

      return null;

    }

    return parsed;

  } catch {

    return null;

  }

}

export async function clearRecentRecommendation(): Promise<void> {

  await AsyncStorage.removeItem(STORAGE_KEY);

}