import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppTabBar } from "@/src/components/AppTabBar";
import { BrandIcon } from "@/src/components/BrandIcon";
import { Header } from "@/src/components/Header";
import { useApp } from "@/src/context/AppContext";
import { fonts, palette, radius } from "@/src/theme/editorial";

export default function MapScreen() {
  const insets = useSafeAreaInsets(); const { course, recommendationSession } = useApp(); const cards = recommendationSession?.cards ?? [];
  const stops = course?.stops ?? cards.map((card, index) => ({ order: index + 1, id: card.placeId, title: card.name, stayMinutes: 60, reason: card.reason }));
  return <View style={styles.screen}><Header title="여행 지도" />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: 108 + insets.bottom }]}>
      <View style={styles.hero}><View style={styles.mapGlyph}><BrandIcon name="map" size={33} color={palette.forest} /></View><Text style={styles.eyebrow}>오늘의 여행 동선</Text><Text style={styles.heroTitle}>{course?.courseTitle ?? "선택한 장소를 지도에서 확인하세요"}</Text><Text style={styles.heroText}>{course?.summary ?? "하루 코스를 만들면 이동 순서와 체류 시간을 여기서 확인할 수 있어요."}</Text></View>
      {stops.length > 0 && <View style={styles.route}><Text style={styles.routeTitle}>여행 순서</Text>{stops.map((stop, index) => <View key={stop.id} style={styles.stop}><View style={styles.rail}>{index < stops.length - 1 && <View style={styles.line} />}<View style={styles.order}><Text style={styles.orderText}>{stop.order}</Text></View></View><View style={styles.stopCopy}><Text style={styles.stopTitle}>{stop.title}</Text><Text style={styles.stopMeta}>{stop.stayMinutes}분 체류 · {stop.reason}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`${stop.title} 카카오맵 열기`} onPress={() => Linking.openURL(`https://map.kakao.com/link/search/${encodeURIComponent(stop.title)}`)} style={styles.open}><BrandIcon name="external" size={18} color={palette.forest} /></Pressable></View>)}</View>}
      {course?.staticMap.fallbackMapSearchUrl && <Pressable accessibilityRole="button" onPress={() => Linking.openURL(course.staticMap.fallbackMapSearchUrl!)} style={styles.mapButton}><BrandIcon name="location" color={palette.white} /><Text style={styles.mapButtonText}>카카오맵에서 전체 보기</Text></Pressable>}
    </ScrollView><AppTabBar />
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.ivory }, content: { padding: 20 }, hero: { minHeight: 246, padding: 24, borderRadius: radius.lg, justifyContent: "flex-end", backgroundColor: palette.sage }, mapGlyph: { position: "absolute", top: 24, right: 24, width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center", backgroundColor: palette.paper }, eyebrow: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.5, color: palette.forestSoft }, heroTitle: { marginTop: 10, paddingRight: 38, fontFamily: fonts.serif, fontSize: 23, lineHeight: 33, color: palette.ink }, heroText: { marginTop: 9, fontFamily: fonts.body, fontSize: 13, lineHeight: 20, color: palette.muted }, route: { marginTop: 28 }, routeTitle: { marginBottom: 12, fontFamily: fonts.serif, fontSize: 19, color: palette.ink }, stop: { minHeight: 82, flexDirection: "row", alignItems: "center" }, rail: { width: 46, alignSelf: "stretch", alignItems: "center", justifyContent: "center" }, line: { position: "absolute", top: "50%", bottom: -1, width: 1, backgroundColor: palette.line }, order: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: palette.forest }, orderText: { fontFamily: fonts.bold, fontSize: 12, color: palette.white }, stopCopy: { flex: 1, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: palette.line }, stopTitle: { fontFamily: fonts.semibold, fontSize: 16, color: palette.ink }, stopMeta: { marginTop: 5, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: palette.muted }, open: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: palette.paper }, mapButton: { minHeight: 56, marginTop: 24, borderRadius: radius.pill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: palette.forest }, mapButtonText: { fontFamily: fonts.semibold, fontSize: 15, color: palette.white },
});
