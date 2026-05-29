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

  const timeShort = place.best_time.length > 14
    ? place.best_time.slice(0, 14) + '…'
    : place.best_time;

  return (
    <View style={[
      styles.card,
      { backgroundColor: '#FAFAF9', borderColor: colors.border },
    ]}>
      {/* Top: role badge + region */}
      <View style={styles.topRow}>
        <RecommendationRoleBadge role={role} />
        <View style={[styles.regionBadge, { backgroundColor: region.bg, borderColor: region.border }]}>
          <View style={[styles.regionDot, { backgroundColor: region.accent }]} />
          <Text style={[styles.regionLabel, { color: region.accent }]}>
            {place.city}
          </Text>
        </View>
      </View>

      {/* Reason — emotional headline */}
      <Text style={[styles.reason, { color: colors.foreground }]} numberOfLines={3}>
        {reason}
      </Text>

      {/* Place name + type */}
      <View style={styles.nameRow}>
        <Text style={[styles.placeName, { color: colors.foreground }]}>{place.place_name}</Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>{place.place_type}</Text>
      </View>

      {/* Mood tags */}
      <View style={styles.tags}>
        {place.mood_tags.slice(0, 4).map((tag) => (
          <View key={tag} style={[styles.tag, { backgroundColor: region.bg, borderColor: region.border }]}>
            <Text style={[styles.tagText, { color: region.accent }]}>#{tag}</Text>
          </View>
        ))}
      </View>

      {/* Practical info — secondary row */}
      <View style={styles.infoRow}>
        <InfoPill icon="clock" label={timeShort} color={colors.mutedForeground} />
        <InfoPill icon="calendar" label={place.best_season} color={colors.mutedForeground} />
      </View>

      {/* Caution */}
      {!!place.note && (
        <View style={[styles.cautionRow, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
          <Feather name="alert-triangle" size={11} color="#D97706" style={{ marginTop: 1 }} />
          <Text style={styles.cautionText} numberOfLines={2}>{place.note}</Text>
        </View>
      )}

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.kakaoBtn}
          onPress={handleKakaoMap}
          activeOpacity={0.82}
        >
          <Feather name="navigation" size={13} color="#3A1D00" />
          <Text style={styles.kakaoBtnText}>카카오맵</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.detailLink} onPress={onPress} activeOpacity={0.7}>
          <Text style={[styles.detailLinkText, { color: colors.primary }]}>장소 열어보기</Text>
          <Feather name="arrow-right" size={13} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InfoPill({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <View style={styles.infoPill}>
      <Feather name={icon as any} size={11} color={color} />
      <Text style={[styles.infoPillText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  regionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    borderWidth: 1,
  },
  regionDot: { width: 5, height: 5, borderRadius: 3 },
  regionLabel: { fontSize: 11, fontFamily: 'Inter_500Medium' },

  reason: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
    marginBottom: 14,
    color: '#3D3D3D',
  },

  nameRow: { marginBottom: 12 },
  placeName: { fontSize: 20, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 2 },
  meta: { fontSize: 12, fontFamily: 'Inter_400Regular' },

  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 12 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  tagText: { fontSize: 11, fontFamily: 'Inter_400Regular' },

  infoRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  infoPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoPillText: { fontSize: 12, fontFamily: 'Inter_400Regular' },

  cautionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderRadius: 9,
    padding: 8,
    marginBottom: 12,
  },
  cautionText: { flex: 1, fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 17, color: '#92400E' },

  divider: { height: 1, marginBottom: 14 },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  kakaoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#F7E600',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  kakaoBtnText: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#3A1D00' },
  detailLink: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingVertical: 11,
    paddingHorizontal: 4,
  },
  detailLinkText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
});
