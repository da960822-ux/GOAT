import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { RecommendationCard } from '@/src/types/place';
import { RecommendationRoleBadge } from './RecommendationRoleBadge';
import { openKakaoMap } from '@/src/services/mapLink';
import { getRegionPalette } from '@/src/utils/regionColors';
import { useColors } from '@/hooks/useColors';

interface PlaceCardProps {
  card: RecommendationCard;
  onPress?: () => void;
}

export function PlaceCard({ card, onPress }: PlaceCardProps) {
  const { place, role, reason } = card;
  const colors = useColors();
  const region = getRegionPalette(place.region_group);

  async function handleKakaoMap() {
    try {
      await openKakaoMap(place);
    } catch {
      Alert.alert('카카오맵을 열 수 없어요. 잠시 후 다시 시도해주세요.');
    }
  }

  const accessShort = place.accessibility.length > 20
    ? place.accessibility.slice(0, 20) + '…'
    : place.accessibility;

  const timeShort = place.best_time.length > 14
    ? place.best_time.slice(0, 14) + '…'
    : place.best_time;

  return (
    <View style={[
      styles.card,
      { backgroundColor: colors.card, borderColor: colors.border, borderTopColor: region.accent, borderTopWidth: 3 },
    ]}>
      <View style={styles.topRow}>
        <RecommendationRoleBadge role={role} />
        <View style={[styles.regionBadge, { backgroundColor: region.bg, borderColor: region.border }]}>
          <View style={[styles.regionDot, { backgroundColor: region.accent }]} />
          <Text style={[styles.regionLabel, { color: region.accent }]}>
            {place.city} · {region.label}
          </Text>
        </View>
      </View>

      <View style={styles.nameRow}>
        <View style={styles.nameBlock}>
          <Text style={[styles.placeName, { color: colors.foreground }]}>{place.place_name}</Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {place.place_type}
          </Text>
        </View>
      </View>

      <View style={[styles.reasonBox, { backgroundColor: colors.overlay }]}>
        <Text style={[styles.reasonText, { color: colors.primary }]} numberOfLines={2}>{reason}</Text>
      </View>

      <View style={styles.infoChips}>
        <InfoChip icon="clock" label={timeShort} accent={region.accent} bg={region.bg} border={region.border} />
        <InfoChip icon="calendar" label={place.best_season} accent={region.accent} bg={region.bg} border={region.border} />
        <InfoChip icon="navigation" label={accessShort} accent={region.accent} bg={region.bg} border={region.border} />
      </View>

      <View style={styles.tags}>
        {place.mood_tags.slice(0, 3).map((tag) => (
          <View key={tag} style={[styles.tag, { backgroundColor: colors.muted }]}>
            <Text style={[styles.tagText, { color: colors.secondaryForeground }]}>#{tag}</Text>
          </View>
        ))}
      </View>

      {!!place.note && (
        <View style={[styles.cautionRow, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
          <Feather name="alert-triangle" size={12} color="#D97706" style={{ marginTop: 1 }} />
          <Text style={styles.cautionText} numberOfLines={2}>{place.note}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.kakaoBtn}
          onPress={handleKakaoMap}
          activeOpacity={0.82}
        >
          <Feather name="navigation" size={13} color="#3A1D00" />
          <Text style={styles.kakaoBtnText}>카카오맵에서 보기</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.detailLink} onPress={onPress} activeOpacity={0.7}>
          <Text style={[styles.detailLinkText, { color: colors.primary }]}>자세히 보기</Text>
          <Feather name="chevron-right" size={13} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InfoChip({ icon, label, accent, bg, border }: {
  icon: string; label: string; accent: string; bg: string; border: string;
}) {
  return (
    <View style={[styles.chip, { backgroundColor: bg, borderColor: border }]}>
      <Feather name={icon as any} size={11} color={accent} />
      <Text style={[styles.chipText, { color: accent }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden',
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  regionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  regionDot: { width: 6, height: 6, borderRadius: 3 },
  regionLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  nameBlock: { flex: 1 },
  placeName: { fontSize: 20, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 3 },
  meta: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  reasonBox: { borderRadius: 10, padding: 12, marginBottom: 12 },
  reasonText: { fontSize: 13, fontFamily: 'Inter_500Medium', lineHeight: 19 },
  infoChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 10 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  cautionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    borderWidth: 1,
    borderRadius: 10,
    padding: 9,
    marginBottom: 12,
  },
  cautionText: { flex: 1, fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 17, color: '#92400E' },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  kakaoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F7E600',
    paddingVertical: 12,
    borderRadius: 12,
  },
  kakaoBtnText: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#3A1D00' },
  detailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  detailLinkText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
});
