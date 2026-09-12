import React, { type ReactNode } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { BrandIcon } from "@/src/components/BrandIcon";
import { fonts, palette, radius, spacing } from "@/src/theme/editorial";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type DecisionSheetProps = {
  visible: boolean;
  selectedPlace: { region: string; name: string };
  criticalRestriction?: string | null;
  saveStatus?: "idle" | "loading" | "saved" | "error";
  saveError?: string | null;
  children?: ReactNode;
  onOpenMap: () => void;
  onSave: () => void;
  onShare: () => void;
  onClose: () => void;
};

export function DecisionSheet({ visible, selectedPlace, criticalRestriction, saveStatus = "idle", saveError, children, onOpenMap, onSave, onShare, onClose }: DecisionSheetProps) {
  const insets = useSafeAreaInsets();
  const statusText = saveStatus === "loading" ? "내 장면에 저장하는 중이에요" : saveStatus === "saved" ? "내 장면에 저장했어요" : saveStatus === "error" ? saveError || "저장하지 못했어요. 다시 시도해주세요." : null;
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <Pressable accessibilityRole="button" accessibilityLabel="결정 창 닫기" onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
        <View style={styles.handle} />
        <View style={styles.header}><View style={styles.heading}><Text style={styles.eyebrow}>{selectedPlace.region}</Text><Text style={styles.name}>{selectedPlace.name}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} style={({ pressed }) => [styles.close, pressed && styles.pressed]}><BrandIcon name="close" size={20} color={palette.forest} /></Pressable></View>
        {criticalRestriction ? <View style={styles.restriction}><BrandIcon name="warning" size={18} color={palette.error} /><Text style={styles.restrictionText}>{criticalRestriction}</Text></View> : null}
        {children}
        {statusText ? <Text accessibilityLiveRegion="polite" style={[styles.status, saveStatus === "error" && styles.error]}>{statusText}</Text> : null}
        <Pressable accessibilityRole="button" accessibilityLabel={`${selectedPlace.name} 지도에서 보기`} onPress={onOpenMap} style={({ pressed }) => [styles.mapButton, pressed && styles.pressed]}><BrandIcon name="map" size={19} color={palette.white} /><Text style={styles.mapText}>지도에서 보기</Text></Pressable>
        <View style={styles.secondaryActions}><Pressable accessibilityRole="button" accessibilityLabel="내 장면에 저장" accessibilityState={{ busy: saveStatus === "loading" }} disabled={saveStatus === "loading"} onPress={onSave} style={({ pressed }) => [styles.saveButton, saveStatus === "loading" && styles.disabled, pressed && styles.pressed]}>{saveStatus === "loading" ? <ActivityIndicator color={palette.forest} /> : <BrandIcon name={saveStatus === "saved" ? "check" : "bookmark"} size={18} color={palette.forest} />}<Text style={styles.saveText}>내 장면에 저장</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="공유하기" onPress={onShare} style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}><BrandIcon name="share" size={18} color={palette.forest} /><Text style={styles.shareText}>공유하기</Text></Pressable></View>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15, 48, 42, 0.52)" },
  sheet: { gap: spacing.md, maxHeight: "88%", borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, backgroundColor: palette.paper, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  handle: { alignSelf: "center", width: 42, height: 4, borderRadius: radius.pill, backgroundColor: palette.line },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
  heading: { flex: 1, gap: spacing.xxs },
  eyebrow: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.2, color: palette.forestSoft },
  name: { fontFamily: fonts.serif, fontSize: 25, lineHeight: 33, color: palette.ink },
  close: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: radius.pill, backgroundColor: palette.ivory },
  restriction: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xs, borderWidth: 1, borderColor: palette.errorBorder, borderRadius: radius.sm, backgroundColor: palette.errorSurface, padding: spacing.sm },
  restrictionText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, color: palette.error },
  status: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, color: palette.forest },
  error: { color: palette.error },
  mapButton: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, borderRadius: radius.pill, backgroundColor: palette.forest, paddingHorizontal: spacing.md },
  mapText: { fontFamily: fonts.semibold, fontSize: 16, color: palette.white },
  secondaryActions: { flexDirection: "row", gap: spacing.sm },
  saveButton: { minHeight: 48, flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, borderRadius: radius.pill, backgroundColor: palette.sage },
  saveText: { fontFamily: fonts.semibold, fontSize: 14, color: palette.forest },
  shareButton: { minHeight: 48, flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, borderRadius: radius.pill, borderWidth: 1, borderColor: palette.forest },
  shareText: { fontFamily: fonts.semibold, fontSize: 14, color: palette.forest },
  disabled: { opacity: 0.65 },
  pressed: { opacity: 0.82 },
});
