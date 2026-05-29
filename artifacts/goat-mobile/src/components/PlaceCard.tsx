import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { RecommendationCard } from '@/src/types/place';
import { RecommendationRoleBadge } from './RecommendationRoleBadge';
import { TagBadge } from './TagBadge';
import { CautionBox } from './CautionBox';
import { MapButtonGroup } from './MapButtonGroup';
import { useColors } from '@/hooks/useColors';

interface PlaceCardProps {
  card: RecommendationCard;
  onPress?: () => void;
}

export function PlaceCard({ card, onPress }: PlaceCardProps) {
  const { place, role, reason } = card;
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <RecommendationRoleBadge role={role} />

      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.nameRow}>
        <View style={styles.nameBlock}>
          <Text style={[styles.placeName, { color: colors.foreground }]}>{place.place_name}</Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {place.city} · {place.region_group} · {place.place_type}
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>

      <View style={[styles.reasonBox, { backgroundColor: colors.overlay }]}>
        <Text style={[styles.reasonText, { color: colors.primary }]}>{reason}</Text>
      </View>

      <View style={styles.infoGrid}>
        <InfoRow icon="sun" label="주요 무드" value={place.primary_mood} colors={colors} />
        <InfoRow icon="clock" label="방문 시간" value={place.best_time} colors={colors} />
        <InfoRow icon="calendar" label="베스트 계절" value={place.best_season} colors={colors} />
        <InfoRow icon="navigation" label="접근성" value={place.accessibility} colors={colors} />
        {place.photo_point && (
          <InfoRow icon="camera" label="포토 포인트" value={place.photo_point} colors={colors} multiline />
        )}
      </View>

      <View style={styles.tags}>
        {place.mood_tags.slice(0, 5).map((tag) => (
          <TagBadge key={tag} label={`#${tag}`} />
        ))}
      </View>

      {expanded && <CautionBox note={place.note} />}

      <TouchableOpacity
        onPress={() => setExpanded((v) => !v)}
        style={[styles.expandBtn, { borderTopColor: colors.border }]}
      >
        <Text style={[styles.expandText, { color: colors.mutedForeground }]}>
          {expanded ? '유의사항 접기' : '유의사항 보기'}
        </Text>
        <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.mutedForeground} />
      </TouchableOpacity>

      <MapButtonGroup place={place} />
    </View>
  );
}

function InfoRow({ icon, label, value, colors, multiline }: { icon: string; label: string; value: string; colors: any; multiline?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Feather name={icon as any} size={13} color={colors.primary} style={styles.infoIcon} />
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }, multiline && styles.multiline]} numberOfLines={multiline ? 3 : 1}>
        {value}
      </Text>
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
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 10 },
  nameBlock: { flex: 1 },
  placeName: { fontSize: 20, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 3 },
  meta: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  reasonBox: { borderRadius: 10, padding: 12, marginBottom: 14 },
  reasonText: { fontSize: 14, fontFamily: 'Inter_500Medium', lineHeight: 20 },
  infoGrid: { gap: 8, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start' },
  infoIcon: { marginTop: 2, marginRight: 6, width: 16 },
  infoLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', width: 76, marginRight: 4 },
  infoValue: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  multiline: { lineHeight: 19 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 2 },
  expandBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 12, marginTop: 4, borderTopWidth: 1, gap: 4 },
  expandText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
});
