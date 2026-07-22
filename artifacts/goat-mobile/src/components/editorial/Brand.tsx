import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { fonts, palette } from "@/src/theme/editorial";

/**
 * A compact interpretation of the approved GOAT brand board: a location pin,
 * mountain ridge, and coast line. It is intentionally simple enough to remain
 * legible in a 26dp navigation lockup.
 */
export function GoatMark({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  const color = light ? palette.ivory : palette.forest;
  return (
    <View style={styles.row} accessibilityLabel="GOAT 강원 감성 여행">
      <GangwonSymbol size={compact ? 26 : 31} color={color} />
      <View>
        <Text style={[styles.word, compact && styles.wordCompact, { color }]}>GOAT</Text>
        {!compact && <Text style={[styles.tagline, { color }]}>GANGWON OF ALL TIME</Text>}
      </View>
    </View>
  );
}

export function GangwonSymbol({ size = 42, color = palette.forest }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityLabel="GOAT 위치 심볼">
      <Path d="M24 4C13.6 4 6 11.6 6 22c0 12.6 14.7 21.1 17 22.6a2 2 0 0 0 2 0C27.3 43.1 42 34.6 42 22 42 11.6 34.4 4 24 4Z" fill={color} />
      <Path d="m13 29 8.3-9.2a3.6 3.6 0 0 1 5.3 0l3.6 4 2.4-2.5 5.1 7.7H13Z" fill={palette.ivory} />
      <Path d="M13 32c4.2-2.4 7.5-2.4 11.3 0 3.8 2.4 7.1 2.4 10.7 0" fill="none" stroke={lighten(color)} strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
}

function lighten(color: string) {
  return color === palette.ivory ? "#DDE3DA" : "#9AB7A6";
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  word: { fontFamily: fonts.serif, fontSize: 25, letterSpacing: 1.15, lineHeight: 27 },
  wordCompact: { fontSize: 20, lineHeight: 23 },
  tagline: { marginTop: 1, fontFamily: fonts.medium, fontSize: 5.2, letterSpacing: 0.8 },
});
