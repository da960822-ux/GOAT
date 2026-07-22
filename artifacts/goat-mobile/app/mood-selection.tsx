import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandIcon } from "@/src/components/BrandIcon";
import { GoatMark } from "@/src/components/editorial/Brand";
import { FlowProgress } from "@/src/components/editorial/UI";
import { useApp } from "@/src/context/AppContext";
import { editorialImages } from "@/src/data/editorialContent";
import { fonts, palette, radius } from "@/src/theme/editorial";

const moods = [
  { id: "sea-coast", name: "산토리니 감성", description: "흰 건물과 푸른 바다가 어울리는 청량한 장면", image: editorialImages.coast },
  { id: "japan-alley", name: "일본 소도시 감성", description: "조용한 골목과 작은 상점이 이어지는 장면", image: editorialImages.village },
  { id: "alps-ranch", name: "알프스 감성", description: "초록 고원과 산 능선이 펼쳐지는 탁 트인 장면", image: editorialImages.hills },
  { id: "forest-garden-rest", name: "북유럽 숲 감성", description: "차분한 숲과 호수가 어우러지는 자연친화적 장면", image: editorialImages.forest },
  { id: "retro-market-harbor", name: "항구 마을 감성", description: "빛바랜 간판과 바닷바람이 머무는 골목", image: editorialImages.harbor },
  { id: "architecture-exhibit-landmark", name: "건축과 전시", description: "선명한 구조와 조용한 영감이 있는 장소", image: editorialImages.garden },
  { id: "resort-cafe-exotic", name: "휴양지 카페", description: "야자수 그늘 아래 여유를 즐기는 풍경", image: editorialImages.beach },
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
      <View accessibilityRole="radiogroup" style={styles.cards}>{moods.map((item) => {
        const active = item.id === selected;
        return <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: active }} accessibilityLabel={`${item.name}. ${item.description}`} onPress={() => setSelected(item.id)} style={({ pressed }) => [styles.card, active && styles.cardActive, pressed && styles.pressed]}>
          <Image source={item.image} style={StyleSheet.absoluteFillObject} contentFit="cover" accessibilityLabel={`${item.name} 풍경`} />
          <View style={styles.scrim} />
          <View style={styles.cardCopy}><Text style={styles.cardName}>{item.name}</Text><Text style={styles.cardDescription}>{item.description}</Text></View>
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
  screen: { flex: 1, backgroundColor: palette.ivory }, header: { height: 74, paddingHorizontal: 22, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, headerSpace: { width: 44 }, back: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,252,246,.78)", borderWidth: StyleSheet.hairlineWidth, borderColor: palette.line, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 22, paddingTop: 20 }, kicker: { marginTop: 22, fontFamily: fonts.semibold, fontSize: 12, color: palette.forestSoft }, title: { marginTop: 10, fontFamily: fonts.serifRegular, fontSize: 32, lineHeight: 43, letterSpacing: -1.2, color: palette.ink }, description: { marginTop: 11, maxWidth: 320, fontFamily: fonts.body, fontSize: 14, lineHeight: 22, color: palette.muted },
  cards: { marginTop: 28, gap: 13 }, card: { height: 154, borderRadius: radius.md, overflow: "hidden", borderWidth: 2, borderColor: "transparent", justifyContent: "flex-end" }, cardActive: { borderColor: palette.forest }, scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(11,34,27,.42)" }, cardCopy: { padding: 17 }, cardName: { fontFamily: fonts.serif, fontSize: 23, letterSpacing: -0.7, color: palette.white }, cardDescription: { marginTop: 5, paddingRight: 44, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, color: "rgba(255,255,255,.91)" }, select: { position: "absolute", top: 15, right: 15, width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: palette.paper }, selectActive: { backgroundColor: palette.forest },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: "rgba(246,242,233,.98)", borderTopWidth: StyleSheet.hairlineWidth, borderColor: palette.line }, cta: { minHeight: 56, paddingHorizontal: 20, borderRadius: 13, backgroundColor: palette.forest, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, ctaText: { fontFamily: fonts.semibold, fontSize: 16, color: palette.white }, disabled: { backgroundColor: palette.sageDark }, pressed: { opacity: .86, transform: [{ scale: .99 }] },
});
