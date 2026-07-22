import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BrandIcon as Feather } from '@/src/components/BrandIcon';
import { Place } from '@/src/types/place';
import { useColors } from '@/hooks/useColors';

interface EvidenceItem {
  label: string;
  value: string;
  type: 'ok' | 'warn' | 'info';
}

function buildEvidence(place: Place): EvidenceItem[] {
  const items: EvidenceItem[] = [];

  if (place.mood_tags.length > 0) {
    items.push({
      label: '감성 태그 일치',
      value: `${place.mood_tags.length}개 확인`,
      type: 'ok',
    });
  }

  if (place.primary_mood) {
    items.push({
      label: '대표 무드 일치',
      value: place.primary_mood.length > 20 ? place.primary_mood.slice(0, 20) + '…' : place.primary_mood,
      type: 'ok',
    });
  }

  if (place.photo_point) {
    items.push({
      label: '사진 포인트 적합',
      value: '포인트 확인됨',
      type: 'ok',
    });
  }

  if (place.best_season || place.best_time) {
    const parts = [place.best_season, place.best_time].filter(Boolean).join(' · ');
    items.push({
      label: '추천 계절/시간 참고',
      value: parts.length > 22 ? parts.slice(0, 22) + '…' : parts,
      type: 'info',
    });
  }

  if (place.accessibility) {
    items.push({
      label: '접근성 참고',
      value: place.accessibility.length > 22 ? place.accessibility.slice(0, 22) + '…' : place.accessibility,
      type: 'info',
    });
  }

  if (place.note) {
    items.push({
      label: '주의사항 확인 필요',
      value: place.note.length > 22 ? place.note.slice(0, 22) + '…' : place.note,
      type: 'warn',
    });
  }

  return items;
}

const ICON_MAP = {
  ok: 'check-circle',
  warn: 'alert-triangle',
  info: 'info',
} as const;

interface DataEvidenceSectionProps {
  place: Place;
  compact?: boolean;
}

export function DataEvidenceSection({ place, compact }: DataEvidenceSectionProps) {
  const colors = useColors();
  const items = buildEvidence(place);

  const iconColor = (type: EvidenceItem['type']) => {
    if (type === 'ok') return '#16A34A';
    if (type === 'warn') return '#D97706';
    return colors.primary;
  };

  const bgColor = (type: EvidenceItem['type']) => {
    if (type === 'ok') return '#F0FDF4';
    if (type === 'warn') return '#FFFBEB';
    return colors.secondary;
  };

  const textColor = (type: EvidenceItem['type']) => {
    if (type === 'ok') return '#15803D';
    if (type === 'warn') return '#92400E';
    return colors.primary;
  };

  if (compact) {
    return (
      <View style={styles.compactRow}>
        {items.map((item) => (
          <View
            key={item.label}
            style={[styles.chip, { backgroundColor: bgColor(item.type) }]}
          >
            <Feather name={ICON_MAP[item.type]} size={10} color={iconColor(item.type)} />
            <Text style={[styles.chipLabel, { color: textColor(item.type) }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.section, { borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>데이터 근거</Text>
      {items.map((item) => (
        <View key={item.label} style={[styles.row, { backgroundColor: bgColor(item.type), borderColor: bgColor(item.type) }]}>
          <Feather name={ICON_MAP[item.type]} size={14} color={iconColor(item.type)} style={styles.rowIcon} />
          <View style={styles.rowContent}>
            <Text style={[styles.rowLabel, { color: iconColor(item.type) }]}>{item.label}</Text>
            <Text style={[styles.rowValue, { color: textColor(item.type) }]}>{item.value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  compactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 14 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chipLabel: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  section: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  rowIcon: { marginTop: 1, marginRight: 8 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  rowValue: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17 },
});
