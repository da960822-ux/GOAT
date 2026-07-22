import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Mood } from "@workspace/api-client-react";
import { BrandIcon, type BrandIconName } from "@/src/components/BrandIcon";
import { fonts, palette } from "@/src/theme/editorial";

const themeByMood: Record<string, { icon: BrandIconName; accent: string; surface: string }> = {
  "sea-coast": { icon: "map", accent: "#38678A", surface: "#E7F0F2" },
  "japan-alley": { icon: "home", accent: "#8B6040", surface: "#F6EDE1" },
  "alps-ranch": { icon: "course", accent: "#527545", surface: "#EAF1E5" },
  "forest-garden-rest": { icon: "leaf", accent: "#3F7463", surface: "#E4F0EA" },
  "retro-market-harbor": { icon: "location", accent: "#705F82", surface: "#EEEAF3" },
  "architecture-exhibit-landmark": { icon: "image", accent: "#5C6970", surface: "#EDF0F0" },
  "resort-cafe-exotic": { icon: "sun", accent: "#9A7140", surface: "#F9F0DB" },
};
const fallback = { icon: "mood" as BrandIconName, accent: palette.forest, surface: palette.sage };
export function MoodCategoryCard({ mood, selected, onPress }: { mood: Mood; selected: boolean; onPress: () => void }) {
  const theme = themeByMood[mood.id] ?? fallback;
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={`${mood.name}. ${mood.description}`} onPress={onPress} style={({ pressed }) => [styles.card, { backgroundColor: selected ? theme.accent : theme.surface, borderColor: selected ? theme.accent : "transparent" }, pressed && styles.pressed]}><View style={styles.top}><View style={[styles.icon, { backgroundColor: selected ? "rgba(255,255,255,.18)" : "rgba(255,255,255,.62)" }]}><BrandIcon name={theme.icon} size={21} color={selected ? palette.white : theme.accent} /></View>{selected && <View style={styles.check}><BrandIcon name="check" size={15} color={theme.accent} /></View>}</View><Text style={[styles.name, selected && styles.light]}>{mood.name}</Text><Text numberOfLines={2} style={[styles.description, selected && styles.lightMuted]}>{mood.description}</Text><View style={styles.keywords}>{mood.keywords.slice(0, 3).map((keyword) => <Text key={keyword} style={[styles.keyword, { color: selected ? "rgba(255,255,255,.9)" : theme.accent }]}>{`#${keyword}`}</Text>)}</View></Pressable>;
}
const styles = StyleSheet.create({ card: { minHeight: 178, borderRadius: 20, borderWidth: 2, padding: 18 }, top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, icon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" }, check: { width: 30, height: 30, borderRadius: 15, backgroundColor: palette.ivory, alignItems: "center", justifyContent: "center" }, name: { marginTop: 18, fontFamily: fonts.serif, fontSize: 21, color: palette.ink }, description: { marginTop: 6, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: palette.muted }, keywords: { marginTop: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }, keyword: { fontFamily: fonts.medium, fontSize: 12 }, light: { color: palette.white }, lightMuted: { color: "rgba(255,255,255,.84)" }, pressed: { opacity: .88, transform: [{ scale: .985 }] } });
