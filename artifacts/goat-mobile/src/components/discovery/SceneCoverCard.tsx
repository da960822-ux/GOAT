import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image, type ImageSource } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { BrandIcon } from "@/src/components/BrandIcon";
import { fonts, palette, radius, spacing } from "@/src/theme/editorial";

export type SceneCoverCardProps = {
  number: number | string;
  title: string;
  description: string;
  picturedPlaceName: string;
  imageUri?: string | null;
  imageSource?: ImageSource | number | null;
  imageCachePolicy?: "none" | "memory-disk";
  attribution?: string | null;
  selected?: boolean;
  featured?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

export function SceneCoverCard({ number, title, description, picturedPlaceName, imageUri, imageSource, imageCachePolicy = "none", attribution, selected = false, featured = false, disabled = false, onPress }: SceneCoverCardProps) {
  const caption = picturedPlaceName;
  const source = imageSource ?? (imageUri ? { uri: imageUri } : null);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${number}. ${title}. ${description}. ${caption}${attribution ? `. ${attribution}` : ""}`}
      accessibilityHint="이 장면을 선택합니다"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.card, featured && styles.featured, selected && styles.selected, disabled && styles.disabled, pressed && styles.pressed]}
    >
      {source ? <Image source={source} contentFit="cover" cachePolicy={imageCachePolicy} style={styles.image} accessible={false} importantForAccessibility="no-hide-descendants" /> : <View style={styles.fallback} accessible={false} importantForAccessibility="no-hide-descendants">
        <BrandIcon name="image" size={32} color={palette.forestSoft} />
        <Text style={styles.fallbackLabel}>장면을 상상해 보세요</Text>
      </View>}
      <LinearGradient colors={["rgba(8,25,21,.04)", "rgba(8,25,21,.34)", "rgba(8,25,21,.84)"]} locations={[0, .5, 1]} style={styles.scrim} pointerEvents="none" />
      <View style={styles.copy} accessible={false} importantForAccessibility="no-hide-descendants">
        <Text style={styles.number}>{String(number).padStart(2, "0")}</Text>
        <Text lineBreakStrategyIOS="hangul-word" textBreakStrategy="balanced" android_hyphenationFrequency="none" style={[styles.title, featured && styles.featuredTitle]}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <View style={styles.caption} accessible={false} importantForAccessibility="no-hide-descendants">
        <View style={styles.captionRow}><Text numberOfLines={1} style={styles.captionText}>{caption}</Text><View style={styles.chooseCue}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.9} style={styles.chooseText}>이 장면 선택하기</Text><BrandIcon name="arrow-right" size={15} color={palette.white} /></View></View>
        {attribution ? <Text style={styles.attribution}>{attribution}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 276, overflow: "hidden", borderRadius: radius.lg, backgroundColor: palette.sage, borderWidth: 1, borderColor: palette.line },
  featured: { minHeight: 356, borderRadius: 24 },
  selected: { borderColor: palette.forest, borderWidth: 2 },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.58 },
  image: { ...StyleSheet.absoluteFillObject },
  fallback: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: spacing.xs, backgroundColor: palette.sage },
  fallbackLabel: { fontFamily: fonts.medium, fontSize: 14, color: palette.forestSoft },
  scrim: { ...StyleSheet.absoluteFillObject },
  copy: { flex: 1, justifyContent: "flex-end", padding: spacing.lg, gap: spacing.xs },
  number: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.4, color: palette.sage },
  title: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 37, letterSpacing: -0.5, color: palette.white },
  featuredTitle: { fontSize: 32, lineHeight: 42 },
  description: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: palette.white },
  caption: { gap: spacing.xxs, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: "rgba(15, 48, 42, 0.92)" },
  captionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  captionText: { flex: 1, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 19, color: palette.white },
  chooseCue: { flexShrink: 0, flexDirection: "row", alignItems: "center", gap: spacing.xxs },
  chooseText: { fontFamily: fonts.semibold, fontSize: 11, color: palette.white },
  attribution: { fontFamily: fonts.body, fontSize: 11, lineHeight: 16, color: palette.sage },
});
