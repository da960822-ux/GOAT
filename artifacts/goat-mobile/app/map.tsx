import React, { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppTabBar } from "@/src/components/AppTabBar";
import { BrandIcon } from "@/src/components/BrandIcon";
import { Header } from "@/src/components/Header";
import { useApp } from "@/src/context/AppContext";
import { loadCourse } from "@/src/services/courseStore";
import { fonts, palette, radius } from "@/src/theme/editorial";
import { MotionPressable } from "@/src/components/MotionPressable";

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { course, setCourse } = useApp();
  const [status, setStatus] = useState<
    "loading" | "content" | "empty" | "error"
  >(course ? "content" : "loading");
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [retryUrl, setRetryUrl] = useState<string | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(course?.stops[0]?.id ?? null);
  useEffect(() => {
    if (course) {
      setStatus("content");
      setSelectedStopId((current) => current ?? course.stops[0]?.id ?? null);
      return;
    }
    let active = true;
    void loadCourse()
      .then((saved) => {
        if (!active) return;
        if (saved) {
          setCourse(saved);
          setStatus("content");
        } else setStatus("empty");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [course, restoreAttempt, setCourse]);
  const openMap = async (url: string) => {
    setLinkError(null);
    setRetryUrl(url);
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" || parsed.hostname !== "map.kakao.com")
        throw new Error("unsupported map link");
      if (!(await Linking.canOpenURL(url)))
        throw new Error("unavailable map link");
      await Linking.openURL(url);
    } catch {
      const message = "카카오맵을 열지 못했어요. 다시 시도해 주세요.";
      setLinkError(message);
      AccessibilityInfo.announceForAccessibility(message);
    }
  };
  if (status === "loading")
    return (
      <State onBack={() => router.back()} title="마지막 코스를 불러오는 중이에요">
        <ActivityIndicator color={palette.forest} />
      </State>
    );
  if (status === "error")
    return (
      <State
        onBack={() => router.back()}
        title="코스를 불러오지 못했어요"
        body="저장한 코스는 그대로 남아 있어요."
        action="다시 시도"
        onPress={() => {
          setStatus("loading");
          setRestoreAttempt((value) => value + 1);
        }}
      />
    );
  if (status === "empty" || !course)
    return (
      <State
        onBack={() => router.back()}
        title="아직 만든 코스가 없어요"
        body="추천 장소를 고른 뒤 ‘여행 이어가기’를 눌러 보세요."
        action="장면 발견하기"
        onPress={() => router.replace("/")}
      />
    );
  return (
    <View style={styles.screen}>
      <Header title="여행 지도" onBack={() => router.back()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 108 + insets.bottom },
        ]}
      >
        <View style={styles.hero}>
          <View style={styles.mapGlyph}>
            <BrandIcon name="map" size={33} color={palette.forest} />
          </View>
          <Text style={styles.eyebrow}>선택한 장소를 잇는 코스</Text>
          <View
            accessibilityRole="text"
            accessibilityLabel={
              course.mode === "LLM_OPENROUTER"
                ? "AI가 만든 코스"
                : "검증된 기본 코스"
            }
            style={styles.modeBadge}
          >
            <BrandIcon
              name={course.mode === "LLM_OPENROUTER" ? "recommend" : "check"}
              size={13}
              color={palette.forest}
            />
            <Text style={styles.modeBadgeText}>
              {course.mode === "LLM_OPENROUTER"
                ? "코스 큐레이터"
                : "검증된 기본 코스"}
            </Text>
          </View>
          <Text lineBreakStrategyIOS="hangul-word" textBreakStrategy="balanced" android_hyphenationFrequency="none" style={styles.heroTitle}>
            {course.courseTitle ?? "강원 여행 코스"}
          </Text>
          <Text lineBreakStrategyIOS="hangul-word" textBreakStrategy="balanced" android_hyphenationFrequency="none" style={styles.heroText}>
            {course.summary ?? course.message}
          </Text>
        </View>
        {(() => { const selected = course.stops.find((stop) => stop.id === selectedStopId) ?? course.stops[0]; return selected ? <View style={styles.selectedPanel}><Text style={styles.selectedEyebrow}>지금 확인하는 장소</Text><Text lineBreakStrategyIOS="hangul-word" textBreakStrategy="balanced" android_hyphenationFrequency="none" style={styles.selectedTitle}>{selected.title}</Text><Text lineBreakStrategyIOS="hangul-word" textBreakStrategy="balanced" android_hyphenationFrequency="none" style={styles.selectedBody}>{selected.reason}</Text><MotionPressable accessibilityRole="button" accessibilityLabel={`${selected.title} 카카오맵에서 보기`} onPress={() => void openMap(`https://map.kakao.com/link/search/${encodeURIComponent(selected.title)}`)} style={styles.selectedAction}><Text style={styles.selectedActionText}>카카오맵에서 열기</Text><BrandIcon name="external" size={15} color={palette.white} /></MotionPressable></View> : null; })()}
        <View style={styles.route}>
          <Text style={styles.routeTitle}>여행 순서</Text>
          {course.stops.map((stop, index) => (
            <View key={stop.id} style={styles.stop}>
              <View style={styles.rail}>
                {index < course.stops.length - 1 ? (
                  <View style={styles.line} />
                ) : null}
                <View style={styles.order}>
                  <Text style={styles.orderText}>{stop.order}</Text>
                </View>
              </View>
              <MotionPressable accessibilityRole="button" accessibilityLabel={`${stop.title} 선택`} onPress={() => setSelectedStopId(stop.id)} style={[styles.stopCopy, selectedStopId === stop.id && styles.stopCopySelected]}>
                <Text lineBreakStrategyIOS="hangul-word" textBreakStrategy="balanced" android_hyphenationFrequency="none" style={styles.stopTitle}>{stop.title}</Text>
                <Text lineBreakStrategyIOS="hangul-word" textBreakStrategy="balanced" android_hyphenationFrequency="none" style={styles.stopMeta}>
                  {stop.stayMinutes}분 체류 참고 · {stop.reason}
                </Text>
              </MotionPressable>
              <MotionPressable
                accessibilityRole="button"
                accessibilityLabel={`${stop.title} 카카오맵 열기`}
                onPress={() =>
                  void openMap(
                    `https://map.kakao.com/link/search/${encodeURIComponent(stop.title)}`,
                  )
                }
                style={styles.open}
              >
                <BrandIcon name="external" size={18} color={palette.forest} />
              </MotionPressable>
            </View>
          ))}
        </View>
        {course.warnings.length ? (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>코스 참고</Text>
            {course.warnings.map((warning) => (
              <Text key={warning} style={styles.noticeText}>
                • {warning}
              </Text>
            ))}
          </View>
        ) : null}
        {course.staticMap.fallbackMapSearchUrl ? (
          <MotionPressable
            accessibilityRole="button"
            accessibilityLabel="카카오맵에서 코스 보기"
            onPress={() => void openMap(course.staticMap.fallbackMapSearchUrl!)}
            style={styles.mapButton}
          >
            <BrandIcon name="location" color={palette.white} />
            <Text style={styles.mapButtonText}>카카오맵에서 전체 보기</Text>
          </MotionPressable>
        ) : null}
        {linkError ? (
          <View accessibilityLiveRegion="assertive" style={styles.linkError}>
            <Text style={styles.linkErrorText}>{linkError}</Text>
            {retryUrl ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void openMap(retryUrl)}
                style={styles.retry}
              >
                <Text style={styles.retryText}>다시 시도</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
      <AppTabBar />
    </View>
  );
}

function State({
  onBack,
  title,
  body,
  action,
  onPress,
  children,
}: {
  onBack?: () => void;
  title: string;
  body?: string;
  action?: string;
  onPress?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.screen}>
      <Header title="여행 지도" onBack={onBack} />
      <View style={styles.state} accessibilityLiveRegion="polite">
        <BrandIcon name="course" size={44} color={palette.forest} />
        <Text style={styles.stateTitle}>{title}</Text>
        {body ? <Text lineBreakStrategyIOS="hangul-word" textBreakStrategy="balanced" android_hyphenationFrequency="none" style={styles.stateBody}>{body}</Text> : null}
        {children}
        {action && onPress ? (
          <Pressable
            accessibilityRole="button"
            onPress={onPress}
            style={styles.retry}
          >
            <Text style={styles.retryText}>{action}</Text>
          </Pressable>
        ) : null}
      </View>
      <AppTabBar />
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.ivory },
  content: { padding: 20 },
  hero: {
    minHeight: 246,
    padding: 24,
    borderRadius: radius.lg,
    justifyContent: "flex-end",
    backgroundColor: palette.sage,
  },
  mapGlyph: {
    position: "absolute",
    top: 24,
    right: 24,
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.paper,
  },
  eyebrow: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: palette.forestSoft,
  },
  modeBadge: {
    alignSelf: "flex-start",
    minHeight: 30,
    marginTop: 10,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: palette.paper,
  },
  modeBadgeText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: palette.forest,
  },
  heroTitle: {
    marginTop: 10,
    paddingRight: 38,
    fontFamily: fonts.serif,
    fontSize: 23,
    lineHeight: 33,
    color: palette.ink,
  },
  heroText: {
    marginTop: 9,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: palette.muted,
  },
  selectedPanel: { marginTop: 20, padding: 18, borderRadius: radius.lg, backgroundColor: palette.forest },
  selectedEyebrow: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.2, color: palette.sage },
  selectedTitle: { marginTop: 8, fontFamily: fonts.serif, fontSize: 22, lineHeight: 30, color: palette.white },
  selectedBody: { marginTop: 6, fontFamily: fonts.body, fontSize: 13, lineHeight: 20, color: "rgba(255,252,246,.8)" },
  selectedAction: { alignSelf: "flex-start", minHeight: 44, marginTop: 14, paddingHorizontal: 14, borderRadius: radius.sm, flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(255,255,255,.16)" },
  selectedActionText: { fontFamily: fonts.semibold, fontSize: 13, color: palette.white },
  route: { marginTop: 30 },
  routeTitle: {
    marginBottom: 12,
    fontFamily: fonts.serif,
    fontSize: 19,
    color: palette.ink,
  },
  stop: { minHeight: 82, flexDirection: "row", alignItems: "center" },
  rail: {
    width: 46,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  line: {
    position: "absolute",
    top: "50%",
    bottom: -1,
    width: 1,
    backgroundColor: palette.line,
  },
  order: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.forest,
  },
  orderText: { fontFamily: fonts.bold, fontSize: 12, color: palette.white },
  stopCopy: {
    flex: 1,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
  },
  stopCopySelected: { paddingHorizontal: 12, borderRadius: radius.sm, backgroundColor: palette.sage },
  stopTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 23,
    color: palette.ink,
  },
  stopMeta: {
    marginTop: 5,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: palette.muted,
  },
  open: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.paper,
  },
  mapButton: {
    minHeight: 56,
    marginTop: 24,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: palette.forest,
  },
  mapButtonText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: palette.white,
  },
  notice: {
    marginTop: 20,
    gap: 6,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: palette.paper,
  },
  noticeTitle: { fontFamily: fonts.semibold, fontSize: 14, color: palette.ink },
  noticeText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: palette.muted,
  },
  linkError: { marginTop: 16, alignItems: "center", gap: 8 },
  linkErrorText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: palette.error,
  },
  retry: {
    minHeight: 48,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: palette.forest,
  },
  retryText: { fontFamily: fonts.semibold, fontSize: 14, color: palette.white },
  state: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 28,
    backgroundColor: palette.ivory,
  },
  stateTitle: {
    fontFamily: fonts.serif,
    fontSize: 22,
    lineHeight: 30,
    textAlign: "center",
    color: palette.ink,
  },
  stateBody: {
    width: "100%",
    maxWidth: 320,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
    color: palette.muted,
  },
});
