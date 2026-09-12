import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { BrandIcon } from "@/src/components/BrandIcon";
import { fonts, palette, radius, spacing } from "@/src/theme/editorial";

export type ReplacementState = "available" | "loading" | "unavailable";

export type DecisionCardProps = {
  index: number;
  total: number;
  region: string;
  name: string;
  summary: string;
  features: readonly string[];
  imageUri?: string | null;
  criticalRestriction?: string | null;
  attribution?: string | null;
  replacementState?: ReplacementState;
  replacementHint?: string | null;
  replacementDisabled?: boolean;
  onDetails: () => void;
  onReplace?: () => void;
  onChoose: (trigger?: View | null) => void;
};

export function DecisionCard({ index, total, region, name, summary, features, imageUri, criticalRestriction, attribution, replacementState = "available", replacementHint, replacementDisabled = false, onDetails, onReplace, onChoose }: DecisionCardProps) {
  const chooseRef = useRef<View>(null);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [imageUri]);
  const replacementUnavailable = replacementState === "unavailable";
  return <View style={styles.card}>
    <View style={styles.hero}>
      {imageUri && !imageFailed ? <Image source={{ uri: imageUri }} contentFit="cover" style={styles.image} accessibilityLabel={`${name} 실제 풍경`} onError={() => setImageFailed(true)} /> : <View style={styles.fallback} accessibilityElementsHidden><BrandIcon name="location" size={38} color={palette.forestSoft} /></View>}
      <View style={styles.heroScrim} pointerEvents="none" />
      <Text style={styles.counter}>{index} / {total}</Text>
      <View style={styles.heroCopy}><Text style={styles.region}>{region}</Text><Text style={styles.name}>{name}</Text></View>
    </View>
    <View style={styles.content}>
      <Text style={styles.summary}>{summary}</Text>
      <View style={styles.features}>{features.slice(0, 2).map((feature) => <View key={feature} style={styles.feature}><BrandIcon name="check" size={15} color={palette.forest} /><Text style={styles.featureText}>{feature}</Text></View>)}</View>
      {criticalRestriction ? <View style={styles.restriction}><BrandIcon name="warning" size={18} color={palette.error} /><Text style={styles.restrictionText}>{criticalRestriction}</Text></View> : null}
      <Pressable ref={chooseRef} accessibilityRole="button" accessibilityLabel={`${name}로 결정하기`} onPress={() => onChoose(chooseRef.current)} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}><Text style={styles.primaryText}>여기로 갈래요</Text><BrandIcon name="arrow-right" size={18} color={palette.white} /></Pressable>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${name} 자세히 보기`} onPress={onDetails} style={({ pressed }) => [styles.detailButton, pressed && styles.pressed]}><Text style={styles.detailText}>자세히 보기</Text><BrandIcon name="arrow-right" size={17} color={palette.forest} /></Pressable>
        {replacementUnavailable ? <Text accessibilityLiveRegion="polite" style={styles.unavailable}>교체할 수 있는 곳이 없어요</Text> : <Pressable accessibilityRole="button" accessibilityLabel="다른 곳 보기" accessibilityState={{ busy: replacementState === "loading", disabled: replacementDisabled }} disabled={replacementState === "loading" || replacementDisabled || !onReplace} onPress={onReplace} style={({ pressed }) => [styles.replaceButton, (replacementState === "loading" || replacementDisabled || !onReplace) && styles.disabled, pressed && styles.pressed]}>{replacementState === "loading" ? <ActivityIndicator color={palette.forest} /> : <><BrandIcon name="refresh" size={17} color={palette.forest} /><Text style={styles.replaceText}>다른 곳 보기</Text></>}</Pressable>}
      </View>
      {replacementHint ? <Text style={styles.replacementHint}>{replacementHint}</Text> : null}
      {attribution ? <Text style={styles.attribution}>{attribution}</Text> : null}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  card: { overflow: "hidden", borderRadius: radius.lg, backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line },
  hero: { minHeight: 196, justifyContent: "flex-end", backgroundColor: palette.sage },
  image: { ...StyleSheet.absoluteFillObject },
  fallback: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: palette.sage },
  heroScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15, 48, 42, 0.32)" },
  counter: { position: "absolute", top: spacing.md, right: spacing.md, fontFamily: fonts.bold, fontSize: 12, color: palette.white, backgroundColor: "rgba(15, 48, 42, 0.72)", paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill, fontVariant: ["tabular-nums"] },
  heroCopy: { padding: spacing.lg, gap: spacing.xxs },
  region: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.2, color: palette.sage },
  name: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 36, color: palette.white },
  content: { gap: spacing.md, padding: spacing.lg },
  summary: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: palette.ink },
  features: { gap: spacing.xs },
  feature: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xs },
  featureText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, color: palette.forest },
  restriction: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xs, borderWidth: 1, borderColor: palette.errorBorder, borderRadius: radius.sm, backgroundColor: palette.errorSurface, padding: spacing.sm },
  restrictionText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, color: palette.error },
  attribution: { fontFamily: fonts.body, fontSize: 11, lineHeight: 16, color: palette.muted },
  replacementHint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: palette.muted },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  detailButton: { minHeight: 48, flexGrow: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: spacing.xs, borderWidth: 1, borderColor: palette.forest, borderRadius: radius.pill, paddingHorizontal: spacing.md },
  detailText: { fontFamily: fonts.semibold, fontSize: 14, color: palette.forest },
  replaceButton: { minHeight: 48, flexGrow: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: spacing.xs, borderRadius: radius.pill, backgroundColor: palette.sage, paddingHorizontal: spacing.md },
  replaceText: { fontFamily: fonts.semibold, fontSize: 14, color: palette.forest },
  unavailable: { flex: 1, alignSelf: "center", fontFamily: fonts.medium, fontSize: 13, lineHeight: 20, color: palette.error },
  primaryButton: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, borderRadius: radius.pill, backgroundColor: palette.forest, paddingHorizontal: spacing.md },
  primaryText: { fontFamily: fonts.semibold, fontSize: 16, color: palette.white },
  disabled: { opacity: 0.65 },
  pressed: { opacity: 0.82 },
});
