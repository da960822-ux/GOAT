import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BrandIcon as Feather } from '@/src/components/BrandIcon';
import { useColors } from '@/hooks/useColors';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  const colors = useColors();
  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <View style={[styles.rule, { backgroundColor: colors.accent }]} />
      <View style={[styles.icon, { backgroundColor: colors.secondary }]}>
        <Feather name="map-pin" size={30} color={colors.primary} motion="pulse" />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      {description && <Text style={[styles.desc, { color: colors.mutedForeground }]}>{description}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity accessibilityRole="button" style={[styles.btn, { backgroundColor: colors.primary }]} onPress={onAction}>
          <Text style={[styles.btnText, { color: colors.primaryForeground }]}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 56 },
  rule: { width: 32, height: 2, borderRadius: 1, marginBottom: 22 },
  icon: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 21, lineHeight: 29, fontWeight: '600', fontFamily: 'NotoSerifKR_600SemiBold', textAlign: 'center', marginBottom: 8 },
  desc: { maxWidth: 310, fontSize: 14, fontFamily: 'PretendardRegular', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  btn: { minHeight: 48, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, justifyContent: 'center' },
  btnText: { fontSize: 15, fontWeight: '600', fontFamily: 'PretendardSemiBold' },
});
