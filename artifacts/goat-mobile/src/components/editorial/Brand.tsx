import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { fonts, palette } from "@/src/theme/editorial";

export function GoatMark({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  const color = light ? palette.ivory : palette.forest;
  return (
    <View style={styles.row} accessibilityLabel="GOAT 강원 여행">
      <GangwonSymbol size={compact ? 28 : 35} color={color} />
      <View>
        <Text style={[styles.word, compact && styles.wordCompact, { color }]}>GOAT</Text>
        {!compact && <Text style={[styles.tagline, { color }]}>GANGWON OF ALL TIME</Text>}
      </View>
    </View>
  );
}

export function GangwonSymbol({ size = 42, color = palette.forest }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="강원도 실루엣">
    <Path d="M15 9 28 13l7-7 7 5 2 10 8 8-3 8 7 9-5 9-13-1-9 5-11-5-2-10-7-8 4-9-5-9Z" fill={color}/>
    <Path d="M12 36c11-7 22-4 38 5l-1 9-11-1-9 6-10-5-2-9Z" fill={lighten(color)}/>
    <Path d="m22 25 20-8-13 11m7-7-2 12" stroke={palette.ivory} strokeWidth="2.8" strokeLinecap="round"/>
    <Circle cx="43" cy="34" r="6" fill={palette.ivory}/><Path d="m43 30 1.2 2.5 2.8.4-2 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-2 2.8-.4Z" fill={color}/>
  </Svg>;
}

function lighten(color: string) { return color === palette.ivory ? "#DDE3DA" : "#35594F"; }

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  word: { fontFamily: fonts.serif, fontSize: 24, letterSpacing: 1.5, lineHeight: 27 },
  wordCompact: { fontSize: 21, lineHeight: 24 },
  tagline: { fontFamily: fonts.medium, fontSize: 5.5, letterSpacing: 0.65 },
});
