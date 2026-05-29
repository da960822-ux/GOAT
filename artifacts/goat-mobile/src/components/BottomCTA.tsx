import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

interface BottomCTAProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  subtitle?: string;
}

export function BottomCTA({ label, onPress, disabled = false, subtitle }: BottomCTAProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingBottom: bottomPad + 12, backgroundColor: colors.background, borderTopColor: colors.border }]}>
      {subtitle && <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>}
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.85}
        style={[styles.btn, { backgroundColor: disabled ? colors.muted : colors.primary }]}
        testID="bottom-cta"
      >
        <Text style={[styles.btnText, { color: disabled ? colors.mutedForeground : colors.primaryForeground }]}>{label}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 10,
  },
  btn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.2,
  },
});
