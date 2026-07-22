import React from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { BrandIcon as Feather } from '@/src/components/BrandIcon';
import { Header } from '@/src/components/Header';
import { useColors } from '@/hooks/useColors';
import { fonts, palette, radius, spacing } from '@/src/theme/editorial';

async function openLink(url: string) {
  try {
    const can = await Linking.canOpenURL(url);
    if (can) await Linking.openURL(url);
    else Alert.alert('열기 실패', '링크를 열 수 없습니다.');
  } catch {
    Alert.alert('열기 실패', '링크를 열 수 없습니다.');
  }
}

export default function ContactScreen() {
  const router = useRouter();
  const colors = useColors();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header title="문의하기" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: colors.secondary }]}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primary }]}>
            <Feather name="mail" size={28} color="#FFFFFF" />
          </View>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>무엇이든 물어보세요</Text>
          <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
            장소 정보 오류 · 앱 개선 아이디어{'\n'}협업 문의 모두 환영합니다
          </Text>
        </View>

        {CHANNELS.map((ch) => (
          <TouchableOpacity
            key={ch.label}
            style={[styles.row, { borderBottomColor: colors.border }]}
            onPress={() => ch.url && openLink(ch.url)}
            activeOpacity={ch.url ? 0.7 : 1}
          >
            <View style={[styles.rowIcon, { backgroundColor: ch.bg }]}>
              <Feather name={ch.icon as any} size={18} color={ch.iconColor} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>{ch.label}</Text>
              <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{ch.value}</Text>
            </View>
            {ch.url && <Feather name="external-link" size={14} color={colors.mutedForeground} />}
          </TouchableOpacity>
        ))}

        <View style={[styles.notice, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="clock" size={14} color={colors.mutedForeground} />
          <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
            문의 답변은 평일 기준 2~3일 내 드립니다.{'\n'}
            장소 정보 오류 신고는 우선 처리됩니다.
          </Text>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const CHANNELS = [
  {
    label: '이메일 문의',
    value: 'contact@goattravel.app',
    icon: 'mail',
    bg: '#EDE9FE',
    iconColor: '#7C3AED',
    url: 'mailto:contact@goattravel.app',
  },
  {
    label: '장소 정보 오류 신고',
    value: '잘못된 장소 정보, 폐업 정보 등 제보',
    icon: 'alert-circle',
    bg: '#FEF3C7',
    iconColor: '#D97706',
    url: 'mailto:contact@goattravel.app?subject=장소정보오류신고',
  },
  {
    label: '앱 개선 아이디어',
    value: '새로운 감성 카테고리, 기능 제안 등',
    icon: 'zap',
    bg: '#D1FAE5',
    iconColor: '#065F46',
    url: 'mailto:contact@goattravel.app?subject=앱개선아이디어',
  },
  {
    label: '협업·파트너십 문의',
    value: '관광청, 지자체, 미디어 협업',
    icon: 'briefcase',
    bg: '#E0F2FE',
    iconColor: '#0369A1',
    url: 'mailto:contact@goattravel.app?subject=협업문의',
  },
];

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 40 },
  hero: { alignItems: 'center', padding: spacing.xl, marginBottom: 4 },
  heroIcon: { width: 60, height: 60, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 12, backgroundColor: palette.forest },
  heroTitle: { fontSize: 20, fontFamily: fonts.serif, marginBottom: 6 },
  heroSub: { fontSize: 13, fontFamily: fonts.body, lineHeight: 21, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 76,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: 14,
  },
  rowIcon: { width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontFamily: fonts.semibold, marginBottom: 2 },
  rowValue: { fontSize: 12, fontFamily: fonts.body },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, margin: spacing.lg, padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  noticeText: { flex: 1, fontSize: 13, fontFamily: fonts.body, lineHeight: 21 },
  spacer: { height: 32 },
});
