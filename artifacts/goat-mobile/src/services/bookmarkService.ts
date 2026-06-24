import AsyncStorage from '@react-native-async-storage/async-storage';
import { Place } from '../types/place';

const STORAGE_KEY = '@goat_bookmarks_v1';

export async function getBookmarks(): Promise<Place[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Place[];
  } catch {
    return [];
  }
}

export async function isBookmarked(placeId: string): Promise<boolean> {
  const list = await getBookmarks();
  return list.some((p) => p.place_id === placeId);
}

export async function saveBookmark(place: Place): Promise<void> {
  const list = await getBookmarks();
  if (list.some((p) => p.place_id === place.place_id)) return;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...list, place]));
}

export async function removeBookmark(placeId: string): Promise<void> {
  const list = await getBookmarks();
  const updated = list.filter((p) => p.place_id !== placeId);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export async function toggleBookmark(place: Place): Promise<boolean> {
  const already = await isBookmarked(place.place_id);
  if (already) {
    await removeBookmark(place.place_id);
    return false;
  } else {
    await saveBookmark(place);
    return true;
  }
}
