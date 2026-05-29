/**
 * DATASET NOTE
 * This service uses goat_places_clean_db_ready.json — the "first recommendation pool".
 * It contains 43 curated, confirmed Gangwon-do places selected from the original
 * 58-place seed pool. All 43 records have data_status === 'confirmed'.
 * Lodging (1 place: 레고랜드) is excluded at query time, leaving 42 eligible places.
 * Do NOT confuse this file with the original 58-place seed (not included in this app).
 */
import { Place, MoodCategory, RecommendationCard, RecommendationRole } from '../types/place';
import { TravelPreferences, TravelOrigin } from '../types/preferences';
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

/** Haversine formula — returns distance in km */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Soft distance boost — closer places earn a small bonus.
 * Max +1.5 pts, so it never overrides mood matching (max ~10 pts).
 */
function distanceBoostScore(place: Place, origin: TravelOrigin): number {
  if (
    origin.type === 'skip' ||
    origin.latitude == null ||
    origin.longitude == null ||
    place.lat == null ||
    place.lng == null
  ) {
    return 0;
  }
  const km = haversineKm(origin.latitude, origin.longitude, place.lat, place.lng);
  if (km <= 30)  return 1.5;
  if (km <= 80)  return 1.0;
  if (km <= 150) return 0.5;
  return 0;
}

/** Returns distance in km if both origin and place have coordinates, else undefined */
function calcDistanceKm(place: Place, origin?: TravelOrigin): number | undefined {
  if (
    !origin ||
    origin.type === 'skip' ||
    origin.latitude == null ||
    origin.longitude == null ||
    place.lat == null ||
    place.lng == null
  ) {
    return undefined;
  }
  return Math.round(haversineKm(origin.latitude, origin.longitude, place.lat, place.lng));
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

  if (prefs.visitTime) {
    const timeKeywords: Record<string, string[]> = {
      '오전': ['오전', '아침', '이른'],
      '오후': ['오후', '낮'],
      '일몰': ['일몰', '노을', '저녁노을', '황혼'],
      '저녁': ['저녁', '야경'],
      '밤/새벽': ['밤', '새벽', '야간'],
    };
    const timeMatches = timeKeywords[prefs.visitTime] ?? [];
    if (timeMatches.some((t) => place.best_time.includes(t))) score += 2;
  }

  if (prefs.transport === '자차') {
    if (place.accessibility.includes('자차 상')) score += 2;
    else if (place.accessibility.includes('자차 중')) score += 1;
  } else {
    if (place.accessibility.includes('대중 상')) score += 2;
    else if (place.accessibility.includes('대중 중')) score += 1;
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

/**
 * safetyScore — used for Card 3 ("안전한 대안") ranking.
 */
function safetyScore(place: Place, prefs?: TravelPreferences): number {
  let score = 0;
  const season = getCurrentSeason();

  if (prefs) {
    if (prefs.transport === '자차') {
      if (place.accessibility.includes('자차 상')) score += 2;
      else if (place.accessibility.includes('자차 중')) score += 1;
    } else {
      if (place.accessibility.includes('대중 상')) score += 2;
      else if (place.accessibility.includes('대중 중')) score += 1;
    }
  } else {
    if (place.accessibility.includes('자차 상') || place.accessibility.includes('대중 상')) score += 2;
    else if (place.accessibility.includes('자차 중') || place.accessibility.includes('대중 중')) score += 1;
  }

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
    const moodName = mood.name.split('·')[0].trim();
    if (matching.length > 0) {
      const tagStr = matching.slice(0, 2).map((t) => `'${t}'`).join(', ');
      const photoHint = place.photo_point ? `사진 포인트: ${place.photo_point.split('.')[0].trim()}.` : '';
      return `${moodName} 감성과 가장 가까운 ${tagStr} 장면을 가진 장소예요.${photoHint ? ' ' + photoHint : ''}`;
    }
    const photoHint = place.photo_point ? place.photo_point.split('.')[0].trim() : '';
    return `${moodName} 분위기를 가장 잘 담고 있는 장소예요.${photoHint ? ` 포토 포인트: ${photoHint}.` : ''}`;
  }

  if (role === '내 상황 맞춤') {
    if (!prefs) return '선택하신 조건에 맞는 장소입니다.';
    const parts: string[] = [];
    if (prefs.transport === '자차' && place.accessibility.includes('자차 상')) parts.push('자차 접근 최적');
    else if (prefs.transport === '자차' && place.accessibility.includes('자차')) parts.push('자차 접근 가능');
    if (prefs.transport === '대중교통' && place.accessibility.includes('대중 상')) parts.push('대중교통 접근 최적');
    else if (prefs.transport === '대중교통' && place.accessibility.includes('대중')) parts.push('대중교통 이용 가능');
    if (prefs.companion === '연인' && (place.recommendation_use.includes('커플') || place.recommendation_use.includes('연인'))) parts.push('커플 코스 적합');
    if (prefs.companion === '가족' && place.recommendation_use.includes('가족')) parts.push('가족 여행 적합');
    if (prefs.companion === '혼자' && (place.recommendation_use.includes('혼자') || place.recommendation_use.includes('1인'))) parts.push('나홀로 여행 추천');
    if (prefs.purpose === '사진 위주' && place.photo_point) parts.push(`포토 포인트 있음`);
    if (prefs.purpose === '조용한 휴식' && (place.recommendation_use.includes('휴식') || place.recommendation_use.includes('힐링'))) parts.push('조용한 휴식 가능');
    if (prefs.purpose === '가볍게 산책' && (place.place_type.includes('해변') || place.place_type.includes('공원') || place.recommendation_use.includes('산책'))) parts.push('산책 코스 적합');
    if (parts.length > 0) {
      return `${prefs.companion}와 함께 ${prefs.transport}로 방문하기 좋아요. ${parts.slice(0, 2).join(' · ')} 조건이 맞습니다.`;
    }
    return `'${prefs.companion}' · '${prefs.purpose}' 조건에 잘 맞는 같은 감성대의 대안이에요.`;
  }

  if (role === '같은 장면 대안') {
    const moodName = mood.name.split('·')[0].trim();
    const sharedTags = mood.keywords.filter((kw) => place.mood_tags.includes(kw));
    if (sharedTags.length > 0) {
      return `${moodName} 감성의 대안으로, '${sharedTags[0]}' 같은 비슷한 분위기를 더 여유롭게 즐길 수 있어요.`;
    }
    return `비슷한 ${moodName} 분위기를 가진 대안 장소예요. 첫 번째 추천이 여의치 않을 때 추천합니다.`;
  }

  const season = getCurrentSeason();
  const isAllSeason = place.best_season === '사계절';
  const isSeasonMatch = place.best_season.includes(season);
  const accessGood = place.accessibility.includes('상');
  const noRisk = !hasRiskNote(place);

  const parts: string[] = [];
  if (isAllSeason) parts.push('사계절 방문 가능');
  else if (isSeasonMatch) parts.push(`${season} 방문 최적`);
  if (accessGood) parts.push('접근성 우수');
  if (noRisk) parts.push('안전 유의사항 없음');

  if (parts.length > 0) {
    return `${parts.slice(0, 2).join(' · ')} 조건이 안정적인 대안이에요. 현재 계절에 부담 없이 방문할 수 있습니다.`;
  }
  return `${season} 방문 조건과 접근성이 안정적인 대안입니다.`;
}

export function getRecommendations(
  moodId: string,
  prefs?: TravelPreferences,
  excludeIds?: string[],
  origin?: TravelOrigin
): RecommendationCard[] {
  const mood = moodCategories.find((m) => m.id === moodId);
  if (!mood) return [];

  const excluded = new Set(excludeIds ?? []);
  const hasOriginCoords =
    origin &&
    origin.type !== 'skip' &&
    origin.latitude != null &&
    origin.longitude != null;

  const eligible: Place[] = (places as Place[]).filter(
    (p) => p.data_status === 'confirmed' && !isLodging(p) && !excluded.has(p.place_id)
  );

  const withScores = eligible.map((p) => ({
    place: p,
    moodScore: scoreMood(p, mood),
    prefScore: prefs ? scorePreferences(p, prefs) : 0,
    safetyVal: safetyScore(p, prefs),
    distBoost: hasOriginCoords ? distanceBoostScore(p, origin!) : 0,
  }));

  const usedIds = new Set<string>();

  // Card 1 — highest mood score (+ soft distance nudge)
  const sorted1 = [...withScores].sort((a, b) => {
    const sA = a.moodScore + a.distBoost * 0.3;
    const sB = b.moodScore + b.distBoost * 0.3;
    return sB - sA;
  });
  const card1 = sorted1[0];
  if (card1) usedIds.add(card1.place.place_id);

  // Card 2 — highest combined pref+mood from remaining (+ soft distance nudge)
  const pool2 = withScores.filter((s) => !usedIds.has(s.place.place_id));
  if (prefs) {
    pool2.sort((a, b) => {
      const sA = a.moodScore * 0.6 + a.prefScore * 1.4 + a.distBoost * 0.3;
      const sB = b.moodScore * 0.6 + b.prefScore * 1.4 + b.distBoost * 0.3;
      return sB - sA;
    });
  } else {
    pool2.sort((a, b) => b.moodScore + b.distBoost * 0.3 - (a.moodScore + a.distBoost * 0.3));
  }
  const card2 = pool2[0];
  if (card2) usedIds.add(card2.place.place_id);

  // Card 3 — highest safety score from remaining (+ soft distance nudge)
  const pool3 = withScores.filter((s) => !usedIds.has(s.place.place_id));
  pool3.sort((a, b) => {
    const sA = a.moodScore * 0.5 + a.safetyVal * 1.5 + a.distBoost * 0.3;
    const sB = b.moodScore * 0.5 + b.safetyVal * 1.5 + b.distBoost * 0.3;
    return sB - sA;
  });
  const card3 = pool3[0];
  if (card3) usedIds.add(card3.place.place_id);

  // Fallback: fill any empty slots from remaining eligible places
  const slots = [card1, card2, card3];
  const fallback = withScores.filter((s) => !usedIds.has(s.place.place_id));
  for (let i = 0; i < slots.length; i++) {
    if (!slots[i] && fallback.length > 0) {
      slots[i] = fallback.shift()!;
    }
  }

  const role2: RecommendationRole = prefs ? '내 상황 맞춤' : '같은 장면 대안';
  const role3: RecommendationRole = prefs ? '안전한 대안' : '날씨 맞춤';

  const cards: RecommendationCard[] = [];
  if (slots[0]) {
    cards.push({
      place: slots[0].place,
      role: '장면 최적',
      score: slots[0].moodScore,
      reason: generateReason(slots[0].place, mood, '장면 최적', prefs),
      distanceKm: calcDistanceKm(slots[0].place, origin),
    });
  }
  if (slots[1]) {
    cards.push({
      place: slots[1].place,
      role: role2,
      score: slots[1].moodScore + slots[1].prefScore,
      reason: generateReason(slots[1].place, mood, role2, prefs),
      distanceKm: calcDistanceKm(slots[1].place, origin),
    });
  }
  if (slots[2]) {
    cards.push({
      place: slots[2].place,
      role: role3,
      score: slots[2].moodScore + slots[2].safetyVal,
      reason: generateReason(slots[2].place, mood, role3, prefs),
      distanceKm: calcDistanceKm(slots[2].place, origin),
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
