import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandIcon, type BrandIconName } from "@/src/components/BrandIcon";
import { Header } from "@/src/components/Header";
import { getEditorialSceneCover } from "@/src/data/sceneCoverEditorial";
import { fonts, palette, radius, spacing } from "@/src/theme/editorial";

const guideImages = ["sea-coast", "forest-garden-rest", "architecture-exhibit-landmark"].map((id) => getEditorialSceneCover(id)!);

export default function GuideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <Header title="이용 안내" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 100 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text accessibilityRole="header" lineBreakStrategyIOS="hangul-word" textBreakStrategy="balanced" android_hyphenationFrequency="none" style={styles.title}>장면 하나에서{`\n`}갈 곳 하나까지</Text>
          <Text style={styles.introBody}>분위기를 고르면 닮은 세 곳을 보여드려요. 차이를 비교한 뒤 지도에서 확인하거나 내 기기에 저장하세요.</Text>
        </View>

        <View accessibilityLabel="사용자가 제공한 실제 장소 사진을 참고해 만든 생성형 장면 예시 3개" style={styles.collage}>
          {guideImages.map((item, index) => (
            <Image key={item.picturedPlaceName} source={item.source} contentFit="cover" style={[styles.collageImage, index === 0 && styles.collageLarge]} accessible={false} importantForAccessibility="no-hide-descendants" />
          ))}
        </View>
        <Text style={styles.collageCaption}>생성형 장면 예시 · 사용자 제공 장소 사진 참고</Text>

        <View style={styles.steps}>
          {GUIDE_STEPS.map((step, index) => (
            <View key={step.title} style={[styles.step, index === GUIDE_STEPS.length - 1 && styles.lastStep]}>
              <View style={styles.stepMarker}><BrandIcon name={step.icon} size={20} color={palette.forest} /></View>
              <View style={styles.stepCopy}>
                <Text style={styles.stepEyebrow}>{String(index + 1).padStart(2, "0")}</Text>
                <Text accessibilityRole="header" lineBreakStrategyIOS="hangul-word" textBreakStrategy="balanced" android_hyphenationFrequency="none" style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepBody}>{step.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.note}>
          <BrandIcon name="info" size={20} color={palette.forestSoft} />
          <View style={styles.noteCopy}>
            <Text accessibilityRole="header" style={styles.noteTitle}>방문 전 확인</Text>
            <Text style={styles.noteBody}>사진과 이동 정보는 확인된 데이터만 표시합니다. 운영 여부와 출입 통제, 실제 경로는 공식 채널이나 지도 앱에서 다시 확인해 주세요.</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="장면 고르러 가기" onPress={() => router.replace("/")} style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
          <Text style={styles.ctaText}>장면 고르러 가기</Text>
          <BrandIcon name="arrow-right" size={20} color={palette.white} />
        </Pressable>
      </View>
    </View>
  );
}

const GUIDE_STEPS: ReadonlyArray<{ title: string; body: string; icon: BrandIconName }> = [
  { title: "장면 하나 고르기", body: "사진을 보며 지금 끌리는 분위기 하나를 고릅니다.", icon: "camera" },
  { title: "어울리는 세 곳 보기", body: "선택한 장면과 닮은 강원 장소 세 곳을 확인합니다.", icon: "location" },
  { title: "비교하고 선택하기", body: "사진에서 보이는 차이, 접근·이동, 중요 제한을 같은 순서로 비교합니다.", icon: "recommend" },
  { title: "지도·기기에 저장하기", body: "한 곳을 골라 지도에서 확인하고, 내 장면에 저장합니다.", icon: "bookmark" },
];

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ivory },
  scroll: { paddingHorizontal: spacing.lg },
  intro: { paddingTop: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },
  title: { fontFamily: fonts.serif, fontSize: 29, lineHeight: 40, letterSpacing: -0.8, color: palette.ink },
  introBody: { maxWidth: 334, fontFamily: fonts.body, fontSize: 15, lineHeight: 24, color: palette.muted },
  collage: { height: 168, flexDirection: "row", gap: 4, overflow: "hidden", borderRadius: radius.md, backgroundColor: palette.sage },
  collageImage: { flex: 1, height: "100%" },
  collageLarge: { flex: 1.55 },
  collageCaption: { marginTop: spacing.xs, fontFamily: fonts.body, fontSize: 11, lineHeight: 17, color: palette.muted },
  steps: { marginTop: spacing.sm },
  step: { minHeight: 120, flexDirection: "row", alignItems: "flex-start", gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line },
  lastStep: { borderBottomWidth: 0 },
  stepMarker: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: palette.sage },
  stepCopy: { flex: 1 },
  stepEyebrow: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 16, letterSpacing: 1.2, color: palette.forestSoft },
  stepTitle: { marginTop: 1, fontFamily: fonts.serif, fontSize: 19, lineHeight: 28, letterSpacing: -0.35, color: palette.ink },
  stepBody: { marginTop: spacing.xxs, fontFamily: fonts.body, fontSize: 14, lineHeight: 22, color: palette.muted },
  note: { marginTop: spacing.sm, flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, padding: spacing.md, borderRadius: radius.sm, backgroundColor: "#E9EDE5" },
  noteCopy: { flex: 1, gap: spacing.xxs },
  noteTitle: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: palette.ink },
  noteBody: { fontFamily: fonts.body, fontSize: 13, lineHeight: 21, color: palette.muted },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, backgroundColor: "rgba(246,242,233,.98)", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line },
  cta: { minHeight: 56, paddingHorizontal: spacing.lg, borderRadius: radius.sm, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: palette.forest },
  ctaText: { fontFamily: fonts.semibold, fontSize: 16, color: palette.white },
  pressed: { opacity: 0.88 },
});
