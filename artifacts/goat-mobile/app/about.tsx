import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Header } from "@/src/components/Header";
import { fonts, palette, spacing } from "@/src/theme/editorial";

const logo = require("@/assets/images/goat-logo-cutout.png");

export default function AboutScreen() {
  const router = useRouter();
  return (
    <View style={styles.root}>
      <Header title="GOAT 소개" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn.duration(360)} style={styles.hero}>
          <Image source={logo} contentFit="contain" style={styles.logo} accessibilityLabel="강원도 모양 GOAT 로고" />
          <Text accessibilityRole="header" style={styles.brandSentence}>해외의 감성을, 강원도에서.</Text>
          <Text style={styles.brandDesc}>보고 싶은 장면 하나를 고르면 닮은 강원 장소 세 곳을 비교해 드리는 여행 큐레이션 서비스입니다.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(340)}><Section title="GOAT는?">
          <Paragraph>Gangwon Of All Time의 약자로, 사용자가 고른 감성과 확인 가능한 여행 조건을 바탕으로 강원 장소 세 곳을 제안합니다.</Paragraph>
          <Paragraph>추천 결과는 사진에서 보이는 차이, 접근·이동, 중요 제한을 같은 순서로 비교할 수 있습니다.</Paragraph>
        </Section></Animated.View>

        <Section title="이용 흐름">
          {["보고 싶은 장면 하나를 고릅니다.", "장면과 어울리는 강원 장소 세 곳을 확인합니다.", "같은 기준으로 비교하고 한 곳을 선택합니다.", "지도에서 확인하거나 내 장면에 저장합니다."].map((text, index) => (
            <View key={text} style={styles.stepRow}>
              <Text style={styles.stepNum}>{index + 1}</Text>
              <Text style={styles.stepText}>{text}</Text>
            </View>
          ))}
        </Section>

        <Section title="추천 카드">
          <Paragraph><Text style={styles.label}>장면 최적</Text> · 고른 장면과 가장 정직하게 맞는 장소</Paragraph>
          <Paragraph><Text style={styles.label}>같은 분위기 대안</Text> · 같은 무드 안에서 비교할 두 번째 장소</Paragraph>
          <Paragraph><Text style={styles.label}>조건 맞춤</Text> · 이동 방식과 요청한 오늘 조건을 더 반영한 장소</Paragraph>
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ivory },
  scroll: { paddingBottom: 40 },
  hero: { alignItems: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: 40, backgroundColor: palette.sage },
  logo: { width: 198, height: 198 },
  brandSentence: { marginTop: spacing.sm, fontFamily: fonts.serif, fontSize: 24, lineHeight: 33, color: palette.forest, textAlign: "center" },
  brandDesc: { maxWidth: 330, marginTop: spacing.sm, fontFamily: fonts.body, fontSize: 15, lineHeight: 24, color: palette.muted, textAlign: "center" },
  section: { paddingHorizontal: spacing.lg, paddingVertical: 28, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line },
  sectionTitle: { marginBottom: spacing.md, fontFamily: fonts.serif, fontSize: 21, lineHeight: 29, color: palette.ink },
  paragraph: { marginBottom: spacing.sm, fontFamily: fonts.body, fontSize: 15, lineHeight: 24, color: palette.muted },
  label: { fontFamily: fonts.semibold, color: palette.forest },
  stepRow: { minHeight: 52, flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  stepNum: { width: 28, fontFamily: fonts.serif, fontSize: 19, lineHeight: 26, color: palette.forest },
  stepText: { flex: 1, fontFamily: fonts.body, fontSize: 15, lineHeight: 24, color: palette.ink },
});
