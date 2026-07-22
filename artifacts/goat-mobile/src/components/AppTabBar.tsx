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
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Pressable
            key={tab.href}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
            hitSlop={6}
            onPress={() => router.replace(tab.href as never)}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <View style={[styles.iconWell, active && styles.iconWellActive]}>
              <BrandIcon name={tab.icon} size={20} color={active ? palette.ivory : palette.muted} filled={active} />
            </View>
            <Text style={[styles.label, active && styles.active]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 76, paddingTop: 9,
    flexDirection: "row", backgroundColor: palette.paper, borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line, shadowColor: palette.forestDeep, shadowOpacity: 0.1,
    shadowRadius: 14, shadowOffset: { width: 0, height: -4 }, elevation: 8,
  },
  item: { flex: 1, minHeight: 50, alignItems: "center", justifyContent: "center", gap: 3, borderRadius: 12 },
  pressed: { opacity: 0.72 },
  iconWell: { width: 32, height: 27, alignItems: "center", justifyContent: "center", borderRadius: 14 },
  iconWellActive: { backgroundColor: palette.forest },
  label: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 14, color: palette.muted, letterSpacing: -0.2 },
  active: { fontFamily: fonts.semibold, color: palette.forest },
});
