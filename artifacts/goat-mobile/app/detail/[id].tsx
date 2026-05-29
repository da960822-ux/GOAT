import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '@/src/components/Header';
import { TagBadge } from '@/src/components/TagBadge';
import { RecommendationRoleBadge } from '@/src/components/RecommendationRoleBadge';
import { EmptyState } from '@/src/components/EmptyState';
import { getPlaceById, getAlternatives } from '@/src/services/recommendationService';
import { openKakaoMap } from '@/src/services/mapLink';
import { getRegionPalette } from '@/src/utils/regionColors';
import { toggleBookmark, isBookmarked } from '@/src/services/bookmarkService';
import { useColors } from '@/hooks/useColors';
import { Place, RecommendationRole } from '@/src/types/place';

export default function DetailScreen() {
  const router = useRouter();
  const { id, role, reason } = useLocalSearchParams<{ id: string; role?: string; reason?: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const place = getPlaceById(id ?? '');
  const alternatives = place ? getAlternatives(place.place_id, 3) : [];
  const region = place ? getRegionPalette(place.region_group) : null;

  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    if (!place) return;
    isBookmarked(place.place_id).then(setBookmarked);
  }, [place?.place_id]);

  async function handleBookmark() {
    if (!place) return;
    const saved = await toggleBookmark(place);
    setBookmarked(saved);
  }

  async function handleKakaoMap() {
    if (!place) return;
    try {
      await openKakaoMap(place);
    } catch {
      Alert.alert('지도 앱 열기', '카카오맵을 열 수 없어 웹 지도로 연결할게요.', [{ text: '확인' }]);
    }
  }

  if (!place) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <Header title="장소 상세" onBack={() => router.back()} />
        <EmptyState title="장소를 찾을 수 없습니다" description="다시 검색해주세요." />
      </View>
    );
  }

  const typedRole = role as RecommendationRole | undefined;
  const accentColor = region?.accent ?? colors.primary;
  const heroBg = region?.bg ?? colors.secondary;
  const heroBorder = region?.border ?? colors.border;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header
        title={place.place_name}
        onBack={() => router.back()}
        right={
          <TouchableOpacity onPress={handleBookmark} style={styles.bookmarkBtn} activeOpacity={0.7}>
            <Feather
              name="bookmark"
              size={20}
              color={bookmarked ? accentColor : colors.mutedForeground}
              style={bookmarked ? { opacity: 1 } : { opacity: 0.5 }}
            />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero — visual mood board */}
        <View style={[styles.hero, { backgroundColor: heroBg, borderBottomColor: heroBorder }]}>
          {/* Top row: place type badge + region */}
          <View style={styles.heroTopRow}>
            <View style={[styles.typeBadge, { backgroundColor: accentColor + '22', borderColor: accentColor + '44' }]}>
              <Text style={[styles.typeBadgeText, { color: accentColor }]}>{place.place_type}</Text>
            </View>
            <View style={[styles.regionPill, { backgroundColor: heroBg, borderColor: heroBorder }]}>
              <View style={[styles.regionDot, { backgroundColor: accentColor }]} />
              <Text style={[styles.regionPillText, { color: accentColor }]}>
                {place.city} · {region?.label ?? place.region_group}
              </Text>
            </View>
          </View>

          {/* Place name + primary mood */}
          <Text style={[styles.placeName, { color: colors.foreground }]}>{place.place_name}</Text>
          <Text style={[styles.moodSubtitle, { color: accentColor }]}>{place.primary_mood}</Text>

          {/* Mood tag chips in hero */}
          <View style={styles.heroTagRow}>
            {place.mood_tags.slice(0, 5).map((tag) => (
              <View key={tag} style={[styles.heroTag, { backgroundColor: accentColor + '18', borderColor: accentColor + '35' }]}>
                <Text style={[styles.heroTagText, { color: accentColor }]}>#{tag}</Text>
              </View>
            ))}
          </View>

          {/* Photo point pull-quote */}
          {!!place.photo_point && (
            <View style={[styles.photoQuote, { backgroundColor: accentColor + '14', borderLeftColor: accentColor }]}>
              <Feather name="camera" size={12} color={accentColor} style={{ marginTop: 1 }} />
              <Text style={[styles.photoQuoteText, { color: colors.foreground }]}>{place.photo_point}</Text>
            </View>
          )}

          {/* Role badge */}
          {typedRole && (
            <View style={styles.roleWrap}>
              <RecommendationRoleBadge role={typedRole} />
            </View>
          )}
        </View>

        {/* Reason */}
        {!!reason && (
          <InfoCard colors={colors} icon="zap" title="추천 이유">
            <Text style={[styles.bodyText, { color: colors.primary }]}>{reason}</Text>
          </InfoCard>
        )}

        {/* Mood tags */}
        <InfoCard colors={colors} icon="tag" title="분위기 태그">
          <View style={styles.tagRow}>
            {place.mood_tags.map((tag) => <TagBadge key={tag} label={`#${tag}`} />)}
          </View>
        </InfoCard>

        {/* Visit info */}
        <InfoCard colors={colors} icon="info" title="방문 정보">
          <InfoRow label="추천 시간" value={place.best_time} colors={colors} />
          <InfoRow label="추천 계절" value={place.best_season} colors={colors} />
          <InfoRow label="접근성" value={place.accessibility} colors={colors} />
        </InfoCard>

        {/* Purpose */}
        <InfoCard colors={colors} icon="star" title="추천 용도">
          <Text style={[styles.bodyText, { color: colors.foreground }]}>{place.recommendation_use}</Text>
        </InfoCard>

        {/* Caution */}
        {!!place.note && (
          <View style={[styles.cautionCard, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
            <View style={styles.cautionHeader}>
              <Feather name="alert-triangle" size={14} color="#D97706" />
              <Text style={styles.cautionTitle}>방문 전 확인해주세요</Text>
            </View>
            <Text style={styles.cautionBody}>{place.note}</Text>
          </View>
        )}

        {/* Same-mood alternatives */}
        {alternatives.length > 0 && (
          <InfoCard colors={colors} icon="compass" title="같은 감성 대안">
            <Text style={[styles.altHint, { color: colors.mutedForeground }]}>
              비슷한 감성을 더 여유롭게 즐길 수 있어요
            </Text>
            {alternatives.map((alt) => (
              <AlternativeCard
                key={alt.place_id}
                place={alt}
                colors={colors}
                onPress={() =>
                  router.replace({ pathname: '/detail/[id]', params: { id: alt.place_id } })
                }
              />
            ))}
          </InfoCard>
        )}
      </ScrollView>

      {/* Sticky bottom CTA */}
      <View style={[styles.stickyBottom, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: bottomPad + 12 }]}>
        <TouchableOpacity
          style={styles.kakaoBtn}
          onPress={handleKakaoMap}
          activeOpacity={0.85}
        >
          <Feather name="navigation" size={16} color="#3A1D00" />
          <Text style={styles.kakaoBtnText}>카카오맵에서 보기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InfoCard({ title, icon, colors, children }: { title: string; icon: string; colors: any; children: React.ReactNode }) {
  return (
    <View style={[styles.infoCard, { borderBottomColor: colors.border }]}>
      <View style={styles.infoCardHeader}>
        <Feather name={icon as any} size={13} color={colors.primary} />
        <Text style={[styles.infoCardTitle, { color: colors.foreground }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function InfoRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

function AlternativeCard({ place, colors, onPress }: { place: Place; colors: any; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.altCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.8}
    >
      <View style={styles.altContent}>
        <Text style={[styles.altName, { color: colors.foreground }]}>{place.place_name}</Text>
        <Text style={[styles.altMeta, { color: colors.mutedForeground }]}>{place.city} · {place.place_type}</Text>
        <View style={styles.altTags}>
          {place.mood_tags.slice(0, 3).map((tag) => (
            <View key={tag} style={[styles.altTag, { backgroundColor: colors.muted }]}>
              <Text style={[styles.altTagText, { color: colors.mutedForeground }]}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 40 },
  bookmarkBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  hero: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 4,
    borderBottomWidth: 1,
    gap: 10,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
  },
  typeBadgeText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  regionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
  },
  regionDot: { width: 6, height: 6, borderRadius: 3 },
  regionPillText: { fontSize: 12, fontFamily: 'Inter_500Medium' },

  placeName: { fontSize: 24, fontWeight: '800', fontFamily: 'Inter_700Bold' },
  moodSubtitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginTop: -4 },

  heroTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  heroTag: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
  },
  heroTagText: { fontSize: 12, fontFamily: 'Inter_500Medium' },

  photoQuote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingLeft: 12,
    paddingRight: 12,
    paddingVertical: 10,
    borderLeftWidth: 3,
    borderRadius: 4,
    marginTop: 2,
  },
  photoQuoteText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },

  roleWrap: { marginTop: 4 },

  infoCard: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  infoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  infoCardTitle: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  bodyText: { fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 22 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap' },

  infoRow: { flexDirection: 'row', marginBottom: 9 },
  infoLabel: { width: 80, fontSize: 13, fontFamily: 'Inter_500Medium' },
  infoValue: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },

  cautionCard: {
    marginHorizontal: 20,
    marginVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  cautionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  cautionTitle: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: '#D97706' },
  cautionBody: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20, color: '#92400E' },

  altHint: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 12 },
  altCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  altContent: { flex: 1 },
  altName: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginBottom: 3 },
  altMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 6 },
  altTags: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  altTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  altTagText: { fontSize: 11, fontFamily: 'Inter_400Regular' },

  stickyBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  kakaoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F7E600',
    paddingVertical: 16,
    borderRadius: 16,
  },
  kakaoBtnText: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#3A1D00' },
});
