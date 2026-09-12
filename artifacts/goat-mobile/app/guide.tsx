import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Header } from "@/src/components/Header";
import { useColors } from "@/hooks/useColors";
import { fonts, palette, spacing } from "@/src/theme/editorial";

export default function GuideScreen() {
  const router = useRouter();
  const colors = useColors();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header title="이용 안내" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text style={[styles.title, { color: colors.foreground }]}>한 장면에서 시작해{`\n`}갈 곳 하나를 고릅니다.</Text>
          <Text style={[styles.introBody, { color: colors.mutedForeground }]}>조건을 길게 입력하지 않아도 돼요. 장면 하나를 고르면 세 곳을 비교하고, 지도에서 확인하거나 이 기기에 저장할 수 있습니다.</Text>
        </View>

        <View style={styles.steps}>
          {GUIDE_STEPS.map((step, index) => (
            <View key={step.title} style={[styles.step, { borderBottomColor: colors.border }]}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
              <View style={styles.stepCopy}>
                <Text style={[styles.stepTitle, { color: colors.foreground }]}>{step.title}</Text>
                <Text style={[styles.stepBody, { color: colors.mutedForeground }]}>{step.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.note, { borderColor: colors.border }]}>
          <Text style={[styles.noteTitle, { color: colors.foreground }]}>방문 전 확인</Text>
          <Text style={[styles.noteBody, { color: colors.mutedForeground }]}>사진과 이동 정보는 현재 확인 가능한 데이터만 보여줍니다. 운영 여부, 출입 통제와 실제 경로는 공식 채널이나 지도 앱에서 다시 확인해 주세요.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const GUIDE_STEPS = [
  { title: "장면 하나 고르기", body: "지금 보고 싶은 분위기의 장면을 하나 고릅니다. 장면 사진은 선택 결과가 아니라 분위기를 이해하기 위한 예시입니다." },
  { title: "어울리는 세 곳 보기", body: "선택한 장면과 어울리는 강원 장소 세 곳을 보여줍니다. 필요하면 이동 방법과 오늘 조건을 적용하거나 한 곳씩 바꿀 수 있습니다." },
  { title: "비교하고 한 곳 선택하기", body: "사진에서 보이는 차이, 접근·이동, 중요 제한을 같은 순서로 비교합니다. 확인된 정보가 없는 항목은 비어 있음을 그대로 알려드립니다." },
  { title: "지도에서 보고 기기에 저장하기", body: "고른 장소를 지도에서 확인하거나 내 장면에 저장합니다. 저장한 장면은 로그인 없이 현재 기기에만 남습니다." },
] as const;

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  intro: { paddingTop: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },
  title: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 39, letterSpacing: -0.7 },
  introBody: { fontFamily: fonts.body, fontSize: 15, lineHeight: 24 },
  steps: { marginTop: spacing.sm },
  step: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, paddingVertical: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth },
  stepNumber: { width: 32, fontFamily: fonts.serif, fontSize: 23, lineHeight: 30, color: palette.forest },
  stepCopy: { flex: 1, gap: spacing.xs },
  stepTitle: { fontFamily: fonts.serif, fontSize: 19, lineHeight: 28 },
  stepBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 23 },
  note: { marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.xs },
  noteTitle: { fontFamily: fonts.semibold, fontSize: 14 },
  noteBody: { fontFamily: fonts.body, fontSize: 13, lineHeight: 21 },
});
