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

        {/* Brand hero */}
        <View style={[styles.hero, { backgroundColor: colors.primary }]}>
          <GoatLogo variant="stacked" size="lg" theme="dark" />
          <View style={[styles.brandSentenceBox, { borderTopColor: 'rgba(255,255,255,0.15)' }]}>
            <Text style={styles.brandSentence}>
              해외의 감성을, 강원도에서.
            </Text>
            <Text style={styles.brandDesc}>
              GOAT는 강원도 안에서 발견하는 해외 여행 같은 순간을 제안하는 감성 여행 모바일 앱 브랜드입니다.
            </Text>
          </View>
        </View>

        <Section title="GOAT란?" colors={colors}>
          <Paragraph colors={colors}>
            GOAT는 "Gangwon Of All Time"의 약자로, 강원도 안에서 해외여행 같은 이색 장면을 빠르게 고를 수 있게 돕는 감성 관광 큐레이션 서비스입니다.
          </Paragraph>
          <Paragraph colors={colors}>
            흔히 유럽·일본·동남아시아 여행에서 느끼는 '그 장면 감성'을 강원도 안에서 30초 만에 찾아드립니다.
          </Paragraph>
        </Section>

        <Section title="어떻게 작동하나요?" colors={colors}>
          {[
            { step: '1', text: '9가지 해외 감성 카테고리 중 하나를 선택합니다.' },
            { step: '2', text: '초기 MVP에서는 선별된 강원 이색 장면 후보를 중심으로 감성 추천을 제공합니다.' },
            { step: '3', text: '장면 최적 · 상황 맞춤 · 안전한 대안, 3장의 카드를 추천받습니다.' },
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
            { role: '장면 최적', desc: '선택한 감성과 가장 점수가 높은 장소. 무드 태그·대표 무드·사진 포인트를 종합적으로 분석합니다.' },
            { role: '내 상황 맞춤', desc: '이동 수단, 동행, 목적 조건에 가장 잘 맞는 장소.' },
            { role: '안전한 대안', desc: '현재 계절과 접근성이 좋아 지금 방문하기 최적인 장소.' },
          ].map((item) => (
            <View key={item.role} style={[styles.roleRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Text style={[styles.roleLabel, { color: colors.primary }]}>{item.role}</Text>
              <Text style={[styles.roleDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
            </View>
          ))}
        </Section>

        {/* Brand colors swatch */}
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
