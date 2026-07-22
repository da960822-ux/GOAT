import { useRouter } from "expo-router";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GoatMark } from "@/src/components/editorial/Brand";
import { PrimaryButton } from "@/src/components/editorial/UI";
import { useApp } from "@/src/context/AppContext";
import { fonts, palette } from "@/src/theme/editorial";
const gangwonMap = require("@/assets/images/editorial/gangwon-map-collage.png");

export default function NoResultsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useApp();

  return <View style={styles.screen}>
    <View style={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 22 }]}>
      <GoatMark />
      <View style={styles.center}>
        <View style={styles.artFrame}>
          <Image source={gangwonMap} style={styles.art} contentFit="contain" accessibilityLabel="강원도 산과 바다를 담은 여행 지도" />
        </View>
        <Text style={styles.code}>다시 찾아볼게요</Text>
        <Text style={styles.title}>조건에 딱 맞는 장소를{`\n`}찾지 못했어요</Text>
        <Text style={styles.body}>조건을 조금 넓혀 다시 추천하거나,{`\n`}처음부터 새로운 장면을 찾아볼 수 있어요.</Text>
      </View>
      <View style={styles.actions}>
        <PrimaryButton label="여행 조건 다시 고르기" onPress={() => router.replace("/travel-preference")} />
        <PrimaryButton label="감성부터 다시 찾기" variant="outline" onPress={() => router.replace("/mood-selection")} />
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.ivory },
  content: { flex: 1, paddingHorizontal: 22 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", marginTop: -20 },
  artFrame: { width: 174, height: 212, overflow: "hidden", borderRadius: 87, backgroundColor: "#F6F2E9" },
  art: { width: "100%", height: "100%", transform: [{ scale: 1.16 }] },
  code: { marginTop: 24, fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.8, color: palette.forestSoft },
  title: { marginTop: 11, textAlign: "center", fontFamily: fonts.serif, fontSize: 29, lineHeight: 40, color: palette.ink },
  body: { marginTop: 12, textAlign: "center", fontFamily: fonts.body, fontSize: 14, lineHeight: 23, color: palette.muted },
  actions: { gap: 10 },
});
