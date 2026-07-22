import { useRouter } from "expo-router";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GoatMark } from "@/src/components/editorial/Brand";
import { PrimaryButton } from "@/src/components/editorial/UI";
import { fonts, palette } from "@/src/theme/editorial";
const gangwonMap = require("@/assets/images/editorial/gangwon-map-collage.png");

export default function NetworkErrorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return <View style={styles.screen}>
    <View style={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 22 }]}>
      <GoatMark />
      <View style={styles.center}>
        <View style={styles.artFrame}>
          <Image source={gangwonMap} style={styles.art} contentFit="contain" accessibilityLabel="강원도 산과 바다를 담은 여행 지도" />
        </View>
        <Text style={styles.code}>연결을 확인해볼게요</Text>
        <Text style={styles.title}>잠시 연결이{`\n`}불안정해요</Text>
        <Text style={styles.body}>입력한 조건은 그대로 보관되어 있어요.{`\n`}네트워크 상태를 확인한 뒤 다시 시도해주세요.</Text>
      </View>
      <View style={styles.actions}>
        <PrimaryButton label="다시 시도하기" icon="refresh" onPress={() => router.replace("/analyzing" as never)} />
        <PrimaryButton label="홈으로 돌아가기" variant="outline" onPress={() => router.replace("/")} />
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
  title: { marginTop: 11, textAlign: "center", fontFamily: fonts.serif, fontSize: 30, lineHeight: 41, color: palette.ink },
  body: { marginTop: 12, textAlign: "center", fontFamily: fonts.body, fontSize: 14, lineHeight: 23, color: palette.muted },
  actions: { gap: 10 },
});
