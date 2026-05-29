import { Place, MoodCategory, RecommendationCard, RecommendationRole } from '../types/place';
import places from '../data/goat_places_clean_db_ready.json';
import { moodCategories } from '../data/moodCategories';

const LODGING_TYPES = ['숙소', '리조트', '풀빌라', '카라반', '숙박'];
const RISK_KEYWORDS = ['위험', '통제', '미끄럼', '주의', '금지', '사고'];

function getCurrentSeason(): string {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return '봄';
  if (month >= 6 && month <= 8) return '여름';
  if (month >= 9 && month <= 11) return '가을';
  return '겨울';
}

function isLodging(place: Place): boolean {
  return LODGING_TYPES.some((t) => place.place_type.includes(t));
}

function hasRiskNote(place: Place): boolean {
  return RISK_KEYWORDS.some((k) => place.note.includes(k));
}

function scorePlace(place: Place, mood: MoodCategory): number {
  let score = 0;
  const season = getCurrentSeason();

  if (mood.placeNames.includes(place.place_name)) score += 5;

  const moodKeywordMatch = mood.keywords.some(
    (kw) => place.primary_mood.includes(kw) || place.primary_mood === kw
  );
  if (moodKeywordMatch) score += 3;

  mood.keywords.forEach((kw) => {
    if (place.mood_tags.includes(kw)) score += 2;
  });

  if (place.recommendation_use.includes(mood.name.split('·')[0])) score += 1;

  if (place.best_season === '사계절' || place.best_season.includes(season)) score += 1;

  if (place.accessibility.includes('대중 상') || place.accessibility.includes('자차 상')) score += 1;

  if (hasRiskNote(place)) score -= 1;

  return score;
}

function scoreWeather(place: Place): number {
  const season = getCurrentSeason();
  let score = 0;

  if (place.best_season === '사계절') score += 3;
  else if (place.best_season.includes(season)) score += 2;

  if (place.best_time.includes('실내') || place.place_type.includes('미술관') ||
      place.place_type.includes('카페') || place.place_type.includes('시장')) score += 2;

  if (place.accessibility.includes('대중 상') || place.accessibility.includes('자차 상')) score += 1;

  if (place.note.includes('우천') || place.note.includes('비')) score -= 1;

  return score;
}

function generateReason(place: Place, mood: MoodCategory, role: RecommendationRole): string {
  if (role === '장면 최적') {
    const matching = mood.keywords.filter((kw) => place.mood_tags.includes(kw));
    if (matching.length > 0) {
      return `${mood.name.split('·')[0]} 감성과 완벽히 맞닿는 "${matching.slice(0, 2).join(', ')}" 포인트를 갖춘 장소입니다.`;
    }
    return `${mood.keywords[0]} 분위기를 가장 잘 담고 있는 강원도 대표 장소입니다.`;
  }
  if (role === '같은 장면 대안') {
    return `첫 번째 장소가 붐비거나 멀다면, 비슷한 ${mood.keywords[0]} 분위기의 대안입니다.`;
  }
  const season = getCurrentSeason();
  return `${season} 날씨와 접근성이 좋아 지금 방문하기 최적인 대안입니다.`;
}

export function getRecommendations(moodId: string): RecommendationCard[] {
  const mood = moodCategories.find((m) => m.id === moodId);
  if (!mood) return [];

  const eligible: Place[] = (places as Place[]).filter(
    (p) => p.data_status === 'confirmed' && !isLodging(p)
  );

  const scored = eligible
    .map((p) => ({ place: p, score: scorePlace(p, mood) }))
    .sort((a, b) => b.score - a.score);

  const top = scored[0];
  const alt = scored.find((s) => s.place.place_id !== top?.place.place_id);
  const remaining = scored.filter(
    (s) => s.place.place_id !== top?.place.place_id && s.place.place_id !== alt?.place.place_id
  );

  const weatherScored = remaining
    .map((s) => ({ ...s, wscore: scoreWeather(s.place) }))
    .sort((a, b) => b.wscore - a.wscore);

  const weather = weatherScored[0];

  const cards: RecommendationCard[] = [];

  if (top) {
    cards.push({
      place: top.place,
      role: '장면 최적',
      score: top.score,
      reason: generateReason(top.place, mood, '장면 최적'),
    });
  }
  if (alt) {
    cards.push({
      place: alt.place,
      role: '같은 장면 대안',
      score: alt.score,
      reason: generateReason(alt.place, mood, '같은 장면 대안'),
    });
  }
  if (weather) {
    cards.push({
      place: weather.place,
      role: '날씨 맞춤',
      score: weather.score,
      reason: generateReason(weather.place, mood, '날씨 맞춤'),
    });
  }

  return cards;
}

export function getAlternatives(placeId: string, limit = 3): Place[] {
  const target = (places as Place[]).find((p) => p.place_id === placeId);
  if (!target) return [];

  const eligible = (places as Place[]).filter(
    (p) => p.data_status === 'confirmed' && !isLodging(p) && p.place_id !== placeId
  );

  const scored = eligible
    .map((p) => {
      let score = 0;
      target.mood_tags.forEach((tag) => { if (p.mood_tags.includes(tag)) score += 2; });
      if (p.primary_mood === target.primary_mood) score += 3;
      if (p.city === target.city) score += 1;
      return { place: p, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => s.place);
}

export function getPlaceById(id: string): Place | undefined {
  return (places as Place[]).find((p) => p.place_id === id);
}
