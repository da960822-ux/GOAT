import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@goat_recommendation_feedback_v1';

export type FeedbackType = 'LIKE' | 'DISLIKE';

export type DislikeReason =

  | 'TOO_FAR'

  | 'NOT_MY_MOOD'

  | 'TRANSPORT_DIFFICULT'

  | 'ALREADY_VISITED'

  | 'TOO_CROWDED'

  | 'OTHER';

export interface LocalFeedback {

  placeId: string;

  type: FeedbackType;

  reason?: DislikeReason;

  updatedAt: string;

}

type FeedbackMap = Record<string, LocalFeedback>;

async function readAll(): Promise<FeedbackMap> {

  try {

    const raw = await AsyncStorage.getItem(STORAGE_KEY);

    return raw ? (JSON.parse(raw) as FeedbackMap) : {};

  } catch {

    return {};

  }

}

export async function getFeedback(

  placeId: string

): Promise<LocalFeedback | null> {

  const map = await readAll();

  return map[placeId] ?? null;

}

export async function saveFeedback(

  placeId: string,

  type: FeedbackType,

  reason?: DislikeReason

): Promise<LocalFeedback> {

  const map = await readAll();

  const feedback: LocalFeedback = {

    placeId,

    type,

    reason,

    updatedAt: new Date().toISOString(),

  };

  map[placeId] = feedback;

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));

  return feedback;

}

export async function removeFeedback(placeId: string): Promise<void> {

  const map = await readAll();

  delete map[placeId];

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));

}