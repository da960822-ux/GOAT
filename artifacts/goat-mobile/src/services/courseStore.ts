import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  recommendCourse,
  type Place,
  type RecommendCourseData,
  type RecommendCourseRequest,
} from "@workspace/api-client-react";

const COURSE_KEY = "@goat_last_course_v1";
const THEMES = [
  "바다·해안 무드",
  "일본 소도시·골목 무드",
  "알프스·고원·목장 무드",
  "숲·정원·자연휴식 무드",
  "레트로·시장·항구 무드",
  "건축·전시·랜드마크 무드",
  "휴양·카페·이국공간 무드",
] as const satisfies readonly RecommendCourseRequest["primaryTheme"][];

function isCourse(value: unknown): value is RecommendCourseData {
  if (!value || typeof value !== "object") return false;
  const course = value as Partial<RecommendCourseData>;
  return (
    Array.isArray(course.stops) &&
    course.stops.length >= 1 &&
    course.stops.length <= 5 &&
    course.stops.every(
      (stop) =>
        stop && typeof stop.id === "string" && typeof stop.title === "string",
    )
  );
}

export async function createCourse(
  place: Place,
  sceneTags: readonly string[] = [],
): Promise<RecommendCourseData> {
  const primaryTheme = THEMES.find((theme) => theme === place.primary_mood);
  if (!primaryTheme) throw new Error("UNSUPPORTED_COURSE_THEME");

  const { data } = await recommendCourse({
    selectedPlaceId: place.place_id,
    primaryTheme,
    userMoodTags: place.mood_tags.slice(0, 10),
    userSceneTags: sceneTags.slice(0, 10),
    // Let the API use the configured Gemini/OpenRouter course composer.
    // The server still owns validation and can return a safe fallback when
    // the model is unavailable.
    forceRuleBasedFallback: false,
  });
  if (!isCourse(data) || data.stops[0]?.id !== place.place_id)
    throw new Error("INVALID_COURSE_RESULT");
  await AsyncStorage.setItem(COURSE_KEY, JSON.stringify(data));
  return data;
}

export async function loadCourse(): Promise<RecommendCourseData | null> {
  const raw = await AsyncStorage.getItem(COURSE_KEY);
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return isCourse(value) ? value : null;
  } catch {
    return null;
  }
}
