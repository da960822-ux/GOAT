import React from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '@/src/components/Header';
import { useColors } from '@/hooks/useColors';

export default function PrivacyScreen() {
  const router = useRouter();
  const colors = useColors();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header title="개인정보 처리방침" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.notice, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
            시행일: 2025년 1월 1일{'\n'}최종 수정일: 2025년 6월 1일
          </Text>
        </View>

        {SECTIONS.map((sec) => (
          <View key={sec.title} style={[styles.section, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{sec.title}</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>{sec.body}</Text>
          </View>
        ))}
        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const SECTIONS = [
  {
    title: '수집하는 개인정보',
    body: 'GOAT 앱은 어떠한 개인정보도 수집하지 않습니다. 회원가입, 로그인, 위치정보 수집 기능이 없으며, 앱 사용 중 입력되는 모든 선택 정보(감성 선택 등)는 기기 내에서만 처리됩니다.',
  },
  {
    title: '위치정보 수집',
    body: '본 앱은 사용자의 GPS 또는 위치정보를 수집하거나 사용하지 않습니다. 지도 앱 연동 시 외부 앱(카카오맵, 네이버 지도, 티맵)으로 이동하며, 해당 앱의 개인정보 처리방침이 적용됩니다.',
  },
  {
    title: '분석 및 추적',
    body: '앱 내 어떠한 분석 도구, 광고 추적, 사용자 행동 수집 코드도 포함되어 있지 않습니다. 모든 추천 알고리즘은 사용자 기기에서만 실행됩니다.',
  },
  {
    title: '제3자 서비스',
    body: '지도 버튼 클릭 시 카카오맵·네이버 지도·티맵 앱이 실행됩니다. 각 서비스의 개인정보 처리방침은 해당 서비스 제공사의 정책을 따릅니다.',
  },
  {
    title: '문의',
    body: '개인정보 처리방침 관련 문의는 앱 스토어 리뷰 또는 개발사 이메일을 통해 연락해 주세요.',
  },
];

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 40 },
  notice: { margin: 20, padding: 14, borderRadius: 12, borderWidth: 1 },
  noticeText: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  section: { paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 10 },
  body: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  spacer: { height: 32 },
});
