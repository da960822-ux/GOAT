import { BrandIcon, type BrandIconName } from "@/src/components/BrandIcon";
import { useAuth, type AuthProviderName } from "@/src/context/AuthContext";
import { fonts, palette, radius } from "@/src/theme/editorial";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const coastImage = require("@/assets/images/generated-scenes/mood-architecture.jpg");
const gangwonLogo = require("@/assets/images/goat-logo-transparent.png");

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { next = "/" } = useLocalSearchParams<{ next?: string }>();
  const { signIn } = useAuth();
  const [busy, setBusy] = useState<AuthProviderName | null>(null);

  const login = async (provider: AuthProviderName) => {
    if (busy) return;
    setBusy(provider);
    try { await signIn(provider, next); }
    catch { Alert.alert("로그인을 완료하지 못했어요", "잠시 후 다시 시도해 주세요."); }
    finally { setBusy(null); }
  };

  return <View style={styles.screen}>
    <Image source={coastImage} style={StyleSheet.absoluteFillObject} contentFit="cover" contentPosition="center" accessibilityLabel="고성의 실제 해안 건축 사진을 바탕으로 만든 배경" />
    <LinearGradient colors={["rgba(246,242,233,.96)", "rgba(246,242,233,.82)", "rgba(15,48,42,.42)"]} locations={[0, .48, 1]} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
    <Pressable accessibilityRole="button" accessibilityLabel="이전 화면" onPress={() => router.back()} style={[styles.back, { top: insets.top + 12 }]} hitSlop={8}>
      <BrandIcon name="back" size={22} color={palette.forest} />
    </Pressable>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 18 }]}>
      <View accessible accessibilityRole="image" style={styles.brand} accessibilityLabel="GOAT, 강원도 모양 브랜드 로고">
        <Image source={gangwonLogo} contentFit="contain" style={styles.brandImage} accessible={false} importantForAccessibility="no-hide-descendants" />
      </View>
      <View style={styles.message}>
        <Text accessibilityRole="header" lineBreakStrategyIOS="hangul-word" textBreakStrategy="balanced" android_hyphenationFrequency="none" style={styles.messageTitle}>해외의 감성을,{`\n`}강원도에서.</Text>
        <Text style={styles.messageBody}>장면 하나를 고르면 닮은 세 곳을 비교해 드려요.</Text>
      </View>
      <View style={styles.actions}>
        <LoginButton label="카카오로 로그인" color={palette.forest} textColor={palette.white} icon="chatbubble" busy={busy === "kakao"} disabled={Boolean(busy)} onPress={() => login("kakao")} />
        <LoginButton label="Google로 로그인" color="rgba(255,252,246,.94)" textColor={palette.ink} icon="logo-google" busy={busy === "google"} disabled={Boolean(busy)} onPress={() => login("google")} />
        <Text style={styles.photoCredit}>생성형 배경 · 실제 고성 에이프레임 사진 기반</Text>
        <Text style={styles.terms}>로그인은 선택 사항이며, 계속하면 아래 문서에 동의하게 됩니다.</Text>
        <View style={styles.policyLinks}>
          <Pressable accessibilityRole="link" onPress={() => router.push("/terms" as never)} hitSlop={8}><Text style={styles.policyLink}>이용약관</Text></Pressable>
          <Text style={styles.policyDivider}>·</Text>
          <Pressable accessibilityRole="link" onPress={() => router.push("/privacy" as never)} hitSlop={8}><Text style={styles.policyLink}>개인정보처리방침</Text></Pressable>
        </View>
      </View>
    </ScrollView>
  </View>;
}

function LoginButton({ label, color, textColor, icon, busy, disabled, onPress }: { label: string; color: string; textColor: string; icon: BrandIconName; busy: boolean; disabled: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ busy, disabled }} accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.loginButton, { backgroundColor: color }, (pressed || disabled) && { opacity: .78 }]}>
    {busy ? <ActivityIndicator color={textColor} /> : <BrandIcon name={icon} size={20} color={textColor} />}
    <Text style={[styles.loginLabel, { color: textColor }]}>{busy ? "연결하는 중" : label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.ivory },
  content: { flexGrow: 1, minHeight: 844, paddingHorizontal: 24 },
  back: { zIndex: 2, position: "absolute", left: 20, width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,252,246,.9)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(23,63,54,.14)" },
  brand: { alignSelf: "center", width: 220, height: 220 },
  brandImage: { width: "100%", height: "100%" },
  message: { flex: 1, minHeight: 154, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 12 },
  messageTitle: { textAlign: "center", fontFamily: fonts.serif, fontSize: 28, lineHeight: 40, letterSpacing: -1, color: palette.forest },
  messageBody: { textAlign: "center", fontFamily: fonts.body, fontSize: 14, lineHeight: 22, color: palette.ink },
  actions: { gap: 10 },
  loginButton: { minHeight: 58, borderRadius: radius.sm, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(23,63,54,.16)" },
  loginLabel: { fontFamily: fonts.semibold, fontSize: 16 },
  photoCredit: { alignSelf: "center", marginTop: 2, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, overflow: "hidden", textAlign: "center", fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, color: palette.white, backgroundColor: "rgba(15,48,42,.68)" },
  terms: { paddingHorizontal: 18, textAlign: "center", fontFamily: fonts.body, fontSize: 11, lineHeight: 18, color: palette.white },
  policyLinks: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  policyLink: { minHeight: 32, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 32, color: palette.white, textDecorationLine: "underline" },
  policyDivider: { fontFamily: fonts.body, fontSize: 12, color: palette.white },
});
