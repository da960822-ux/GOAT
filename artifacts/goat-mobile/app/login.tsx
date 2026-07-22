import { BrandIcon, type BrandIconName } from "@/src/components/BrandIcon";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GoatMark } from "@/src/components/editorial/Brand";
import { useAuth, type AuthProviderName } from "@/src/context/AuthContext";
import { editorialImages } from "@/src/data/editorialContent";
import { fonts, palette, radius } from "@/src/theme/editorial";

export default function LoginScreen() {
  const insets = useSafeAreaInsets(); const router = useRouter(); const { next = "/" } = useLocalSearchParams<{ next?: string }>(); const { signIn } = useAuth(); const [busy, setBusy] = useState<AuthProviderName | null>(null);
  const login = async (provider: AuthProviderName) => { if (busy) return; setBusy(provider); try { await signIn(provider, next); } catch { Alert.alert("로그인을 완료하지 못했어요", "잠시 후 다시 시도해주세요."); } finally { setBusy(null); } };
  return <View style={styles.screen}>
    <Image source={editorialImages.coast} style={StyleSheet.absoluteFillObject} contentFit="cover" />
    <View style={styles.scrim} />
    <View style={[styles.top, { paddingTop: insets.top + 20 }]}><Pressable accessibilityLabel="로그인 닫기" onPress={() => router.back()} style={styles.close}><BrandIcon name="close" color={palette.white}/></Pressable><GoatMark light /><Text style={styles.title}>마음이 머무는 풍경을{`\n`}함께 찾아볼까요?</Text><Text style={styles.body}>당신의 취향을 기억하고, 꼭 맞는 강원 여행을 추천해드려요.</Text></View>
    <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
      <Text style={styles.sheetTitle}>여행을 시작해요</Text>
      <LoginButton label="카카오로 계속하기" color={palette.kakao} textColor="#2A231E" icon="chatbubble" onPress={() => login("kakao")} />
      <LoginButton label="Google로 계속하기" color={palette.white} textColor={palette.ink} icon="logo-google" onPress={() => login("google")} />
      <Text style={styles.terms}>계속하면 GOAT의 이용약관 및 개인정보 처리방침에 동의하게 됩니다.</Text>
    </View>
  </View>;
}
function LoginButton({ label, color, textColor, icon, onPress }: { label: string; color: string; textColor: string; icon: BrandIconName; onPress: () => void }) { return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.loginButton, { backgroundColor: color }, pressed && { opacity: .8 }]}><BrandIcon name={icon} size={20} color={textColor} /><Text style={[styles.loginLabel, { color: textColor }]}>{label}</Text></Pressable>; }
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: palette.forest }, scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(9,37,31,.55)" }, top: { flex: 1, paddingHorizontal: 26 }, close: { position: "absolute", right: 16, top: 48, width: 48, height: 48, alignItems: "center", justifyContent: "center", zIndex: 2 }, title: { marginTop: 62, fontFamily: fonts.serif, fontSize: 31, lineHeight: 44, letterSpacing: -1.3, color: palette.white }, body: { marginTop: 16, maxWidth: 310, fontFamily: fonts.body, fontSize: 15, lineHeight: 24, color: "rgba(255,255,255,.8)" }, sheet: { backgroundColor: palette.ivory, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 22, paddingTop: 25, gap: 10 }, sheetTitle: { fontFamily: fonts.serif, fontSize: 22, color: palette.ink, marginBottom: 7, textAlign: "center" }, loginButton: { minHeight: 55, borderRadius: radius.pill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(20,50,43,.15)" }, loginLabel: { fontFamily: fonts.semibold, fontSize: 15 }, terms: { marginTop: 8, paddingHorizontal: 18, textAlign: "center", fontFamily: fonts.body, fontSize: 10.5, lineHeight: 16, color: palette.muted } });
