import React, { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Linking,
  Platform,
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
import { API_BASE_URL, resolveApiUrl } from "@/src/config/api";
import { fonts, palette, radius } from "@/src/theme/editorial";
import { MotionPressable } from "@/src/components/MotionPressable";
import { WebView } from "react-native-webview";

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
                ? "AI 코스 큐레이터"
                : "검증된 기본 코스"}
            </Text>
          </View>
          <Text style={styles.heroTitle}>
            {course.courseTitle ?? "강원 여행 코스"}
          </Text>
          <Text style={styles.heroText}>
            {course.summary ?? course.message}
          </Text>
        </View>
        <CourseMap course={course} />
        <View style={styles.mapCaption}>
          <View style={styles.mapCaptionHead}><BrandIcon name="map" size={15} color={palette.forest} /><Text style={styles.mapCaptionTitle}>방문 순서 지도</Text></View>
          <Text style={styles.mapCaptionBody}>번호는 방문 순서예요. 선은 실제 길찾기 경로가 아니라 장소를 연결한 표시예요.</Text>
        </View>
        {(() => { const selected = course.stops.find((stop) => stop.id === selectedStopId) ?? course.stops[0]; return selected ? <View style={styles.selectedPanel}><Text style={styles.selectedEyebrow}>지금 확인하는 장소</Text><Text style={styles.selectedTitle}>{selected.title}</Text><Text style={styles.selectedBody}>{selected.reason}</Text><MotionPressable accessibilityRole="button" accessibilityLabel={`${selected.title} 카카오맵에서 보기`} onPress={() => void openMap(`https://map.kakao.com/link/search/${encodeURIComponent(selected.title)}`)} style={styles.selectedAction}><Text style={styles.selectedActionText}>카카오맵에서 열기</Text><BrandIcon name="external" size={15} color={palette.white} /></MotionPressable></View> : null; })()}
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
                <Text style={styles.stopTitle}>{stop.title}</Text>
                <Text style={styles.stopMeta}>
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

/** Inline Kakao map restored from the original course experience. Web uses the
 * SDK when available and falls back to the server-rendered map endpoint; native
 * keeps the explicit Kakao Maps action below as the supported map surface. */
function CourseMap({ course }: { course: NonNullable<ReturnType<typeof useApp>["course"]> }) {
  const config = course.staticMap.staticMapConfig as {
    center?: { lat?: number; lng?: number };
    level?: number;
    sdkScriptUrl?: string;
    markers?: Array<{ order?: number; title?: string; lat?: number; lng?: number }>;
  } | undefined;
  const center = config?.center;
  const markers = Array.isArray(config?.markers) ? config.markers : [];
  const validMarkers = markers.filter((marker) => Number.isFinite(Number(marker.lat)) && Number.isFinite(Number(marker.lng)));
  const containerId = `goat-course-map-${course.stops.map((stop) => stop.id).join("-").replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const fallbackUrl = center && validMarkers.length > 0
    ? resolveApiUrl(`/api/course-map?${new URLSearchParams({
        centerLat: String(center.lat),
        centerLng: String(center.lng),
        level: String(config?.level ?? 7),
        markers: JSON.stringify(validMarkers.map((marker) => ({ order: marker.order, title: marker.title, lat: marker.lat, lng: marker.lng }))),
      }).toString()}`)
    : null;
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web" || !center || validMarkers.length === 0) return;
    setMapReady(false);
    const win = globalThis as any;
    const doc = win.document as Document | undefined;
    if (!doc) return;
    let cancelled = false;
    const timeout = setTimeout(() => { if (!cancelled) setMapError("카카오 지도가 늦어 대체 지도를 표시해요."); }, 8000);
    const fail = (message: string) => { if (!cancelled) { clearTimeout(timeout); setMapError(message); } };
    const render = () => {
      const container = doc.getElementById(containerId);
      const kakao = win.kakao;
      if (!container || !kakao?.maps) return fail("카카오 지도를 불러오지 못했어요.");
      const lat = Number(center.lat); const lng = Number(center.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return fail("지도 중심 좌표가 올바르지 않아요.");
      container.innerHTML = "";
      const map = new kakao.maps.Map(container, { center: new kakao.maps.LatLng(lat, lng), level: Number(config?.level ?? 7) });
      const bounds = new kakao.maps.LatLngBounds(); const path: unknown[] = [];
      validMarkers.forEach((marker) => {
        const position = new kakao.maps.LatLng(Number(marker.lat), Number(marker.lng));
        bounds.extend(position); path.push(position);
        new kakao.maps.Marker({ map, position, title: String(marker.title ?? "") });
        new kakao.maps.CustomOverlay({ map, position, yAnchor: 1.55, content: `<div style="min-width:22px;height:22px;border-radius:999px;background:#0ea5e9;color:#fff;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">${marker.order ?? ""}</div>` });
      });
      if (path.length > 1) {
        new kakao.maps.Polyline({ map, path, strokeWeight: 4, strokeColor: "#0EA5E9", strokeOpacity: 0.85 });
        map.setBounds(bounds);
      }
      clearTimeout(timeout); if (!cancelled) { setMapError(null); setMapReady(true); }
    };
    const ready = () => win.kakao?.maps?.load ? win.kakao.maps.load(render) : render();
    if (win.kakao?.maps) ready();
    else if (config?.sdkScriptUrl) {
      const scriptId = "goat-kakao-map-sdk"; let script = doc.getElementById(scriptId) as HTMLScriptElement | null;
      if (!script) { script = doc.createElement("script"); script.id = scriptId; script.async = true; script.src = `${config.sdkScriptUrl}${config.sdkScriptUrl.includes("?") ? "&" : "?"}autoload=false`; script.onerror = () => fail("카카오 지도를 불러오지 못했어요."); doc.head.appendChild(script); }
      script.addEventListener("load", ready, { once: true });
    } else fail("카카오 지도 설정이 없어요.");
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [center?.lat, center?.lng, config?.level, config?.sdkScriptUrl, containerId, validMarkers.length]);

  if (!center || validMarkers.length === 0) return null;
  if (Platform.OS !== "web" && !API_BASE_URL) {
    return <View style={styles.mapFallback}><Text style={styles.mapFallbackText}>지도 서버 주소가 없어 카카오맵에서 확인할 수 있어요.</Text></View>;
  }
  if (Platform.OS !== "web") {
    return (
      <View style={styles.inlineMap} accessibilityLabel="코스 방문 순서 지도">
        <WebView
          source={{ uri: fallbackUrl! }}
          originWhitelist={["https://*"]}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="never"
          setSupportMultipleWindows={false}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.mapLoading}>
              <ActivityIndicator color={palette.forest} />
              <Text style={styles.mapLoadingText}>코스 지도를 불러오는 중이에요</Text>
            </View>
          )}
          onError={() => setMapError("코스 지도를 불러오지 못했어요.")}
          onHttpError={() => setMapError("코스 지도 서버에 연결하지 못했어요.")}
          accessibilityLabel="카카오 코스 지도. 번호는 방문 순서이며 선은 실제 길찾기 경로가 아닌 방문 순서 연결선입니다."
          style={styles.nativeMap}
        />
        {mapError ? <Text accessibilityLiveRegion="assertive" style={styles.mapError}>{mapError}</Text> : null}
      </View>
    );
  }
    return <View style={styles.inlineMap}>
    {mapError && fallbackUrl ? React.createElement("iframe", { src: fallbackUrl, title: "GOAT 코스 지도", style: { width: "100%", height: 220, border: 0, background: "#E5E7EB" } }) : React.createElement("div", { id: containerId, style: { width: "100%", height: 220, background: "#E5E7EB" } })}
    {!mapReady && !mapError ? <View style={styles.webMapLoading}><ActivityIndicator color={palette.forest} /><Text style={styles.mapLoadingText}>코스 지도를 불러오는 중이에요</Text></View> : null}
    {mapError ? <View style={styles.webMapError}><BrandIcon name="warning" size={15} color={palette.error} /><Text style={styles.mapError}>{mapError}{fallbackUrl ? " 대체 지도를 보여드려요." : " 카카오맵에서 장소를 확인해 주세요."}</Text></View> : null}
  </View>;
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
  inlineMap: { marginTop: 18, borderRadius: radius.lg, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderColor: palette.line, backgroundColor: "#E5E7EB" },
  nativeMap: { minHeight: 220, backgroundColor: "#E5E7EB" },
  mapLoading: { minHeight: 220, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: palette.paper },
  webMapLoading: { position: "absolute", left: 0, right: 0, top: 0, height: 220, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "rgba(246,242,233,.86)" },
  webMapError: { position: "absolute", left: 10, right: 10, bottom: 10, paddingHorizontal: 10, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 5, borderRadius: radius.sm, backgroundColor: "rgba(255,252,246,.94)" },
  mapLoadingText: { fontFamily: fonts.body, fontSize: 12, color: palette.muted },
  mapFallback: { marginTop: 18, padding: 14, borderRadius: radius.md, backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line },
  mapFallbackText: { fontFamily: fonts.body, fontSize: 13, color: palette.muted, textAlign: "center" },
  mapError: { padding: 10, fontFamily: fonts.body, fontSize: 12, color: palette.muted },
  mapCaption: { marginTop: 10, paddingHorizontal: 2 },
  mapCaptionHead: { flexDirection: "row", alignItems: "center", gap: 7 },
  mapCaptionTitle: { fontFamily: fonts.semibold, fontSize: 13, color: palette.ink },
  mapCaptionBody: { marginTop: 4, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: palette.muted },
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
