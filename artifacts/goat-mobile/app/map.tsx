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
  useEffect(() => {
    if (course) {
      setStatus("content");
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
      <State title="마지막 코스를 불러오는 중이에요">
        <ActivityIndicator color={palette.forest} />
      </State>
    );
  if (status === "error")
    return (
      <State
        title="코스를 불러오지 못했어요"
        body="저장된 코스는 그대로예요."
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
        title="아직 만든 코스가 없어요"
        body="추천 장소를 고른 뒤 여행 이어가기로 코스를 만들어보세요."
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
          <Text style={styles.eyebrow}>선택한 장소에서 이어지는 코스</Text>
          <Text style={styles.heroTitle}>
            {course.courseTitle ?? "강원 여행 코스"}
          </Text>
          <Text style={styles.heroText}>
            {course.summary ?? course.message}
          </Text>
        </View>
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
              <View style={styles.stopCopy}>
                <Text style={styles.stopTitle}>{stop.title}</Text>
                <Text style={styles.stopMeta}>
                  {stop.stayMinutes}분 체류 참고 · {stop.reason}
                </Text>
              </View>
              <Pressable
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
              </Pressable>
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="카카오맵에서 코스 보기"
            onPress={() => void openMap(course.staticMap.fallbackMapSearchUrl!)}
            style={styles.mapButton}
          >
            <BrandIcon name="location" color={palette.white} />
            <Text style={styles.mapButtonText}>카카오맵에서 전체 보기</Text>
          </Pressable>
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
  title,
  body,
  action,
  onPress,
  children,
}: {
  title: string;
  body?: string;
  action?: string;
  onPress?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.state} accessibilityLiveRegion="polite">
      <BrandIcon name="course" size={34} color={palette.forest} />
      <Text style={styles.stateTitle}>{title}</Text>
      {body ? <Text style={styles.stateBody}>{body}</Text> : null}
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
  route: { marginTop: 28 },
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
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
    color: palette.muted,
  },
});
