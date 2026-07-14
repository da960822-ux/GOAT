import React from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '@/src/components/Header';
import { useColors } from '@/hooks/useColors';
import { GoatLogo } from '@/src/components/GoatLogo';

export default function AboutScreen() {
  const router = useRouter();
  const colors = useColors();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header title="GOAT 소개" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: colors.primary }]}>
          <GoatLogo variant="stacked" size="lg" theme="dark" />
          <View style={[styles.brandSentenceBox, { borderTopColor: 'rgba(255,255,255,0.15)' }]}>
            <Text style={styles.brandSentence}>해외의 감성을, 강원도에서.</Text>
            <Text style={styles.brandDesc}>
              GOAT는 강원도 안에서 해외여행 같은 장면을 빠르게 고를 수 있게 돕는 감성 관광 큐레이션 서비스입니다.
            </Text>
          </View>
        </View>

        <Section title="GOAT는?" colors={colors}>
          <Paragraph colors={colors}>
            GOAT는 Gangwon Of All Time의 약자로, 사용자가 고른 감성에 맞춰 강원도의 이색 장소를 3개 카드로 압축해 제안합니다.
          </Paragraph>
          <Paragraph colors={colors}>
            현재 추천은 7개 큰 무드와 21개 세부 레퍼런스 카드를 기반으로 동작하며, 58개 강원 장소 데이터에서 후보를 고릅니다.
          </Paragraph>
        </Section>

        <Section title="어떻게 작동하나요?" colors={colors}>
          {[
            { step: '1', text: '7개 큰 무드 중 하나를 고르고, 필요하면 21개 세부 레퍼런스 카드로 장면을 더 좁힙니다.' },
            { step: '2', text: '여행 목적과 이동수단을 입력해 조건 점수를 반영합니다.' },
            { step: '3', text: '장면 최적, 같은 분위기 대안, 조건 맞춤 3개 카드를 추천받습니다.' },
            { step: '4', text: '카드를 눌러 상세 정보와 카카오맵 링크를 확인합니다.' },
          ].map((item) => (
            <View key={item.step} style={styles.stepRow}>
              <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepNumText}>{item.step}</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.foreground }]}>{item.text}</Text>
            </View>
          ))}
        </Section>

        <Section title="추천 카드 유형" colors={colors}>
          {[
            { role: '장면 최적', desc: '선택한 감성과 가장 정직하게 맞는 장소입니다.' },
            { role: '같은 분위기 대안', desc: '같은 무드 안에서 비교할 수 있는 두 번째 선택지입니다.' },
            { role: '조건 맞춤', desc: '여행 목적, 이동수단, 현재 계절 조건을 더 우선해 고른 장소입니다.' },
          ].map((item) => (
            <View key={item.role} style={[styles.roleRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Text style={[styles.roleLabel, { color: colors.primary }]}>{item.role}</Text>
              <Text style={[styles.roleDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
            </View>
          ))}
        </Section>

        <Section title="브랜드 컬러" colors={colors}>
          <View style={styles.swatchRow}>
            {[
              { color: '#3A2374', label: 'Deep Violet' },
              { color: '#C6E33D', label: 'Lime' },
              { color: '#2E5D3D', label: 'Deep Green' },
            ].map((s) => (
              <View key={s.color} style={styles.swatchItem}>
                <View style={[styles.swatch, { backgroundColor: s.color }]} />
                <Text style={[styles.swatchHex, { color: colors.mutedForeground }]}>{s.color}</Text>
                <Text style={[styles.swatchLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </Section>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

function Section({ title, colors, children }: { title: string; colors: any; children: React.ReactNode }) {
  return (
    <View style={[styles.section, { borderBottomColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {children}
    </View>
  );
}

function Paragraph({ colors, children }: { colors: any; children: React.ReactNode }) {
  return <Text style={[styles.para, { color: colors.mutedForeground }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 40 },
  hero: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24, marginBottom: 4, gap: 24 },
  brandSentenceBox: { width: '100%', paddingTop: 20, borderTopWidth: 1, alignItems: 'center', gap: 8 },
  brandSentence: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  brandDesc: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.6)',
  },
  section: { paddingHorizontal: 20, paddingVertical: 20, borderBottomWidth: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 14 },
  para: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22, marginBottom: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  stepNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNumText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  stepText: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 21 },
  roleRow: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 8 },
  roleLabel: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 5 },
  roleDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  swatchRow: { flexDirection: 'row', gap: 16 },
  swatchItem: { alignItems: 'center', gap: 6 },
  swatch: { width: 48, height: 48, borderRadius: 12 },
  swatchHex: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  swatchLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  spacer: { height: 32 },
});
