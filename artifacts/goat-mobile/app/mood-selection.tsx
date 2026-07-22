import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandIcon } from "@/src/components/BrandIcon";
import { PrimaryButton, ScreenHeader, SectionEyebrow } from "@/src/components/editorial/UI";
import { useApp } from "@/src/context/AppContext";
import { editorialImages } from "@/src/data/editorialContent";
import { fonts, palette, radius } from "@/src/theme/editorial";

const moods = [
  { id: "sea-coast", name: "산토리니 감성", description: "흰 건물과 푸른 바다가 어우러진 청량한 장면", image: editorialImages.coast },
  { id: "japan-alley", name: "일본 소도시 감성", description: "조용한 골목과 작은 상점이 이어지는 장면", image: editorialImages.village },
  { id: "alps-ranch", name: "알프스 감성", description: "초록 고원과 산 능선이 펼쳐지는 탁 트인 장면", image: editorialImages.hills },
  { id: "forest-garden-rest", name: "북유럽 숲 감성", description: "차분한 숲과 호수가 어우러지는 자연친화적 장면", image: editorialImages.forest },
  { id: "retro-market-harbor", name: "항구 마을 감성", description: "빛바랜 간판과 바닷바람이 머무는 골목", image: editorialImages.harbor },
  { id: "architecture-exhibit-landmark", name: "건축과 전시", description: "선명한 구조와 조용한 영감이 있는 장소", image: editorialImages.garden },
  { id: "resort-cafe-exotic", name: "휴양지 카페", description: "느긋한 햇살 아래 잠시 쉬어 가는 풍경", image: editorialImages.beach },
] as const;

export default function MoodSelectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setSelectedMood, setPendingAttempt } = useApp();
  const [selected, setSelected] = useState<(typeof moods)[number]["id"] | null>(null);
  const next = () => {
    const mood = moods.find((item) => item.id === selected);
    if (!mood) return;
    setSelectedMood({ id: mood.id, name: mood.name, description: mood.description, keywords: [mood.name] });
    setPendingAttempt(null);
    router.push("/travel-preference");
  };
  return <View style={[styles.screen, { paddingTop: insets.top }]}>
    <ScreenHeader title="감성 선택" />
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 106 + insets.bottom }]} showsVerticalScrollIndicator={false}>
      <SectionEyebrow>FIND YOUR MOOD</SectionEyebrow>
      <Text style={styles.title}>어떤 감성으로{`\n`}떠나고 싶으세요?</Text>
      <Text style={styles.description}>마음에 남은 장면 하나를 고르면, 닮은 강원 여행지를 찾아드릴게요.</Text>
      <View accessibilityRole="radiogroup" style={styles.cards}>{moods.map((mood) => {
        const active = selected === mood.id;
        return <Pressable key={mood.id} accessibilityRole="radio" accessibilityState={{ checked: active }} accessibilityLabel={`${mood.name}. ${mood.description}`} onPress={() => setSelected(mood.id)} style={({ pressed }) => [styles.card, active && styles.cardActive, pressed && styles.pressed]}>
          <Image source={mood.image} style={styles.cardImage} contentFit="cover" accessibilityLabel={`${mood.name} 풍경`} />
          <View style={styles.scrim} />
          <View style={styles.cardCopy}><Text style={styles.cardName}>{mood.name}</Text><Text style={styles.cardDescription}>{mood.description}</Text></View>
          <View style={[styles.select, active && styles.selectActive]}>{active ? <BrandIcon name="check" size={17} color={palette.forest} /> : <BrandIcon name="arrow-right" size={18} color={palette.forest} />}</View>
        </Pressable>;
      })}</View>
    </ScrollView>
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}><PrimaryButton label="이 감성으로 계속하기" icon="arrow-right" disabled={!selected} onPress={next} /></View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.ivory }, content: { paddingHorizontal: 22, paddingTop: 24 }, title: { marginTop: 11, fontFamily: fonts.serif, fontSize: 31, lineHeight: 42, letterSpacing: -1.4, color: palette.ink }, description: { marginTop: 11, maxWidth: 310, fontFamily: fonts.body, fontSize: 14, lineHeight: 22, color: palette.muted }, cards: { marginTop: 27, gap: 13 }, card: { height: 158, borderRadius: radius.lg, overflow: "hidden", borderWidth: 2, borderColor: "transparent", justifyContent: "flex-end" }, cardActive: { borderColor: palette.forest }, cardImage: { ...StyleSheet.absoluteFillObject }, scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(12, 29, 23, .42)" }, cardCopy: { padding: 18 }, cardName: { color: palette.white, fontFamily: fonts.serif, fontSize: 23, letterSpacing: -0.7 }, cardDescription: { marginTop: 5, color: "rgba(255,255,255,.9)", fontFamily: fonts.body, fontSize: 13, lineHeight: 19 }, select: { position: "absolute", right: 16, top: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,.94)", alignItems: "center", justifyContent: "center" }, selectActive: { backgroundColor: palette.ivory }, pressed: { opacity: .88, transform: [{ scale: .985 }] }, footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 12, backgroundColor: "rgba(246,242,233,.98)", borderTopWidth: StyleSheet.hairlineWidth, borderColor: palette.line },
});
