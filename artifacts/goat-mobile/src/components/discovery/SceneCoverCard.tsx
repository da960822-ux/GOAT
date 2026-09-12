import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { BrandIcon } from "@/src/components/BrandIcon";
import { fonts, palette, radius, spacing } from "@/src/theme/editorial";

export type SceneCoverCardProps = {
  number: number | string;
  title: string;
  description: string;
  picturedPlaceName: string;
  imageUri?: string | null;
  attribution?: string | null;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

export function SceneCoverCard({ number, title, description, picturedPlaceName, imageUri, attribution, selected = false, disabled = false, onPress }: SceneCoverCardProps) {
  const caption = `장면 예시 · ${picturedPlaceName}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${number}. ${title}. ${description}. ${caption}`}
      accessibilityHint="이 장면을 선택합니다"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.card, selected && styles.selected, disabled && styles.disabled, pressed && styles.pressed]}
    >
      {imageUri ? <Image source={{ uri: imageUri }} contentFit="cover" style={styles.image} accessibilityLabel="" /> : <View style={styles.fallback} accessibilityElementsHidden>
        <BrandIcon name="image" size={32} color={palette.forestSoft} />
        <Text style={styles.fallbackLabel}>장면을 상상해 보세요</Text>
      </View>}
      <View style={styles.scrim} pointerEvents="none" />
      <View style={styles.copy}>
        <Text style={styles.number}>{String(number).padStart(2, "0")}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <View style={styles.caption}>
        <Text style={styles.captionText}>{caption}</Text>
        {attribution ? <Text style={styles.attribution}>{attribution}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 248, overflow: "hidden", borderRadius: radius.lg, backgroundColor: palette.sage, borderWidth: 1, borderColor: palette.line },
  selected: { borderColor: palette.forest, borderWidth: 2 },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.58 },
  image: { ...StyleSheet.absoluteFillObject },
  fallback: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: spacing.xs, backgroundColor: palette.sage },
  fallbackLabel: { fontFamily: fonts.medium, fontSize: 14, color: palette.forestSoft },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15, 48, 42, 0.38)" },
  copy: { flex: 1, justifyContent: "flex-end", padding: spacing.lg, gap: spacing.xs },
  number: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.4, color: palette.sage },
  title: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 34, color: palette.white },
  description: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: palette.white },
  caption: { gap: spacing.xxs, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: "rgba(15, 48, 42, 0.78)" },
  captionText: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, color: palette.white },
  attribution: { fontFamily: fonts.body, fontSize: 11, lineHeight: 16, color: palette.sage },
});
