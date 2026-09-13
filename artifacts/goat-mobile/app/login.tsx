import { BrandIcon, type BrandIconName } from "@/src/components/BrandIcon";
import { useAuth, type AuthProviderName } from "@/src/context/AuthContext";
import { fonts, palette, radius } from "@/src/theme/editorial";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const coastImage = require("@/assets/images/generated-scenes/landing-goseong-coast-portrait.png");
const gangwonSymbol = require("@/assets/images/goat-symbol-cutout.png");
const goatWordmark = require("@/assets/images/goat-wordmark-cutout.png");

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
    <LinearGradient colors={["rgba(246,242,233,.22)", "rgba(15,48,42,.06)", "rgba(15,48,42,.52)", "rgba(7,29,25,.88)"]} locations={[0, .35, .62, 1]} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
    <Pressable accessibilityRole="button" accessibilityLabel="이전 화면" onPress={() => router.back()} style={[styles.back, { top: insets.top + 12 }]} hitSlop={8}>
      <BrandIcon name="back" size={22} color={palette.forest} />
    </Pressable>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 188, paddingBottom: insets.bottom + 18 }]}>
      <View accessible accessibilityRole="image" style={styles.brand} accessibilityLabel="GOAT, 강원도 모양 브랜드 로고">
        <Image source={gangwonSymbol} contentFit="contain" style={styles.brandSymbol} accessible={false} importantForAccessibility="no-hide-descendants" />
        <View style={styles.brandDivider} />
        <Image source={goatWordmark} contentFit="contain" style={styles.brandWordmark} accessible={false} importantForAccessibility="no-hide-descendants" />
      </View>
      <View style={styles.message}>
        <Text accessibilityRole="header" lineBreakStrategyIOS="hangul-word" textBreakStrategy="balanced" android_hyphenationFrequency="none" style={styles.messageTitle}>GOAT와 함께{`\n`}강원의 특별한 순간을 만나보세요.</Text>
      </View>
      <View style={styles.actions}>
        <LoginButton label="카카오로 로그인" color={palette.forest} textColor={palette.white} icon="chatbubble" busy={busy === "kakao"} disabled={Boolean(busy)} onPress={() => login("kakao")} />
        <LoginButton label="Google로 로그인" color="rgba(255,252,246,.94)" textColor={palette.ink} icon="logo-google" busy={busy === "google"} disabled={Boolean(busy)} onPress={() => login("google")} />
        <Text style={styles.photoCredit}>생성형 배경 · 실제 고성 에이프레임과 거진 해안 사진 기반</Text>
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
  content: { flexGrow: 1, minHeight: 844, paddingHorizontal: 20 },
  back: { zIndex: 2, position: "absolute", left: 18, width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,252,246,.7)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(23,63,54,.1)" },
  brand: { alignSelf: "center", width: 244, height: 92, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 11 },
  brandSymbol: { width: 78, height: 88 },
  brandDivider: { width: StyleSheet.hairlineWidth, height: 58, backgroundColor: "rgba(15,48,42,.5)" },
  brandWordmark: { width: 144, height: 64 },
  message: { minHeight: 146, alignItems: "center", justifyContent: "center", paddingHorizontal: 2 },
  messageTitle: { textAlign: "center", fontFamily: fonts.serif, fontSize: 22, lineHeight: 32, letterSpacing: -0.7, color: palette.ivory, textShadowColor: "rgba(7,29,25,.42)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  actions: { width: 286, alignSelf: "center", gap: 11 },
  loginButton: { minHeight: 58, borderRadius: radius.sm, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(23,63,54,.16)" },
  loginLabel: { fontFamily: fonts.semibold, fontSize: 16 },
  photoCredit: { alignSelf: "center", marginTop: 2, textAlign: "center", fontFamily: fonts.body, fontSize: 11, lineHeight: 16, color: "rgba(255,252,246,.82)" },
  terms: { paddingHorizontal: 2, textAlign: "center", fontFamily: fonts.body, fontSize: 12, lineHeight: 19, color: palette.white },
  policyLinks: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  policyLink: { minHeight: 32, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 32, color: palette.white, textDecorationLine: "underline" },
  policyDivider: { fontFamily: fonts.body, fontSize: 12, color: palette.white },
});
