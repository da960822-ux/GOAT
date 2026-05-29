import React from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '@/src/components/Header';
import { useColors } from '@/hooks/useColors';

export default function AboutScreen() {
  const router = useRouter();
  const colors = useColors();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header title="GOAT 소개" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: colors.secondary }]}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>GOAT</Text>
          </View>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>강원도 감성 여행 가이드</Text>
          <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
            해외여행에서 느끼는 장면 감성을{'\n'}강원도 안에서 찾아드립니다.
          </Text>
        </View>

        <Section title="GOAT란?" colors={colors}>
          <Paragraph colors={colors}>
            GOAT는 "Greatest Of All Time"의 약자로, 강원도에서 가장 인상적인 감성 여행지를 큐레이션하는 앱입니다.
          </Paragraph>
          <Paragraph colors={colors}>
            흔히 유럽·일본·동남아시아 여행에서 느끼는 '그 장면 감성'을 강원도 안에서 30초 만에 찾아드립니다.
          </Paragraph>
        </Section>

        <Section title="어떻게 작동하나요?" colors={colors}>
          {[
            { step: '1', text: '9가지 해외 감성 카테고리 중 하나를 선택합니다.' },
            { step: '2', text: 'GOAT가 43개 강원도 명소를 감성 점수로 분석합니다.' },
            { step: '3', text: '장면 최적 · 같은 장면 대안 · 날씨 맞춤, 3장의 카드를 추천받습니다.' },
            { step: '4', text: '카드를 눌러 상세 정보와 지도 링크를 확인합니다.' },
          ].map((item) => (
            <View key={item.step} style={[styles.stepRow]}>
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
            { role: '같은 장면 대안', desc: '첫 번째 장소가 먼 경우 비슷한 감성으로 대체할 수 있는 장소.' },
            { role: '날씨 맞춤', desc: '현재 계절과 접근성이 좋아 지금 방문하기 최적인 장소.' },
          ].map((item) => (
            <View key={item.role} style={[styles.roleRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Text style={[styles.roleLabel, { color: colors.primary }]}>{item.role}</Text>
              <Text style={[styles.roleDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
            </View>
          ))}
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
  hero: { alignItems: 'center', padding: 32, marginBottom: 4 },
  badge: { backgroundColor: '#84CC16', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 10, marginBottom: 12 },
  badgeText: { fontSize: 20, fontWeight: '900', fontFamily: 'Inter_700Bold', color: '#1A2E05', letterSpacing: 1.5 },
  heroTitle: { fontSize: 20, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 8, textAlign: 'center' },
  heroSub: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 21, textAlign: 'center' },
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
  spacer: { height: 32 },
});
