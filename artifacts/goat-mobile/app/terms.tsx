import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Header } from "@/src/components/Header";
import { useColors } from "@/hooks/useColors";
import { fonts, spacing } from "@/src/theme/editorial";

const sections = [
  ["서비스", "GOAT는 사용자가 고른 분위기와 조건을 바탕으로 강원 여행 장소와 코스를 제안합니다. 추천과 장소 정보는 여행 계획을 돕기 위한 참고 정보입니다."],
  ["장소 정보 확인", "운영시간, 휴무, 입장, 예약, 교통과 날씨 정보는 현장 사정에 따라 달라질 수 있습니다. 방문 전 상세 화면의 출처와 장소 운영자의 최신 안내를 확인해 주세요."],
  ["외부 서비스", "주소 검색, 이동시간 계산과 지도 열기에는 외부 서비스가 사용될 수 있으며 해당 서비스의 약관과 개인정보 처리방침이 적용됩니다."],
  ["이용자의 책임", "서비스를 부정하게 방해하거나 타인의 권리와 안전을 침해하는 방식으로 사용할 수 없습니다."],
  ["변경과 중단", "데이터 제공자의 장애, 점검 또는 불가피한 사정으로 일부 기능이 일시 중단될 수 있습니다. 약관이 바뀌면 시행일과 변경 내용을 서비스에서 알립니다."],
  ["문의", "서비스와 약관 관련 문의는 contact@goattravel.app으로 보내 주세요. 출시 전 원스토어 판매자 정보와 동일한 운영자 정보를 공개 약관 페이지에 게시합니다."],
] as const;

export default function TermsScreen() {
  const router = useRouter();
  const colors = useColors();
  return <View style={[styles.root, { backgroundColor: colors.background }]}>
    <Header title="이용약관" onBack={() => router.back()} />
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Text style={[styles.date, { color: colors.mutedForeground }]}>시행일: 2026년 9월 13일</Text>
      {sections.map(([title, body]) => <View key={title} style={[styles.section, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>{body}</Text>
      </View>)}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 40 },
  date: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, fontFamily: fonts.body, fontSize: 13 },
  section: { paddingHorizontal: spacing.lg, paddingVertical: 20, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { marginBottom: 10, fontFamily: fonts.serif, fontSize: 17 },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 23 },
});
