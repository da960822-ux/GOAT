import React from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { BrandIcon as Feather } from '@/src/components/BrandIcon';
import { Header } from '@/src/components/Header';
import { useColors } from '@/hooks/useColors';
import { fonts, radius, spacing } from '@/src/theme/editorial';
import { MotionPressable } from '@/src/components/MotionPressable';

const LINKS = [
  { label: 'GOAT 소개', icon: 'info' as const, path: '/about' },
  { label: '이용 안내', icon: 'recommend' as const, path: '/guide' },
  { label: '데이터 출처', icon: 'database' as const, path: '/data-source' },
  { label: '이용약관', icon: 'shield' as const, path: '/terms' },
  { label: '개인정보처리방침', icon: 'shield' as const, path: '/privacy' },
  { label: '문의하기', icon: 'mail' as const, path: '/contact' },
];

export default function ServiceScreen() {
  const router = useRouter();
  const colors = useColors();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header title="서비스 안내" onBack={() => router.back()} />

      <Animated.View entering={FadeInDown.duration(320)} style={styles.intro}><Text accessibilityRole="header" style={[styles.introTitle, { color: colors.foreground }]}>GOAT 알아보기</Text><Text style={[styles.introBody, { color: colors.mutedForeground }]}>여행에 필요한 안내와 데이터 출처를 한곳에서 확인하세요.</Text></Animated.View><Animated.View entering={FadeInDown.delay(100).duration(320)} style={styles.list}>
        {LINKS.map((item, i) => (
          <MotionPressable
            key={item.path}
            style={[
              styles.row,
              { borderBottomColor: colors.border },
              i === 0 && { borderTopWidth: 1, borderTopColor: colors.border },
            ]}
            onPress={() => router.push(item.path as any)}
            accessibilityRole="button"
            accessibilityLabel={`${item.label} 열기`}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
              <Feather name={item.icon} size={16} color={colors.primary} />
            </View>
            <Text style={[styles.label, { color: colors.foreground }]}>{item.label}</Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </MotionPressable>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  intro: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  introTitle: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 30 },
  introBody: { marginTop: 6, fontFamily: fonts.body, fontSize: 14, lineHeight: 22 },
  list: { marginTop: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, fontSize: 16, fontFamily: fonts.semibold },
});
