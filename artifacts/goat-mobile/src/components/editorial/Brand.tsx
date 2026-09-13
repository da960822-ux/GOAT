import React from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { palette } from "@/src/theme/editorial";

const symbol = require("@/assets/images/goat-symbol-cutout.png");
const wordmark = require("@/assets/images/goat-wordmark-cutout.png");

export function GoatMark({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <View accessible accessibilityRole="image" style={[styles.row, light && styles.light]} accessibilityLabel="GOAT, 강원도 모양 브랜드 로고">
      <Image source={symbol} style={[styles.symbol, compact && styles.symbolCompact]} contentFit="contain" accessible={false} importantForAccessibility="no-hide-descendants" />
      <Image source={wordmark} style={[styles.wordmark, compact && styles.wordmarkCompact]} contentFit="contain" accessible={false} importantForAccessibility="no-hide-descendants" />
    </View>
  );
}

export function GangwonSymbol({ size = 42, color = palette.forest }: { size?: number; color?: string }) {
  return <Image source={symbol} style={{ width: size, height: size, tintColor: color === palette.forest ? undefined : color }} contentFit="contain" accessible={false} importantForAccessibility="no-hide-descendants" />;
}

const styles = StyleSheet.create({
  row: { height: 42, flexDirection: "row", alignItems: "center", gap: 7 },
  light: { paddingHorizontal: 6, borderRadius: 6, backgroundColor: "rgba(246,242,233,.86)" },
  symbol: { width: 35, height: 39 },
  symbolCompact: { width: 28, height: 31 },
  wordmark: { width: 92, height: 39 },
  wordmarkCompact: { width: 78, height: 31 },
});
