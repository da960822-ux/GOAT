import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { RecommendationRole } from '@/src/types/place';

interface RecommendationRoleBadgeProps {
  role: RecommendationRole;
}

const CONFIG: Record<RecommendationRole, { bg: string; text: string; border: string; label: string }> = {
  '장면 최적':      { bg: '#EDE9FE', text: '#5B21B6', border: '#C4B5FD', label: '가장 닮은 장면' },
  '내 상황 맞춤':   { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A', label: '비슷한 감성의 대안' },
  '안전한 대안':    { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0', label: '오늘 가기 편한 선택' },
  '같은 장면 대안': { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A', label: '비슷한 감성의 대안' },
  '날씨 맞춤':      { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0', label: '오늘 가기 편한 선택' },
};

export function RecommendationRoleBadge({ role }: RecommendationRoleBadgeProps) {
  const c = CONFIG[role];

  return (
    <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.text, { color: c.text }]}>{c.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.2,
  },
});
