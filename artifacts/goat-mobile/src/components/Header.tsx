import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { BrandIcon as Feather } from '@/src/components/BrandIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/src/theme/editorial';

interface HeaderProps {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function Header({ title, onBack, right }: HeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPadding + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <View style={styles.inner}>
        <View style={styles.left}>
          {onBack && (
            <Pressable accessibilityRole="button" accessibilityLabel="뒤로 가기" onPress={onBack} style={({ pressed }) => [styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]} testID="back-button">
              <Feather name="arrow-left" size={20} color={colors.foreground} />
            </Pressable>
          )}
        </View>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{title ?? ''}</Text>
        <View style={styles.right}>{right ?? <View style={styles.spacer} />}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  left: { width: 48 },
  right: { width: 48, alignItems: 'flex-end' },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: { width: 48, height: 48 },
  pressed: { opacity: 0.78 },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontFamily: fonts.semibold,
  },
});
