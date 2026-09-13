import { useRouter } from "expo-router";
import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppTabBar } from "@/src/components/AppTabBar";
import { BrandIcon } from "@/src/components/BrandIcon";
import { Header } from "@/src/components/Header";
import { useAuth } from "@/src/context/AuthContext";
import { fonts, palette, radius } from "@/src/theme/editorial";

export default function ProfileScreen() {
  const router = useRouter(); const insets = useSafeAreaInsets(); const { session, signOut } = useAuth();
  const provider = session?.provider === "kakao" ? "카카오" : session?.provider === "google" ? "Google" : "연결된 OAuth";
  return <View style={styles.screen}><Header title="마이" />
    <View style={[styles.content, { paddingBottom: 108 + insets.bottom }]}><Image source={require("@/assets/images/goat-symbol-cutout.png")} contentFit="contain" style={styles.avatar} accessibilityLabel="강원도 모양 GOAT 로고" /><Text style={styles.name}>{session?.displayName ?? "여행자"}</Text><Text style={styles.email}>{session?.email ?? "GOAT와 강원의 낯선 곳을 찾아보세요."}</Text><View style={styles.info}><Info label="로그인 계정" value={provider} /><Info label="최근 로그인" value={session?.lastLoginAt ? new Date(session.lastLoginAt).toLocaleString("ko-KR") : "현재 세션"} /></View><Pressable accessibilityRole="button" onPress={async () => { await signOut(); router.replace("/"); }} style={({ pressed }) => [styles.logout, pressed && styles.pressed]}><BrandIcon name="logout" color={palette.error} /><Text style={styles.logoutText}>로그아웃</Text></Pressable></View><AppTabBar />
  </View>;
}

function Info({ label, value }: { label: string; value: string }) { return <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text numberOfLines={1} style={styles.infoValue}>{value}</Text></View>; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.ivory }, content: { paddingHorizontal: 20, paddingTop: 22, alignItems: "center" }, avatar: { width: 112, height: 92, marginTop: 12 }, name: { marginTop: 16, fontFamily: fonts.serif, fontSize: 24, color: palette.ink }, email: { marginTop: 6, fontFamily: fonts.body, fontSize: 13, color: palette.muted }, info: { width: "100%", marginTop: 34, paddingHorizontal: 16, borderRadius: radius.md, backgroundColor: palette.paper, borderWidth: StyleSheet.hairlineWidth, borderColor: palette.line }, infoRow: { minHeight: 62, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: palette.line }, infoLabel: { fontFamily: fonts.medium, fontSize: 13, color: palette.muted }, infoValue: { flex: 1, textAlign: "right", fontFamily: fonts.semibold, fontSize: 13, color: palette.ink }, logout: { width: "100%", minHeight: 52, marginTop: 18, borderRadius: radius.md, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#F7E9E5" }, logoutText: { fontFamily: fonts.semibold, fontSize: 14, color: palette.error }, pressed: { opacity: 0.76 },
});
