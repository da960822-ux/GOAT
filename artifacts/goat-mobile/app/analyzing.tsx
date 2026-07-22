import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RecommendationSelection } from "@workspace/travel-domain/catalog";
import { BrandIcon } from "@/src/components/BrandIcon";
import { GoatMark } from "@/src/components/editorial/Brand";
import { useApp } from "@/src/context/AppContext";
import { editorialImages } from "@/src/data/editorialContent";
import { referenceCardImages } from "@/src/data/referenceCards";
import { buildRecommendationAttempt, classifyRecommendationError, createRecommendationWithRetry } from "@/src/services/recommendationApi";
import { fonts, palette } from "@/src/theme/editorial";

export default function AnalyzingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const spin = useRef(new Animated.Value(0)).current;
  const {
    recommendationMethod,
    selectedMood,
    selectedReferenceCardId,
    travelPreferences,
    origin,
    pendingAttempt,
    setPendingAttempt,
    setRecommendationSession,
  } = useApp();
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

    const attempt = attemptRef.current ?? buildRecommendationAttempt({
      selection,
      preferences: travelPreferences ?? undefined,
      origin,
    });
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
  }, [activeMethod, origin, recommendationMethod, router, selectedMood, selectedReferenceCardId, setPendingAttempt, setRecommendationSession, spin, travelPreferences]);

  const analyzingImage = selectedReferenceCardId ? referenceCardImages[selectedReferenceCardId] : editorialImages.beach;
  return (
    <View style={[styles.screen, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 28 }]}>
      <GoatMark light />
      <View style={styles.center}>
        <Animated.View style={[styles.orbit, { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }]}><View style={styles.dot} /></Animated.View>
        <View style={styles.photo}><Image source={analyzingImage} style={StyleSheet.absoluteFillObject} contentFit="cover" accessibilityLabel={isReferenceFlow ? "선택한 레퍼런스 장면" : "선택한 감성과 닮은 해안 풍경"} /></View>
        <Text style={styles.kicker}>{isReferenceFlow ? "READING YOUR REFERENCE" : "CURATING YOUR JOURNEY"}</Text>
        <Text style={styles.title}>{isReferenceFlow ? "선택한 장면과 닮은\n강원을 찾고 있어요" : "선택한 감성과 닮은\n강원을 찾고 있어요"}</Text>
      </View>
      <View accessibilityLiveRegion="polite" style={styles.steps}>
        {steps.map((label, index) => <View key={label} style={styles.step}><View style={[styles.stepIcon, index <= step && styles.stepIconActive]}>{index < step ? <BrandIcon name="check" size={14} color={palette.forest} /> : <Text style={[styles.stepNum, index <= step && { color: palette.forest }]}>{index + 1}</Text>}</View><Text style={[styles.stepLabel, index <= step && styles.stepLabelActive]}>{label}</Text></View>)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.forest, paddingHorizontal: 23 }, center: { flex: 1, alignItems: "center", justifyContent: "center" }, orbit: { position: "absolute", top: "19%", width: 194, height: 194, borderRadius: 97, borderWidth: 1, borderColor: "rgba(255,255,255,.28)" }, dot: { position: "absolute", left: 87, top: -5, width: 10, height: 10, borderRadius: 5, backgroundColor: palette.ivory }, photo: { width: 158, height: 158, borderRadius: 79, overflow: "hidden", borderWidth: 4, borderColor: "rgba(255,255,255,.15)" }, kicker: { marginTop: 34, fontFamily: fonts.bold, fontSize: 9.5, letterSpacing: 1.8, color: palette.sage }, title: { marginTop: 12, fontFamily: fonts.serif, fontSize: 27, lineHeight: 40, textAlign: "center", color: palette.white }, steps: { gap: 10 }, step: { minHeight: 47, borderRadius: 14, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,255,255,.08)" }, stepIcon: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,.25)" }, stepIconActive: { backgroundColor: palette.ivory, borderColor: palette.ivory }, stepNum: { fontFamily: fonts.semibold, color: "rgba(255,255,255,.5)" }, stepLabel: { fontFamily: fonts.medium, fontSize: 13, color: "rgba(255,255,255,.45)" }, stepLabelActive: { color: palette.white },
});
