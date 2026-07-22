import { BrandIcon, type BrandIconName } from "@/src/components/BrandIcon";
import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { GoatMark } from "./Brand";
import { fonts, palette, radius } from "@/src/theme/editorial";

export function ScreenHeader({ title, transparent = false, light = false, right }: { title?: string; transparent?: boolean; light?: boolean; right?: React.ReactNode }) {
  const router = useRouter();
  return (
    <View style={[styles.header, transparent && styles.headerTransparent]}>
      {title ? (
        <Pressable accessibilityRole="button" accessibilityLabel="뒤로 가기" hitSlop={8} style={[styles.circle, light && styles.circleLight]} onPress={() => router.back()}>
          <BrandIcon name="chevron-back" size={21} color={light ? palette.white : palette.forest} />
        </Pressable>
      ) : <GoatMark compact light={light} />}
      {title ? <Text numberOfLines={1} style={[styles.headerTitle, light && { color: palette.white }]}>{title}</Text> : <View />}
      <View style={styles.right}>{right}</View>
    </View>
  );
}

export function PrimaryButton({ label, onPress, icon, disabled, loading, variant = "forest", style }: { label: string; onPress: () => void; icon?: BrandIconName; disabled?: boolean; loading?: boolean; variant?: "forest" | "outline" | "paper"; style?: ViewStyle }) {
  const outline = variant === "outline";
  const paper = variant === "paper";
  const color = outline ? palette.forest : paper ? palette.forest : palette.white;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }} disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.button, outline && styles.outlineButton, paper && styles.paperButton, (disabled || loading) && styles.disabled, pressed && styles.pressed, style]}>
      {loading ? <ActivityIndicator color={color} /> : <>
        {icon && <BrandIcon name={icon} size={19} color={color} />}
        <Text style={[styles.buttonLabel, { color }]}>{label}</Text>
      </>}
    </Pressable>
  );
}

export function SectionEyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <Text style={[styles.eyebrow, light && { color: palette.sage }]}>{children}</Text>;
}

const FLOW_STEPS = ["감성 선택", "여행 조건", "추천 완성"];

export function FlowProgress({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return <View accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: 3, now: currentStep }} accessibilityLabel={`여행 추천 ${currentStep}단계`} style={styles.progress}>
    {FLOW_STEPS.map((label, index) => {
      const step = index + 1;
      const complete = step < currentStep;
      const active = step === currentStep;
      return <React.Fragment key={label}>
        <View style={styles.progressItem}>
          <View style={[styles.progressDot, (complete || active) && styles.progressDotActive]}>
            {complete ? <BrandIcon name="check" size={12} color={palette.white} /> : <Text style={[styles.progressNumber, active && styles.progressNumberActive]}>{step}</Text>}
          </View>
          <Text style={[styles.progressLabel, active && styles.progressLabelActive]}>{label}</Text>
        </View>
        {step < FLOW_STEPS.length && <View style={[styles.progressLine, complete && styles.progressLineActive]} />}
      </React.Fragment>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  header: { height: 60, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: palette.ivory, zIndex: 5 },
  headerTransparent: { backgroundColor: "transparent" },
  circle: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line },
  circleLight: { backgroundColor: "rgba(19,48,42,.45)", borderColor: "rgba(255,255,255,.28)" },
  headerTitle: { position: "absolute", left: 72, right: 72, textAlign: "center", fontFamily: fonts.semibold, fontSize: 16, color: palette.ink },
  right: { width: 44, alignItems: "flex-end" },
  button: { minHeight: 56, borderRadius: radius.pill, paddingHorizontal: 22, flexDirection: "row", gap: 9, alignItems: "center", justifyContent: "center", backgroundColor: palette.forest },
  outlineButton: { backgroundColor: "transparent", borderColor: palette.forest, borderWidth: 1.25 },
  paperButton: { backgroundColor: palette.paper },
  disabled: { backgroundColor: palette.sageDark, opacity: 1 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  buttonLabel: { fontFamily: fonts.semibold, fontSize: 16, letterSpacing: -0.2 },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.6, color: palette.forestSoft, textTransform: "uppercase" },
  progress: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 4 },
  progressItem: { alignItems: "center", minWidth: 54 },
  progressDot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.line, backgroundColor: palette.paper },
  progressDotActive: { borderColor: palette.forest, backgroundColor: palette.forest },
  progressNumber: { fontFamily: fonts.bold, fontSize: 11, color: palette.muted },
  progressNumberActive: { color: palette.white },
  progressLabel: { marginTop: 6, fontFamily: fonts.medium, fontSize: 10, color: palette.muted },
  progressLabelActive: { color: palette.forest, fontFamily: fonts.semibold },
  progressLine: { flex: 1, height: 1, marginTop: 12, backgroundColor: palette.line },
  progressLineActive: { backgroundColor: palette.forest },
});
