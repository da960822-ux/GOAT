import React from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { BrandIcon as Feather } from '@/src/components/BrandIcon';
import { Header } from '@/src/components/Header';
import { useColors } from '@/hooks/useColors';

export default function GuideScreen() {
  const router = useRouter();
  const colors = useColors();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header title="이용 안내" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {GUIDE_STEPS.map((step, i) => (
          <View key={i} style={[styles.step, { borderBottomColor: colors.border }]}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepIcon, { backgroundColor: colors.secondary }]}>
                <Feather name={step.icon as any} size={20} color={colors.primary} />
              </View>
              <View style={styles.stepMeta}>
                <Text style={[styles.stepNum, { color: colors.mutedForeground }]}>STEP {i + 1}</Text>
                <Text style={[styles.stepTitle, { color: colors.foreground }]}>{step.title}</Text>
              </View>
            </View>
            <Text style={[styles.stepBody, { color: colors.mutedForeground }]}>{step.body}</Text>
            {step.tips.map((tip, j) => (
              <View key={j} style={[styles.tipRow, { backgroundColor: colors.secondary }]}>
                <Feather name="check" size={12} color={colors.primary} />
                <Text style={[styles.tipText, { color: colors.secondaryForeground }]}>{tip}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={[styles.faqSection, { borderBottomColor: colors.border }]}>
          <Text style={[styles.faqTitle, { color: colors.foreground }]}>자주 묻는 질문</Text>
          {FAQ.map((faq, i) => (
            <View key={i} style={[styles.faqItem, { borderColor: colors.border }]}>
              <Text style={[styles.faqQ, { color: colors.primary }]}>Q. {faq.q}</Text>
              <Text style={[styles.faqA, { color: colors.mutedForeground }]}>{faq.a}</Text>
            </View>
          ))}
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const GUIDE_STEPS = [
  {
    icon: 'list',
    title: '감성 선택',
    body: '먼저 7개 큰 무드 중 지금 끌리는 분위기를 고릅니다. 프론트 구현에서는 각 무드 안의 21개 세부 레퍼런스 카드로 더 좁혀 선택할 수 있습니다.',
    tips: [
      '큰 무드는 빠른 시작점이고, 세부 레퍼런스 카드는 실제 추천 정확도를 높이는 선택지입니다.',
      '세부 카드를 고르면 referenceCardId 기준으로 추천을 요청할 수 있습니다.',
    ],
  },
  {
    icon: 'layers',
    title: '조건 입력 후 추천 카드 비교',
    body: '여행 목적과 이동수단을 선택하면 조건에 맞는 강원 명소 3곳을 추천합니다. 동행자, 출발 위치, 방문 시간은 현재 추천 카드 점수에 직접 반영되지 않습니다.',
    tips: [
      '장면 최적: 선택한 감성과 가장 잘 맞는 장소',
      '같은 분위기 대안: 같은 무드 안에서 비교할 수 있는 장소',
      '조건 맞춤: 목적, 이동수단, 계절 조건을 우선 반영한 장소',
    ],
  },
  {
    icon: 'map-pin',
    title: '상세 정보 확인',
    body: '카드를 누르면 장소 설명, 사진 포인트, 접근성, 주의사항을 확인할 수 있습니다. 운영 여부나 통제 정보는 방문 전 공식 채널에서 한 번 더 확인하는 것을 권장합니다.',
    tips: [
      '사진과 관광 정보는 한국관광공사 API 또는 자체 장소 데이터로 보완됩니다.',
      '저장 기능은 로그인 없이 기기 안에서 먼저 사용할 수 있습니다.',
    ],
  },
  {
    icon: 'navigation',
    title: '지도 앱으로 이동',
    body: '마음에 드는 장소는 카카오맵 링크로 열 수 있습니다. 추천은 감성 선택과 조건에 기반하며, 현재 출발 위치 기준 가까운 순 정렬은 아직 적용되지 않습니다.',
    tips: [
      '위치 권한을 허용하지 않아도 감성 기반 추천은 이용할 수 있습니다.',
      '지도 앱에서는 실제 경로, 이동 시간, 운영 상태를 다시 확인하세요.',
    ],
  },
];

const FAQ = [
  {
    q: '추천 결과가 계속 비슷하면 어떻게 하나요?',
    a: '"이 감성으로 다시 추천"을 누르면 이전에 본 장소를 제외하고 다른 3곳을 요청할 수 있습니다.',
  },
  {
    q: '로그인이나 위치 정보가 꼭 필요한가요?',
    a: '아니요. 기본 추천은 로그인 없이 사용할 수 있습니다. 위치 정보는 현재 추천 카드 점수에 직접 반영되지 않으므로 필수 입력이 아닙니다.',
  },
  {
    q: '장소가 휴무이거나 통제 중이면 어떻게 하나요?',
    a: 'GOAT는 정적 장소 데이터와 공공 API를 함께 사용합니다. 실시간 운영 상태를 보장하지 않으므로 방문 전 공식 채널이나 지도 앱에서 운영 여부를 확인하세요.',
  },
];

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 40 },
  step: { paddingHorizontal: 20, paddingVertical: 20, borderBottomWidth: 1 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  stepIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepMeta: { flex: 1 },
  stepNum: { fontSize: 11, fontFamily: 'Inter_500Medium', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 },
  stepTitle: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  stepBody: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22, marginBottom: 10 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, marginBottom: 5 },
  tipText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  faqSection: { paddingHorizontal: 20, paddingVertical: 20, borderBottomWidth: 1 },
  faqTitle: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 14 },
  faqItem: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  faqQ: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginBottom: 6 },
  faqA: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  spacer: { height: 32 },
});
