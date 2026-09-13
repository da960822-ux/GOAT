import { Redirect, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/src/context/AuthContext";
import { fonts, palette } from "@/src/theme/editorial";

export default function LoginCallbackScreen() {
  const { next = "/" } = useLocalSearchParams<{ next?: string }>();
  const { restoreSession } = useAuth();
  const [done, setDone] = useState(false);
  useEffect(() => { restoreSession().finally(() => setDone(true)); }, [restoreSession]);
  if (done) return <Redirect href={(next.startsWith("/") ? next : "/") as never}/>;
  return <View style={styles.screen}><Image source={require("@/assets/images/goat-symbol-transparent.png")} contentFit="contain" style={styles.logo} accessibilityLabel="강원도 모양 GOAT 로고"/><ActivityIndicator color={palette.forest}/><Text style={styles.text}>로그인을 확인하고 있어요.</Text></View>;
}
const styles = StyleSheet.create({ screen: { flex: 1, alignItems: "center", justifyContent: "center", gap: 18, backgroundColor: palette.ivory }, logo: { width: 96, height: 80 }, text: { fontFamily: fonts.medium, fontSize: 15, color: palette.ink } });
