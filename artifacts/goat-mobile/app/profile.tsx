import { useRouter } from "expo-router";
import { Image } from "expo-image";
import React from "react";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppTabBar } from "@/src/components/AppTabBar";
import { BrandIcon } from "@/src/components/BrandIcon";
import { Header } from "@/src/components/Header";
import { useAuth } from "@/src/context/AuthContext";
import { fonts, palette, radius } from "@/src/theme/editorial";
import { MotionPressable } from "@/src/components/MotionPressable";

export default function ProfileScreen() {
  const router = useRouter(); const insets = useSafeAreaInsets(); const { session, signOut } = useAuth();
  const provider = session?.provider === "kakao" ? "카카오" : session?.provider === "google" ? "Google" : "연결된 OAuth";
  return <View style={styles.screen}><Header title="마이" />
    <Animated.View entering={FadeIn.duration(320)} style={[styles.content, { paddingBottom: 108 + insets.bottom }]}><View style={styles.profileHero}><Image source={require("@/assets/images/goat-symbol-cutout.png")} contentFit="contain" style={styles.avatar} accessibilityLabel="강원도 모양 GOAT 로고" /></View><Text accessibilityRole="header" lineBreakStrategyIOS="hangul-word" textBreakStrategy="balanced" android_hyphenationFrequency="none" style={styles.name}>{session?.displayName ?? "여행자"}</Text><Text lineBreakStrategyIOS="hangul-word" textBreakStrategy="balanced" android_hyphenationFrequency="none" style={styles.email}>{session?.email ?? "GOAT와 강원의 낯선 곳을 찾아보세요."}</Text><Animated.View entering={FadeInDown.delay(120).duration(320)} style={styles.info}><Info label="로그인 계정" value={provider} /><Info label="최근 로그인" value={session?.lastLoginAt ? new Date(session.lastLoginAt).toLocaleString("ko-KR") : "현재 세션"} /></Animated.View><MotionPressable accessibilityRole="button" accessibilityLabel="로그아웃" onPress={async () => { await signOut(); router.replace("/"); }} style={styles.logout}><BrandIcon name="logout" color={palette.error} /><Text style={styles.logoutText}>로그아웃</Text></MotionPressable></Animated.View><AppTabBar />
  </View>;
}

function Info({ label, value }: { label: string; value: string }) { return <View style={styles.infoRow}><Text lineBreakStrategyIOS="hangul-word" textBreakStrategy="balanced" android_hyphenationFrequency="none" style={styles.infoLabel}>{label}</Text><Text lineBreakStrategyIOS="hangul-word" textBreakStrategy="balanced" android_hyphenationFrequency="none" style={styles.infoValue}>{value}</Text></View>; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.ivory }, content: { paddingHorizontal: 20, paddingTop: 18, alignItems: "center" }, profileHero: { width: "100%", height: 160, alignItems: "center", justifyContent: "center", borderRadius: radius.lg, backgroundColor: palette.sage }, avatar: { width: 132, height: 108 }, name: { marginTop: 22, maxWidth: "100%", fontFamily: fonts.serif, fontSize: 26, lineHeight: 34, color: palette.ink, textAlign: "center" }, email: { marginTop: 7, maxWidth: "100%", fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: palette.muted, textAlign: "center" }, info: { width: "100%", marginTop: 36, paddingHorizontal: 16, borderRadius: radius.lg, backgroundColor: palette.paper, borderWidth: StyleSheet.hairlineWidth, borderColor: palette.line, shadowColor: palette.forestDeep, shadowOpacity: .05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1 }, infoRow: { minHeight: 64, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: palette.line }, infoLabel: { flexShrink: 0, fontFamily: fonts.medium, fontSize: 13, color: palette.muted }, infoValue: { flex: 1, minWidth: 0, textAlign: "right", fontFamily: fonts.semibold, fontSize: 13, lineHeight: 19, color: palette.ink }, logout: { width: "100%", minHeight: 52, marginTop: 20, borderRadius: radius.md, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#F7E9E5" }, logoutText: { fontFamily: fonts.semibold, fontSize: 14, color: palette.error }, pressed: { opacity: 0.76 },
});
