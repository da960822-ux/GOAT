import { usePathname, useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandIcon, type BrandIconName } from "@/src/components/BrandIcon";
import { fonts, palette } from "@/src/theme/editorial";

const tabs: Array<{ label: string; icon: BrandIconName; href: string }> = [
  { label: "홈", icon: "home", href: "/" },
  { label: "추천", icon: "recommend", href: "/recommendations" },
  { label: "지도", icon: "location", href: "/map" },
  { label: "저장", icon: "bookmark", href: "/saved" },
  { label: "마이", icon: "user", href: "/profile" },
];

export function AppTabBar() {
  const router = useRouter(); const pathname = usePathname(); const insets = useSafeAreaInsets();
  return <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>{tabs.map((tab) => {
    const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
    return <Pressable key={tab.href} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={tab.label} onPress={() => router.replace(tab.href as never)} style={styles.item}>
      <BrandIcon name={tab.icon} size={22} color={active ? palette.forest : palette.muted} filled={active}/>
      <Text style={[styles.label, active && styles.active]}>{tab.label}</Text>
    </Pressable>;
  })}</View>;
}
const styles = StyleSheet.create({
  bar: { position: "absolute", left: 10, right: 10, bottom: 0, minHeight: 72, paddingTop: 10, flexDirection: "row", backgroundColor: palette.paper, borderTopLeftRadius: 18, borderTopRightRadius: 18, shadowColor: palette.forestDeep, shadowOpacity: .08, shadowRadius: 8, shadowOffset: { width: 0, height: -3 }, elevation: 7 },
  item: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", gap: 3 },
  label: { fontFamily: fonts.medium, fontSize: 10, color: palette.muted },
  active: { fontFamily: fonts.bold, color: palette.forest },
});
