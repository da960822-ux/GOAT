import { BrandIcon } from "@/src/components/BrandIcon";
import { GoatMark } from "@/src/components/editorial/Brand";
import { useApp } from "@/src/context/AppContext";
import { referenceCards, referenceFilters, type ReferenceFilter } from "@/src/data/referenceCards";
import { fonts, palette, radius } from "@/src/theme/editorial";
import type { ReferenceCardId } from "@workspace/travel-domain/catalog";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ReferenceSelectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedReferenceCardId, setSelectedReferenceCardId, setPendingAttempt } = useApp();
  const [filter, setFilter] = useState<ReferenceFilter | null>(null);
  const [selected, setSelected] = useState<ReferenceCardId | null>(selectedReferenceCardId);
  const cards = useMemo(() => filter ? referenceCards.filter((card) => card.category === filter) : referenceCards, [filter]);
  const selectedCard = referenceCards.find((card) => card.id === selected);

  const next = () => {
    if (!selected) return;
    setSelectedReferenceCardId(selected);
    setPendingAttempt(null);
    router.push("/travel-preference");
  };

  return <View style={[styles.screen, { paddingTop: insets.top }]}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="뒤로 가기" onPress={() => router.back()} style={styles.back}><BrandIcon name="chevron-back" size={22} color={palette.forest} /></Pressable>
      <GoatMark compact />
      <View style={styles.headerSpace} />
    </View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: 110 + insets.bottom }]}>
      <Text style={styles.kicker}>REFERENCE PLACE</Text>
      <Text style={styles.title}>마음이 머무는{`\n`}장면을 골라주세요</Text>
      <Text style={styles.description}>한 장면을 고르면 그 분위기와 닮은{`\n`}강원 여행지 세 곳을 찾아드려요.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} style={styles.filterScroll}>
        {referenceFilters.map((value) => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: filter === value }} onPress={() => setFilter(filter === value ? null : value)} style={[styles.filter, filter === value && styles.filterActive]}><Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{value}</Text></Pressable>)}
      </ScrollView>
      <View style={styles.listHead}><Text style={styles.listTitle}>장면 {cards.length}개</Text><Text style={styles.listHint}>{selectedCard ? "1개 선택됨" : "한 장면을 선택해주세요"}</Text></View>
      <View accessibilityRole="radiogroup" style={styles.grid}>{cards.map((card) => {
        const referenceCardId = card.id;
        const active = selected === referenceCardId;
        return <Pressable key={referenceCardId} accessibilityRole="radio" accessibilityState={{ checked: active }} accessibilityLabel={`${card.name}. ${card.category}`} onPress={() => setSelected(active ? null : referenceCardId)} style={[styles.card, active && styles.cardActive]}>
          <Image source={card.image} style={StyleSheet.absoluteFillObject} contentFit="cover" />
          <View style={styles.scrim} />
          <View style={[styles.select, active && styles.selectActive]}>{active && <BrandIcon name="check" size={15} color={palette.white} />}</View>
          <View style={styles.cardCopy}><Text numberOfLines={1} style={styles.cardTitle}>{card.name}</Text><Text numberOfLines={1} style={styles.cardSubtitle}>{card.region} · {card.category}</Text></View>
        </Pressable>;
      })}</View>
    </ScrollView>
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="선택한 장면으로 계속하기" accessibilityState={{ disabled: !selected }} disabled={!selected} onPress={next} style={[styles.cta, !selected && styles.disabled]}><Text style={styles.ctaText}>{selectedCard ? "이 장면과 닮은 곳 찾기" : "장면을 선택해주세요"}</Text><BrandIcon name="arrow-right" color={palette.white} /></Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.ivory },
  header: { height: 74, paddingHorizontal: 22, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, headerSpace: { width: 44 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: palette.paper, borderWidth: StyleSheet.hairlineWidth, borderColor: palette.line },
  content: { paddingHorizontal: 22, paddingTop: 20 }, kicker: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.7, color: palette.forestSoft },
  title: { marginTop: 12, fontFamily: fonts.serifRegular, fontSize: 31, lineHeight: 42, letterSpacing: -1.1, color: palette.ink }, description: { marginTop: 12, maxWidth: 330, fontFamily: fonts.body, fontSize: 14, lineHeight: 22, color: palette.muted },
  filterScroll: { marginTop: 24, marginHorizontal: -22 }, filters: { paddingHorizontal: 22, gap: 8 }, filter: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.line, backgroundColor: palette.paper }, filterActive: { borderColor: palette.forest, backgroundColor: palette.forest }, filterText: { fontFamily: fonts.medium, fontSize: 12, color: palette.forest }, filterTextActive: { color: palette.white },
  listHead: { marginTop: 27, marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, listTitle: { fontFamily: fonts.serif, fontSize: 18, color: palette.ink }, listHint: { fontFamily: fonts.medium, fontSize: 11, color: palette.muted },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 }, card: { width: "48.2%", height: 188, overflow: "hidden", borderRadius: radius.md, borderWidth: 2, borderColor: "transparent", backgroundColor: palette.sage }, cardActive: { borderColor: palette.forest }, scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(11,34,27,.28)" }, select: { position: "absolute", top: 10, right: 10, width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,.8)", backgroundColor: "rgba(246,242,233,.78)", alignItems: "center", justifyContent: "center" }, selectActive: { backgroundColor: palette.forest, borderColor: palette.forest }, cardCopy: { position: "absolute", left: 13, right: 12, bottom: 13 }, cardTitle: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 21, color: palette.white }, cardSubtitle: { marginTop: 4, fontFamily: fonts.body, fontSize: 10.5, lineHeight: 15, color: "rgba(255,255,255,.9)" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: "rgba(246,242,233,.98)", borderTopWidth: StyleSheet.hairlineWidth, borderColor: palette.line }, cta: { minHeight: 56, paddingHorizontal: 20, borderRadius: 13, backgroundColor: palette.forest, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, disabled: { backgroundColor: palette.sageDark }, ctaText: { fontFamily: fonts.semibold, fontSize: 16, color: palette.white },
});
