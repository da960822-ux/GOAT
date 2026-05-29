import React from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
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
            <View style={[styles.stepHeader]}>
              <View style={[styles.stepIcon, { backgroundColor: colors.secondary }]}>
                <Feather name={step.icon as any} size={20} color={colors.primary} />
              </View>
              <View style={styles.stepMeta}>
                <Text style={[styles.stepNum, { color: colors.mutedForeground }]}>STEP {i + 1}</Text>
                <Text style={[styles.stepTitle, { color: colors.foreground }]}>{step.title}</Text>
              </View>
            </View>
            <Text style={[styles.stepBody, { color: colors.mutedForeground }]}>{step.body}</Text>
            {step.tips && step.tips.map((tip, j) => (
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
    title: '원하는 감성 선택',
    body: '홈 화면에서 "내 감성으로 장소 찾기"를 누르면 9가지 감성 카테고리가 표시됩니다. 지금 가고 싶은 분위기와 가장 비슷한 감성 하나를 선택하세요.',
    tips: [
      '카드 아래 설명 문구와 키워드 태그를 참고하세요.',
      '여러 번 바꿔서 결과를 비교해볼 수 있습니다.',
    ],
  },
  {
    icon: 'layers',
    title: '조건 입력 후 추천 카드 비교',
    body: '동행, 이동 수단, 여행 목적을 선택하면 조건에 맞는 강원도 명소 3곳이 추천됩니다. 각 카드는 역할이 다릅니다.',
    tips: [
      '장면 최적: 감성 점수가 가장 높은 장소',
      '내 상황 맞춤: 선택한 동행·이동·목적에 최적화된 장소',
      '안전한 대안: 현재 계절·접근성 최적 장소',
    ],
  },
  {
    icon: 'map-pin',
    title: '상세 정보 확인 및 장소 저장',
    body: '카드를 누르면 해당 장소의 상세 정보를 볼 수 있습니다. 사진 포인트, 방문 시간, 유의사항을 확인하고, 북마크 버튼으로 장소를 저장할 수 있습니다.',
    tips: [
      '같은 감성 대안에서 비슷한 다른 장소로 이동할 수 있습니다.',
      '저장한 장소는 로그인 없이 기기에 보관됩니다.',
    ],
  },
  {
    icon: 'navigation',
    title: '마음에 드는 장소를 카카오맵으로 연결',
    body: '상세 화면 하단의 지도 버튼을 누르면 카카오맵으로 이동합니다. 장소명과 도시 정보로 검색이 연결됩니다.',
    tips: [
      '카카오맵이 설치되어 있어야 합니다.',
      '앱이 없으면 웹 버전이 열립니다.',
    ],
  },
];

const FAQ = [
  {
    q: '추천 결과가 항상 같은가요?',
    a: '"이 감성으로 다시 추천" 버튼을 누르면 이전과 다른 3곳을 새로 추천합니다. 계절이 바뀌면 안전한 대안 카드도 달라질 수 있습니다.',
  },
  {
    q: '로그인이나 위치 정보가 필요한가요?',
    a: '아니요. GOAT는 완전히 오프라인으로 작동합니다. 로그인, 위치 정보, 인터넷 연결이 필요하지 않습니다.',
  },
  {
    q: '장소가 휴업 또는 폐업한 경우 어떻게 하나요?',
    a: '앱 데이터는 주기적으로 업데이트되지만, 실시간 운영 정보는 제공하지 않습니다. 방문 전 공식 채널이나 지도 앱에서 운영 여부를 확인해주세요.',
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
