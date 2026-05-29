import { Place, MoodCategory, RecommendationCard, RecommendationRole } from '../types/place';
import { TravelPreferences } from '../types/preferences';
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

function scoreMood(place: Place, mood: MoodCategory): number {
  let score = 0;

  if (mood.placeNames.includes(place.place_name)) score += 5;

  const moodKeywordMatch = mood.keywords.some(
    (kw) => place.primary_mood.includes(kw) || place.primary_mood === kw
  );
  if (moodKeywordMatch) score += 3;

  mood.keywords.forEach((kw) => {
    if (place.mood_tags.includes(kw)) score += 2;
  });

  return score;
}

function scorePreferences(place: Place, prefs: TravelPreferences): number {
  let score = 0;

  const timeKeywords: Record<string, string[]> = {
    '오전': ['오전', '아침', '이른'],
    '오후': ['오후', '낮'],
    '일몰': ['일몰', '노을', '저녁노을', '황혼'],
    '저녁': ['저녁', '야경'],
    '밤/새벽': ['밤', '새벽', '야간'],
  };
  const timeMatches = timeKeywords[prefs.visitTime] ?? [];
  if (timeMatches.some((t) => place.best_time.includes(t))) score += 2;

  if (prefs.transport === '자차') {
    if (place.accessibility.includes('자차 상')) score += 2;
    else if (place.accessibility.includes('자차')) score += 1;
  } else {
    if (place.accessibility.includes('대중 상')) score += 2;
    else if (place.accessibility.includes('대중')) score += 1;
  }

  const purposeKeywords: Record<string, string[]> = {
    '가볍게 산책': ['산책', '공원', '해변', '둘레길', '걷기'],
    '사진 위주': ['사진', '포토', '인생샷', '뷰', '전망'],
    '액티비티': ['액티비티', '체험', '스키', '래프팅', '짚라인', '활동'],
    '조용한 휴식': ['휴식', '힐링', '조용', '여유', '명상'],
  };
  const purposeKws = purposeKeywords[prefs.purpose] ?? [];
  if (
    purposeKws.some(
      (kw) =>
        place.recommendation_use.includes(kw) ||
        place.place_type.includes(kw) ||
        place.photo_point.includes(kw)
    )
  ) score += 2;

  const companionKeywords: Record<string, string[]> = {
    '혼자': ['혼자', '1인', '독립', '자유'],
    '연인': ['커플', '연인', '데이트', '로맨틱'],
    '친구': ['친구', '그룹', '소그룹'],
    '가족': ['가족', '아이', '어린이', '유아'],
  };
  const companionKws = companionKeywords[prefs.companion] ?? [];
  if (
    companionKws.some(
      (kw) =>
        place.recommendation_use.includes(kw) ||
        place.place_type.includes(kw)
    )
  ) score += 1;

  return score;
}

function safetyScore(place: Place): number {
  let score = 0;
  const season = getCurrentSeason();

  if (place.accessibility.includes('상')) score += 2;
  if (place.best_season === '사계절') score += 2;
  else if (place.best_season.includes(season)) score += 1;
  if (hasRiskNote(place)) score -= 3;

  return score;
}

function generateReason(
  place: Place,
  mood: MoodCategory,
  role: RecommendationRole,
  prefs?: TravelPreferences
): string {
  if (role === '장면 최적') {
    const matching = mood.keywords.filter((kw) => place.mood_tags.includes(kw));
    if (matching.length > 0) {
      return `${mood.name.split('·')[0]} 감성과 완벽히 맞닿는 "${matching.slice(0, 2).join(', ')}" 포인트를 갖춘 장소입니다.`;
    }
    return `${mood.keywords[0]} 분위기를 가장 잘 담고 있는 강원도 대표 장소입니다.`;
  }

  if (role === '내 상황 맞춤') {
    if (!prefs) return '선택하신 조건에 맞는 장소입니다.';
    const parts: string[] = [];
    if (prefs.transport === '자차' && place.accessibility.includes('자차')) parts.push('자차 접근 최적');
    if (prefs.transport === '대중교통' && place.accessibility.includes('대중')) parts.push('대중교통 접근 가능');
    if (prefs.companion === '연인' && (place.recommendation_use.includes('커플') || place.recommendation_use.includes('연인'))) parts.push('커플 추천');
    if (prefs.companion === '가족' && place.recommendation_use.includes('가족')) parts.push('가족 여행 적합');
    if (prefs.purpose === '사진 위주' && place.photo_point) parts.push('포토 포인트 있음');
    if (prefs.purpose === '조용한 휴식' && (place.recommendation_use.includes('휴식') || place.recommendation_use.includes('힐링'))) parts.push('조용한 휴식 가능');
    if (parts.length > 0) {
      return `${parts.slice(0, 2).join(' · ')} 조건에 맞는 장소입니다.`;
    }
    return `"${prefs.companion}"와 "${prefs.purpose}" 여행 조건에 잘 맞는 장소입니다.`;
  }

  const season = getCurrentSeason();
  return `${season} 방문 조건과 접근성이 안정적이며, ${mood.keywords[0]} 감성을 함께 갖춘 대안입니다.`;
}

export function getRecommendations(
  moodId: string,
  prefs?: TravelPreferences
): RecommendationCard[] {
  const mood = moodCategories.find((m) => m.id === moodId);
  if (!mood) return [];

  const eligible: Place[] = (places as Place[]).filter(
    (p) => p.data_status === 'confirmed' && !isLodging(p)
  );

  const withScores = eligible.map((p) => ({
    place: p,
    moodScore: scoreMood(p, mood),
    prefScore: prefs ? scorePreferences(p, prefs) : 0,
    safety: safetyScore(p),
  }));

  withScores.sort((a, b) => b.moodScore - a.moodScore);
  const card1Place = withScores[0];

  const remaining1 = withScores.filter((s) => s.place.place_id !== card1Place?.place.place_id);

  if (prefs) {
    remaining1.sort((a, b) => {
      const scoreA = a.moodScore * 0.6 + a.prefScore * 1.4;
      const scoreB = b.moodScore * 0.6 + b.prefScore * 1.4;
      return scoreB - scoreA;
    });
  } else {
    remaining1.sort((a, b) => b.moodScore - a.moodScore);
  }
  const card2Place = remaining1[0];

  const remaining2 = remaining1.filter((s) => s.place.place_id !== card2Place?.place.place_id);
  remaining2.sort((a, b) => {
    const scoreA = a.moodScore * 0.5 + a.safety * 1.5;
    const scoreB = b.moodScore * 0.5 + b.safety * 1.5;
    return scoreB - scoreA;
  });
  const card3Place = remaining2[0];

  const role2: RecommendationRole = prefs ? '내 상황 맞춤' : '같은 장면 대안';
  const role3: RecommendationRole = prefs ? '안전한 대안' : '날씨 맞춤';

  const cards: RecommendationCard[] = [];

  if (card1Place) {
    cards.push({
      place: card1Place.place,
      role: '장면 최적',
      score: card1Place.moodScore,
      reason: generateReason(card1Place.place, mood, '장면 최적', prefs),
    });
  }
  if (card2Place) {
    cards.push({
      place: card2Place.place,
      role: role2,
      score: card2Place.moodScore + card2Place.prefScore,
      reason: generateReason(card2Place.place, mood, role2, prefs),
    });
  }
  if (card3Place) {
    cards.push({
      place: card3Place.place,
      role: role3,
      score: card3Place.moodScore + card3Place.safety,
      reason: generateReason(card3Place.place, mood, role3, prefs),
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
