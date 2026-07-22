import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { fonts, palette } from "@/src/theme/editorial";

interface GoatLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "symbol" | "horizontal" | "badge" | "stacked";
  theme?: "dark" | "light";
}

function FramePinSymbol({ width, height }: { width: number; height: number }) {
  const scale = width / 100;
  const viewHeight = height / scale;

  return (
    <Svg width={width} height={height} viewBox={`0 0 100 ${viewHeight}`} accessibilityLabel="GOAT 여행 표식">
      <Rect x="3" y="3" width="94" height="80" rx="16" fill={palette.forest} />
      <Rect x="16" y="16" width="68" height="54" rx="9" fill={palette.ivory} />
      <Rect x="16" y="16" width="68" height="4" rx="2" fill={palette.coral} />
      <Circle cx="24" cy="30" r="3" fill={palette.forestSoft} />
      <Circle cx="76" cy="30" r="3" fill={palette.forestSoft} />
      <Path d="M50 83 L43 104 Q50 112 57 104 Z" fill={palette.forest} />
      <Circle cx="50" cy="106" r="5" fill={palette.coral} />
    </Svg>
  );
}

export function GoatLogo({ size = "md", variant = "badge", theme = "dark" }: GoatLogoProps) {
  const symbolSizes = { sm: 28, md: 40, lg: 56 };
  const wordSizes = { sm: 20, md: 28, lg: 38 };
  const symbolWidth = symbolSizes[size];
  const symbolHeight = Math.round(symbolWidth * 1.18);
  const isDark = theme === "dark";
  const wordColor = isDark ? palette.ivory : palette.forest;

  if (variant === "symbol") return <FramePinSymbol width={symbolWidth} height={symbolHeight} />;

  if (variant === "badge") {
    return (
      <View style={[styles.badge, isDark ? styles.badgeDark : styles.badgeLight]} accessibilityLabel="GOAT">
        <Text style={[styles.badgeText, { fontSize: wordSizes[size] }, { color: isDark ? palette.ivory : palette.forest }]}>GOAT</Text>
        <View style={styles.accentLine} />
      </View>
    );
  }

  const wordmark = (
    <View style={styles.wordmarkWrap}>
      <Text style={[styles.wordmark, { fontSize: wordSizes[size], color: wordColor }]}>GOAT</Text>
      <View style={styles.accentLine} />
    </View>
  );

  if (variant === "horizontal") {
    return <View style={styles.horizontal} accessibilityLabel="GOAT, 강원 여행 큐레이션"> <FramePinSymbol width={symbolWidth} height={symbolHeight} />{wordmark}</View>;
  }

  return (
    <View style={styles.stacked} accessibilityLabel="GOAT, 해외의 감성을 강원도에서">
      <FramePinSymbol width={symbolWidth} height={symbolHeight} />
      {wordmark}
      <Text style={[styles.tagline, { color: isDark ? palette.sage : palette.muted }]}>해외의 감성을, 강원도에서.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 4, alignItems: "center", gap: 4 },
  badgeDark: { backgroundColor: palette.forest },
  badgeLight: { backgroundColor: palette.ivory, borderWidth: StyleSheet.hairlineWidth, borderColor: palette.line },
  badgeText: { fontFamily: fonts.serif, letterSpacing: 3.5, lineHeight: 38 },
  horizontal: { flexDirection: "row", alignItems: "center", gap: 10 },
  stacked: { alignItems: "center", gap: 7 },
  wordmarkWrap: { alignItems: "flex-start", gap: 4 },
  wordmark: { fontFamily: fonts.serif, letterSpacing: 4, lineHeight: 46 },
  accentLine: { width: "76%", height: 2, backgroundColor: palette.coral, borderRadius: 1 },
  tagline: { fontSize: 11, fontFamily: fonts.body, letterSpacing: 0.2, marginTop: 1 },
});
