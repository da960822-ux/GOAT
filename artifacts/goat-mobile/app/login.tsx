import { BrandIcon, type BrandIconName } from "@/src/components/BrandIcon";
import { useAuth, type AuthProviderName } from "@/src/context/AuthContext";
import { fonts, palette, radius } from "@/src/theme/editorial";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const coastImage = require("@/assets/images/editorial/landing-coast.png");

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
    <Image source={coastImage} style={StyleSheet.absoluteFillObject} contentFit="cover" contentPosition="center" accessibilityLabel="강원 해안 절벽과 바다 풍경" />
    <View style={styles.imageWash} />
    <View style={[styles.content, { paddingTop: insets.top + 72, paddingBottom: insets.bottom + 22 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="이전 화면" onPress={() => router.back()} style={styles.back} hitSlop={8}>
        <BrandIcon name="back" size={22} color={palette.forest} />
      </Pressable>
      <View style={styles.brand} accessibilityLabel="GOAT, Gangwon of all time">
        <Text style={styles.wordmark}>GOAT</Text>
        <Text style={styles.tagline}>GANGWON OF ALL TIME</Text>
      </View>
      <View style={styles.message}><Text style={styles.messageTitle}>GOAT와 함께{`\n`}강원의 특별한 순간을 만나보세요.</Text></View>
      <View style={styles.actions}>
        <LoginButton label="카카오로 로그인" color={palette.forest} textColor={palette.white} icon="chatbubble" busy={busy === "kakao"} disabled={Boolean(busy)} onPress={() => login("kakao")} />
        <LoginButton label="Google로 로그인" color="rgba(255,252,246,.94)" textColor={palette.ink} icon="logo-google" busy={busy === "google"} disabled={Boolean(busy)} onPress={() => login("google")} />
        <Text style={styles.terms}>로그인하면 GOAT의{`\n`}이용약관 및 개인정보처리방침에 동의하게 됩니다.</Text>
      </View>
    </View>
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
  imageWash: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(246,242,233,.76)" },
  content: { flex: 1, paddingHorizontal: 40 },
  back: { position: "absolute", left: 26, top: 20, width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,252,246,.62)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(23,63,54,.1)" },
  brand: { alignItems: "center" },
  wordmark: { fontFamily: fonts.serifRegular, fontSize: 62, lineHeight: 72, letterSpacing: 8, color: palette.forest },
  tagline: { marginTop: 2, fontFamily: fonts.medium, fontSize: 10, letterSpacing: 4, color: palette.forest },
  message: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 76 },
  messageTitle: { textAlign: "center", fontFamily: fonts.serifRegular, fontSize: 25, lineHeight: 39, letterSpacing: -1.1, color: palette.forest },
  actions: { gap: 14 },
  loginButton: { minHeight: 76, borderRadius: radius.md, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(23,63,54,.16)" },
  loginLabel: { fontFamily: fonts.semibold, fontSize: 19 },
  terms: { marginTop: 12, textAlign: "center", fontFamily: fonts.body, fontSize: 12, lineHeight: 20, color: palette.muted },
});
