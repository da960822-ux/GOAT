import { Redirect, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { GangwonSymbol } from "@/src/components/editorial/Brand";
import { useAuth } from "@/src/context/AuthContext";
import { fonts, palette } from "@/src/theme/editorial";

export default function LoginCallbackScreen() {
  const { next = "/" } = useLocalSearchParams<{ next?: string }>();
  const { restoreSession } = useAuth();
  const [done, setDone] = useState(false);
  useEffect(() => { restoreSession().finally(() => setDone(true)); }, [restoreSession]);
  if (done) return <Redirect href={(next.startsWith("/") ? next : "/") as never}/>;
  return <View style={styles.screen}><GangwonSymbol size={72}/><ActivityIndicator color={palette.forest}/><Text style={styles.text}>로그인을 확인하고 있어요.</Text></View>;
}
const styles = StyleSheet.create({ screen: { flex: 1, alignItems: "center", justifyContent: "center", gap: 18, backgroundColor: palette.ivory }, text: { fontFamily: fonts.medium, fontSize: 15, color: palette.ink } });
