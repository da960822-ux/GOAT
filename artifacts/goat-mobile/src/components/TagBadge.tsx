import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface TagBadgeProps {
  label: string;
  variant?: 'default' | 'accent' | 'outline';
}

export function TagBadge({ label, variant = 'default' }: TagBadgeProps) {
  const colors = useColors();

  const bg =
    variant === 'accent' ? colors.accent
    : variant === 'outline' ? 'transparent'
    : colors.secondary;

  const textColor =
    variant === 'accent' ? colors.accentForeground
    : variant === 'outline' ? colors.primary
    : colors.secondaryForeground;

  const borderColor = variant === 'outline' ? colors.primary : 'transparent';

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor, borderWidth: variant === 'outline' ? 1 : 0 }]}>
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginRight: 6,
    marginBottom: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
});
