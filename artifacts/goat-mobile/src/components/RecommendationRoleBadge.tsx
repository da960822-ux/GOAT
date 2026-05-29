import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { RecommendationRole } from '@/src/types/place';

interface RecommendationRoleBadgeProps {
  role: RecommendationRole;
}

export function RecommendationRoleBadge({ role }: RecommendationRoleBadgeProps) {
  const colors = useColors();

  const config: Record<RecommendationRole, { bg: string; text: string; label: string }> = {
    '장면 최적': { bg: colors.roleBest, text: '#FFFFFF', label: '✦ 장면 최적' },
    '같은 장면 대안': { bg: colors.roleAlt, text: '#FFFFFF', label: '◎ 같은 장면 대안' },
    '날씨 맞춤': { bg: colors.roleWeather, text: '#FFFFFF', label: '◈ 날씨 맞춤' },
  };

  const c = config[role];

  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.text }]}>{c.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.3,
  },
});
