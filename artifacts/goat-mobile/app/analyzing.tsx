import { BrandIcon } from "@/src/components/BrandIcon";
import { GoatMark } from "@/src/components/editorial/Brand";
import { useApp } from "@/src/context/AppContext";
import { editorialImages } from "@/src/data/editorialContent";
import { referenceCardImages } from "@/src/data/referenceCards";
import { buildRecommendationAttempt, classifyRecommendationError, createRecommendationWithRetry } from "@/src/services/recommendationApi";
import { fonts, palette } from "@/src/theme/editorial";
import type { RecommendationSelection } from "@workspace/travel-domain/catalog";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AnalyzingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const spin = useRef(new Animated.Value(0)).current;
  const { recommendationMethod, selectedMood, selectedReferenceCardId, travelPreferences, origin, pendingAttempt, setPendingAttempt, setRecommendationSession } = useApp();
  const activeMethod = pendingAttempt?.initialSelection.method ?? recommendationMethod;
  const isReferenceFlow = activeMethod === "reference";
  const steps = isReferenceFlow
    ? ["선택한 장면의 분위기를 읽고 있어요", "닮은 풍경을 비교하고 있어요", "추천 카드를 준비하고 있어요"]
    : ["선택한 감성의 결을 찾고 있어요", "이동 조건을 비교하고 있어요", "추천 카드를 준비하고 있어요"];
  const attemptRef = useRef(pendingAttempt);

  useEffect(() => {
    let active = true;
    let animation: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced || !active) return;
      animation = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 7200, easing: Easing.linear, useNativeDriver: Platform.OS !== "web" }));
      animation.start();
    });

    let selection: RecommendationSelection | null = pendingAttempt?.initialSelection ?? null;
    if (!selection && recommendationMethod === "mood" && selectedMood) selection = { method: "mood", moodId: selectedMood.id };
    if (!selection && recommendationMethod === "reference" && selectedReferenceCardId) selection = { method: "reference", referenceCardId: selectedReferenceCardId };
    if (!selection) {
      router.replace((activeMethod === "reference" ? "/reference-selection" : "/mood-selection") as never);
      return () => { active = false; animation?.stop(); spin.stopAnimation(); };
    }

    const attempt = attemptRef.current ?? buildRecommendationAttempt({ selection, preferences: travelPreferences ?? undefined, origin });
    attemptRef.current = attempt;
    setPendingAttempt(attempt);
    const run = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 450));
        if (active) setStep(1);
        const session = await createRecommendationWithRetry(attempt);
        if (!active) return;
        setStep(2);
        setRecommendationSession(session);
        setPendingAttempt(null);
        await new Promise((resolve) => setTimeout(resolve, 550));
        if (active) router.replace("/results");
      } catch (error) {
        if (!active) return;
        const classified = classifyRecommendationError(error);
        if (classified.route === "/login") {
          router.replace({ pathname: "/login", params: { next: "/analyzing", code: classified.code } } as never);
          return;
        }
        router.replace({ pathname: classified.route, params: { retry: classified.retryable ? "recommendation" : undefined, code: classified.code } } as never);
      }
    };
    run();
    return () => { active = false; animation?.stop(); spin.stopAnimation(); };
  }, [origin, recommendationMethod, router, selectedMood, selectedReferenceCardId, setPendingAttempt, setRecommendationSession, spin, travelPreferences]);

  const analyzingImage = selectedReferenceCardId ? referenceCardImages[selectedReferenceCardId] : editorialImages.beach;
  const rotation = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <View style={[styles.screen, { paddingTop: insets.top + 15, paddingBottom: insets.bottom + 26 }]}>
      <View style={styles.lockup}><GoatMark /></View>
      <View style={styles.hero}>
        <Animated.View style={[styles.orbit, { transform: [{ rotate: rotation }] }]}><View style={styles.orbitDot} /></Animated.View>
        <View style={styles.photo}><Image source={analyzingImage} style={StyleSheet.absoluteFillObject} contentFit="cover" accessibilityLabel="선택한 감성과 어울리는 강원 풍경" /></View>
      </View>
      <Text style={styles.eyebrow}>{isReferenceFlow ? "선택한 장면을 살피는 중" : "여행의 결을 찾는 중"}</Text>
      <Text style={styles.title}>{isReferenceFlow ? "선택한 장면과 닮은{\n}강원을 찾고 있어요" : "선택한 감성과 닮은{\n}강원을 찾고 있어요"}</Text>
      <Text style={styles.subtitle}>잠시만 기다려 주세요. 여행의 결을 세심하게 맞추고 있어요.</Text>
      <View accessibilityLiveRegion="polite" style={styles.steps}>
        {steps.map((label, index) => <View key={label} style={[styles.step, index <= step && styles.stepActive]}><View style={[styles.stepIcon, index <= step && styles.stepIconActive]}>{index < step ? <BrandIcon name="check" size={13} color={palette.ivory} /> : <Text style={[styles.stepNum, index <= step && styles.stepNumActive]}>{index + 1}</Text>}</View><Text style={[styles.stepLabel, index <= step && styles.stepLabelActive]}>{label}</Text></View>)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.ivory, paddingHorizontal: 28 },
  lockup: { alignItems: "center" },
  hero: { height: 230, marginTop: 34, alignItems: "center", justifyContent: "center" },
  orbit: { position: "absolute", width: 218, height: 218, borderRadius: 109, borderWidth: 1, borderColor: "rgba(31,71,57,.28)" },
  orbitDot: { position: "absolute", top: -5, left: 99, width: 10, height: 10, borderRadius: 5, backgroundColor: palette.forest },
  photo: { width: 178, height: 178, borderRadius: 89, overflow: "hidden", borderWidth: 5, borderColor: "rgba(255,255,255,.76)", shadowColor: "#18372C", shadowOffset: { width: 0, height: 10 }, shadowOpacity: .14, shadowRadius: 20, elevation: 4 },
  eyebrow: { marginTop: 18, textAlign: "center", fontFamily: fonts.bold, fontSize: 9.5, letterSpacing: 1.8, color: "#738075" },
  title: { marginTop: 13, textAlign: "center", fontFamily: fonts.serif, fontSize: 28, lineHeight: 39, letterSpacing: -1.1, color: palette.ink },
  subtitle: { marginTop: 12, textAlign: "center", fontFamily: fonts.body, fontSize: 13.5, lineHeight: 21, color: palette.muted },
  steps: { marginTop: "auto", gap: 9 },
  step: { minHeight: 50, paddingHorizontal: 13, borderRadius: 15, flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: "rgba(30,61,49,.045)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(30,61,49,.1)" },
  stepActive: { backgroundColor: "rgba(31,74,59,.1)", borderColor: "rgba(31,74,59,.18)" },
  stepIcon: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(31,74,59,.2)" },
  stepIconActive: { backgroundColor: palette.forest, borderColor: palette.forest },
  stepNum: { fontFamily: fonts.semibold, fontSize: 12, color: "#94A098" },
  stepNumActive: { color: palette.ivory },
  stepLabel: { fontFamily: fonts.medium, fontSize: 13, color: "#8A938C" },
  stepLabelActive: { color: palette.ink },
});
