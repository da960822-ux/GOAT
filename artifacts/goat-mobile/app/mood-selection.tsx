import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandIcon } from "@/src/components/BrandIcon";
import { GoatMark } from "@/src/components/editorial/Brand";
import { FlowProgress } from "@/src/components/editorial/UI";
import { useApp } from "@/src/context/AppContext";
import { getEditorialSceneCover } from "@/src/data/sceneCoverEditorial";
import { fonts, palette, radius } from "@/src/theme/editorial";

const moods = [
  { id: "sea-coast", name: "푸른 해안 리조트", description: "흰 건물과 동해가 맞닿은 청량한 장면", cover: getEditorialSceneCover("sea-coast")! },
  { id: "japan-alley", name: "일본식 목조 스테이", description: "목재 외관과 작은 마당이 만드는 차분한 장면", cover: getEditorialSceneCover("japan-alley")! },
  { id: "alps-ranch", name: "설악 산악 마을", description: "설악 능선과 숲 사이 붉은 지붕이 펼쳐지는 장면", cover: getEditorialSceneCover("alps-ranch")! },
  { id: "forest-garden-rest", name: "숲과 미술관 정원", description: "숲과 물, 건축이 차분하게 이어지는 휴식 장면", cover: getEditorialSceneCover("forest-garden-rest")! },
  { id: "retro-market-harbor", name: "등대 언덕 마을", description: "등대 아래 오래된 집들이 층층이 이어지는 겨울 동네", cover: getEditorialSceneCover("retro-market-harbor")! },
  { id: "architecture-exhibit-landmark", name: "바다와 현대 건축", description: "동해와 낮은 건축선이 함께 펼쳐지는 장면", cover: getEditorialSceneCover("architecture-exhibit-landmark")! },
  { id: "resort-cafe-exotic", name: "물가 휴양 카페", description: "물가와 라탄 쉼터에서 여유를 즐기는 장면", cover: getEditorialSceneCover("resort-cafe-exotic")! },
] as const;

export default function MoodSelectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setSelectedMood, setPendingAttempt } = useApp();
  const [selected, setSelected] = useState<(typeof moods)[number]["id"] | null>(null);
  const mood = moods.find((item) => item.id === selected);

  const next = () => {
    if (!mood) return;
    setSelectedMood({ id: mood.id, name: mood.name, description: mood.description, keywords: [mood.name] });
    setPendingAttempt(null);
    router.push("/travel-preference");
  };

  return <View style={[styles.screen, { paddingTop: insets.top }]}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="뒤로 가기" onPress={() => router.back()} style={styles.back}><BrandIcon name="chevron-back" size={22} color={palette.forest} /></Pressable>
      <GoatMark />
      <View style={styles.headerSpace} />
    </View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: 100 + insets.bottom }]}>
      <FlowProgress currentStep={1} />
      <Text style={styles.kicker}>7가지 여행 분위기</Text>
      <Text style={styles.title}>어떤 감성으로{`\n`}떠나고 싶으세요?</Text>
      <Text style={styles.description}>마음에 드는 장면 하나를 고르면, 그 분위기와 닮은 강원 여행지를 찾아드릴게요.</Text>
      <Text style={styles.sourceNote}>테마 이미지는 표시된 국내 장소 사진을 바탕으로 재구성했습니다.</Text>
      <View accessibilityRole="radiogroup" style={styles.cards}>{moods.map((item) => {
        const active = item.id === selected;
        return <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: active }} accessibilityLabel={`${item.name}. ${item.description}. 사진은 ${item.cover.picturedPlaceName}. ${item.cover.attribution}`} onPress={() => setSelected(item.id)} style={({ pressed }) => [styles.card, active && styles.cardActive, pressed && styles.pressed]}>
          <Image source={item.cover.source} style={StyleSheet.absoluteFillObject} contentFit="cover" cachePolicy="memory-disk" accessible={false} importantForAccessibility="no-hide-descendants" />
          <LinearGradient colors={["rgba(8,25,21,.06)", "rgba(8,25,21,.82)"]} locations={[.25, 1]} style={styles.scrim} pointerEvents="none" />
          <View style={styles.cardCopy}><Text style={styles.cardName}>{item.name}</Text><Text style={styles.cardDescription}>{item.description}</Text><Text numberOfLines={1} style={styles.cardPlace}>영감 장소 · {item.cover.picturedPlaceName}</Text></View>
          <View style={[styles.select, active && styles.selectActive]}><BrandIcon name={active ? "check" : "arrow-right"} size={active ? 17 : 18} color={active ? palette.white : palette.forest} /></View>
        </Pressable>;
      })}</View>
    </ScrollView>
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: !mood }} disabled={!mood} onPress={next} style={({ pressed }) => [styles.cta, !mood && styles.disabled, pressed && styles.pressed]}><BrandIcon name="mood" color={palette.white} /><Text style={styles.ctaText}>{mood ? "이 감성으로 계속하기" : "감성을 선택해주세요"}</Text><BrandIcon name="arrow-right" color={palette.white} /></Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.ivory }, header: { height: 74, paddingHorizontal: 22, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, headerSpace: { width: 48 }, back: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,252,246,.78)", borderWidth: StyleSheet.hairlineWidth, borderColor: palette.line, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 22, paddingTop: 20 }, kicker: { marginTop: 22, fontFamily: fonts.semibold, fontSize: 12, color: palette.forestSoft }, title: { marginTop: 10, fontFamily: fonts.serifRegular, fontSize: 32, lineHeight: 43, letterSpacing: -1.2, color: palette.ink }, description: { marginTop: 11, maxWidth: 320, fontFamily: fonts.body, fontSize: 14, lineHeight: 22, color: palette.muted }, sourceNote: { marginTop: 7, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: palette.forestSoft },
  cards: { marginTop: 24, gap: 13 }, card: { minHeight: 172, borderRadius: radius.md, overflow: "hidden", borderWidth: 2, borderColor: "transparent", justifyContent: "flex-end" }, cardActive: { borderColor: palette.forest }, scrim: { ...StyleSheet.absoluteFillObject }, cardCopy: { minHeight: 172, justifyContent: "flex-end", padding: 17 }, cardName: { paddingRight: 54, fontFamily: fonts.serif, fontSize: 23, lineHeight: 31, letterSpacing: -0.7, color: palette.white }, cardDescription: { marginTop: 4, paddingRight: 44, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: palette.white }, cardPlace: { marginTop: 7, paddingRight: 42, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17, color: palette.white }, select: { position: "absolute", top: 15, right: 15, width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: palette.paper }, selectActive: { backgroundColor: palette.forest },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: "rgba(246,242,233,.98)", borderTopWidth: StyleSheet.hairlineWidth, borderColor: palette.line }, cta: { minHeight: 56, paddingHorizontal: 20, borderRadius: 13, backgroundColor: palette.forest, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, ctaText: { fontFamily: fonts.semibold, fontSize: 16, color: palette.white }, disabled: { backgroundColor: palette.sageDark }, pressed: { opacity: .86, transform: [{ scale: .99 }] },
});
