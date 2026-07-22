import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ReferenceCardId } from "@workspace/travel-domain/catalog";
import { BrandIcon } from "@/src/components/BrandIcon";
import { useApp } from "@/src/context/AppContext";
import { referenceCards, referenceFilters, type ReferenceFilter } from "@/src/data/referenceCards";
import { fonts, palette } from "@/src/theme/editorial";

export default function ReferenceSelectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedReferenceCardId, setSelectedReferenceCardId, setPendingAttempt } = useApp();
  const [filter, setFilter] = useState<ReferenceFilter | null>(null);
  const [selected, setSelected] = useState<ReferenceCardId | null>(selectedReferenceCardId);
  const cards = useMemo(
    () => filter ? referenceCards.filter((card) => card.category === filter) : referenceCards,
    [filter],
  );

  const continueToConditions = () => {
    if (!selected) return;
    setSelectedReferenceCardId(selected);
    setPendingAttempt(null);
    router.push("/travel-preference" as never);
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <Pressable accessibilityLabel="뒤로 가기" onPress={() => router.back()} style={styles.back}>
          <BrandIcon name="arrow-left" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>닮은 여행지 찾기</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 105 + insets.bottom }}>
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>REFERENCE PLACE</Text>
          <Text style={styles.title}>마음이 머무는 장면을{`\n`}골라주세요</Text>
          <Text style={styles.body}>한 장면을 고르면 그 분위기와 닮은{`\n`}강원 여행지 세 곳을 찾아드려요.</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {referenceFilters.map((value) => {
            const active = filter === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setFilter(active ? null : value)}
                style={[styles.filter, active && styles.filterActive]}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{value}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.countRow}>
          <Text style={styles.count}>장면 {cards.length}개</Text>
          <Text style={styles.choice}>{selected ? "1개 선택됨" : "한 장면을 선택해주세요"}</Text>
        </View>
        <View accessibilityRole="radiogroup" style={styles.grid}>
          {cards.map((card) => {
            const active = selected === card.id;
            return (
              <Pressable
                key={card.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={`${card.name}, ${card.category}`}
                onPress={() => setSelected(active ? null : card.id)}
                style={({ pressed }) => [styles.card, active && styles.cardActive, pressed && styles.pressed]}
              >
                <Image source={card.image} style={StyleSheet.absoluteFillObject} contentFit="cover" accessibilityLabel={`${card.name} 풍경`} />
                <View style={styles.shade} />
                <View style={[styles.check, active && styles.checkActive]}>
                  {active && <BrandIcon name="check" size={14} color={palette.forest} />}
                </View>
                <View style={styles.cardCopy}>
                  <Text numberOfLines={1} style={styles.cardName}>{card.name}</Text>
                  <Text style={styles.cardRegion}>{card.region} · {card.category}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 15) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !selected }}
          disabled={!selected}
          onPress={continueToConditions}
          style={({ pressed }) => [styles.cta, !selected && styles.ctaDisabled, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>{selected ? "이 장면과 닮은 여행지 찾기" : "장면을 선택해주세요"}</Text>
          <BrandIcon name="arrow-right" color={palette.white} size={20} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.ivory },
  header: { height: 92, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { width: 46, height: 46, borderRadius: 23, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(255,255,255,.52)", borderWidth: StyleSheet.hairlineWidth, borderColor: palette.line },
  headerTitle: { fontFamily: fonts.semibold, fontSize: 16, color: palette.ink },
  headerSpacer: { width: 46 },
  intro: { paddingHorizontal: 24, paddingTop: 15, paddingBottom: 25 },
  eyebrow: { fontFamily: fonts.semibold, letterSpacing: 1.7, fontSize: 10, color: palette.forestSoft },
  title: { marginTop: 10, fontFamily: fonts.serifRegular, fontSize: 29, lineHeight: 40, letterSpacing: -1.25, color: palette.ink },
  body: { marginTop: 13, fontFamily: fonts.body, fontSize: 13, lineHeight: 21, color: palette.muted },
  filterRow: { gap: 8, paddingHorizontal: 22, paddingBottom: 20 },
  filter: { minHeight: 44, paddingHorizontal: 15, justifyContent: "center", borderRadius: 22, backgroundColor: "#FFFCF6", borderColor: palette.line, borderWidth: StyleSheet.hairlineWidth },
  filterActive: { backgroundColor: palette.forest, borderColor: palette.forest },
  filterText: { fontFamily: fonts.medium, fontSize: 12, color: palette.muted },
  filterTextActive: { color: palette.white },
  countRow: { paddingHorizontal: 24, marginBottom: 12, flexDirection: "row", justifyContent: "space-between" },
  count: { fontFamily: fonts.semibold, fontSize: 13, color: palette.ink },
  choice: { fontFamily: fonts.body, fontSize: 12, color: palette.muted },
  grid: { paddingHorizontal: 18, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: { width: "48.5%", aspectRatio: .91, overflow: "hidden", borderRadius: 12, backgroundColor: palette.sage, borderWidth: 2, borderColor: "transparent" },
  cardActive: { borderColor: palette.forest },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(12,35,29,.24)" },
  check: { position: "absolute", top: 9, right: 9, width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,.88)", borderColor: "rgba(255,255,255,.9)", borderWidth: 1, justifyContent: "center", alignItems: "center" },
  checkActive: { backgroundColor: palette.white },
  cardCopy: { position: "absolute", left: 11, right: 10, bottom: 10 },
  cardName: { fontFamily: fonts.semibold, fontSize: 14, color: palette.white, textShadowColor: "rgba(0,0,0,.25)", textShadowRadius: 4 },
  cardRegion: { marginTop: 3, fontFamily: fonts.medium, fontSize: 10.5, color: "rgba(255,255,255,.88)" },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: "rgba(246,242,233,.96)", borderTopWidth: StyleSheet.hairlineWidth, borderColor: "rgba(217,217,207,.75)" },
  cta: { height: 55, paddingHorizontal: 20, borderRadius: 12, backgroundColor: palette.forest, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ctaDisabled: { opacity: .48 },
  ctaText: { fontFamily: fonts.semibold, fontSize: 15, color: palette.white },
  pressed: { opacity: .86, transform: [{ scale: .99 }] },
});
