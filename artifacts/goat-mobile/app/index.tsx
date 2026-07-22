import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { AccessibilityInfo, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getBookmarks, getRecentRecommendations } from "@workspace/api-client-react";
import { AppTabBar } from "@/src/components/AppTabBar";
import { BrandIcon } from "@/src/components/BrandIcon";
import { GoatMark } from "@/src/components/editorial/Brand";
import { useAuth } from "@/src/context/AuthContext";
import { editorialImages, showcasePlaces } from "@/src/data/editorialContent";
import { fonts, palette, radius } from "@/src/theme/editorial";

const landingImage = require("@/assets/images/editorial/landing-coast.png");
const savedFallback = [
  { name: "대관령 능선", image: editorialImages.hills }, { name: "속초 항구", image: editorialImages.harbor },
  { name: "정선 골목", image: editorialImages.village }, { name: "고성 숲길", image: editorialImages.forest },
];
type HomeApiPlace = { id: string; name: string; region: string; imageUrl: string | null };

export default function HomeScreen() {
  const router = useRouter(); const insets = useSafeAreaInsets(); const { session } = useAuth();
  const [activities, setActivities] = useState(false); const [menu, setMenu] = useState(false); const [reducedMotion, setReducedMotion] = useState(false);
  const [recentCount, setRecentCount] = useState(0); const [bookmarkCount, setBookmarkCount] = useState(0);
  const [recentItems, setRecentItems] = useState<HomeApiPlace[]>([]); const [bookmarkItems, setBookmarkItems] = useState<HomeApiPlace[]>([]);
  useEffect(() => {
    if (!session) { setRecentCount(0); setBookmarkCount(0); setRecentItems([]); setBookmarkItems([]); return; }
    Promise.allSettled([getRecentRecommendations({ limit: 3 }), getBookmarks()]).then(([recent, saved]) => {
      if (recent.status === "fulfilled") { const items = recent.value.data.items; setRecentCount(items.length); setRecentItems(items.flatMap((item) => item.cards.slice(0, 1).map((card) => ({ id: card.placeId, name: card.name, region: card.region, imageUrl: card.imageUrl })))); }
      if (saved.status === "fulfilled") { const items = saved.value.data.items as Array<{ placeId?: string; name?: string; region?: string; imageUrl?: string | null }>; setBookmarkCount(items.length); setBookmarkItems(items.flatMap((item) => item.placeId && item.name ? [{ id: item.placeId, name: item.name, region: item.region ?? "강원", imageUrl: item.imageUrl ?? null }] : [])); }
    });
  }, [session]);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion); }, []);
  const toAuthRoute = (next: string) => session ? router.push(next as never) : router.push({ pathname: "/login", params: { next } } as never);
  return <View style={styles.screen}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 92 + insets.bottom }}>
      <View style={styles.hero}>
        <Image source={landingImage} style={StyleSheet.absoluteFillObject} contentFit="cover" contentPosition="center" accessibilityLabel="소나무 숲과 해안이 이어지는 강원도 풍경" />
        <View style={styles.haze} />
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 18) }]}><Pressable accessibilityRole="button" accessibilityLabel="메뉴" onPress={() => setMenu(true)} style={styles.headerButton}><BrandIcon name="menu" size={25} /></Pressable><GoatMark /><Pressable accessibilityRole="button" accessibilityLabel="최근 활동" onPress={() => setActivities(true)} style={styles.headerButton}><BrandIcon name="notification" size={24} />{recentCount + bookmarkCount > 0 && <View style={styles.noticeDot} />}</Pressable></View>
        <View style={styles.heroCopy}><View style={styles.pin}><BrandIcon name="location" size={17} /><Text style={styles.pinText}>강원도의 특별한 순간</Text></View><Text style={styles.heroTitle}>해외여행 같은{`\n`}장면을 강원에서</Text><Text style={styles.heroBody}>보고 싶은 분위기를 고르면 GOAT가{`\n`}강원 여행지 3곳을 추천해드려요.</Text></View>
        <View style={styles.heroActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="감성으로 강원 여행지 고르기" onPress={() => router.push("/mood-selection")} style={({ pressed }) => [styles.action, styles.primaryAction, pressed && styles.pressed]}><BrandIcon name="mood" color={palette.white} /><Text style={styles.primaryActionText}>감성으로 고르기</Text><BrandIcon name="arrow-right" color={palette.white} size={18} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="닮은 여행지 찾기" onPress={() => router.push("/reference-selection")} style={({ pressed }) => [styles.action, styles.secondaryAction, pressed && styles.pressed]}><BrandIcon name="image" color={palette.forest} /><Text style={styles.secondaryActionText}>닮은 여행지 찾기</Text><BrandIcon name="arrow-right" color={palette.forest} size={18} /></Pressable>
        </View>
      </View>
      <View style={styles.content}><SectionTitle title="최근 추천" onPress={() => toAuthRoute("/recommendations")} /><View style={styles.recentRow}>{showcasePlaces.map((place, index) => { const item = recentItems[index]; const id = item?.id ?? place.id; return <Pressable key={id} accessibilityRole="button" accessibilityLabel={`${item?.name ?? place.name} 상세 보기`} onPress={() => toAuthRoute(`/detail/${id}`)} style={[styles.recentCard, index === 0 && styles.recentCardLead]}><Image source={item?.imageUrl ? { uri: item.imageUrl } : place.image} style={StyleSheet.absoluteFillObject} contentFit="cover" /><View style={styles.cardShade} /><View style={styles.pill}><Text style={styles.pillText}>{index === 0 ? "오늘의 장면" : "함께 보기"}</Text></View><View style={styles.cardCopy}><Text numberOfLines={1} style={styles.cardName}>{item?.name ?? place.name}</Text><Text style={styles.cardArea}>{item?.region ?? place.area.split(" ").at(-1)}</Text></View></Pressable>; })}</View>
      <SectionTitle title="저장한 곳" onPress={() => toAuthRoute("/saved")} /><View style={styles.savedRow}>{savedFallback.map((fallback, index) => { const item = bookmarkItems[index]; return <Pressable key={item?.id ?? fallback.name} accessibilityRole="button" accessibilityLabel={`${item?.name ?? fallback.name} 상세 보기`} onPress={() => item ? router.push(`/detail/${item.id}` as never) : toAuthRoute("/saved")} style={styles.savedCard}><Image source={item?.imageUrl ? { uri: item.imageUrl } : fallback.image} style={StyleSheet.absoluteFillObject} contentFit="cover" /><View style={styles.savedBookmark}><BrandIcon name="bookmark" size={16} color={palette.white} /></View></Pressable>; })}</View></View>
    </ScrollView>
    <AppTabBar />
    <InfoSheet visible={activities} onClose={() => setActivities(false)} title="최근 활동"><Text style={styles.sheetText}>{session ? `최근 추천 ${recentCount}개 · 저장 ${bookmarkCount}개` : "로그인하면 최근 추천과 저장한 장소를 한 곳에서 확인할 수 있어요."}</Text></InfoSheet>
    <InfoSheet visible={menu} onClose={() => setMenu(false)} title="GOAT"><MenuItem icon="info" label="이용 안내" onPress={() => { setMenu(false); router.push("/guide"); }} /><MenuItem icon="database" label="데이터 출처" onPress={() => { setMenu(false); router.push("/data-source"); }} /></InfoSheet>
  </View>;
}

function SectionTitle({ title, onPress }: { title: string; onPress: () => void }) { return <View style={styles.sectionHead}><View style={styles.titleRow}><Text style={styles.sectionTitle}>{title}</Text><BrandIcon name="heart" size={16} color={palette.muted} /></View><Pressable accessibilityRole="button" accessibilityLabel={`${title} 전체 보기`} onPress={onPress} style={styles.moreButton}><Text style={styles.more}>전체보기</Text><BrandIcon name="arrow-right" size={15} color={palette.muted} /></Pressable></View>; }
function MenuItem({ icon, label, onPress }: { icon: "info" | "database"; label: string; onPress: () => void }) { return <Pressable accessibilityRole="button" onPress={onPress} style={styles.menuItem}><BrandIcon name={icon} /><Text style={styles.menuText}>{label}</Text></Pressable>; }
function InfoSheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) { return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><Pressable style={styles.backdrop} onPress={onClose}><Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}><View style={styles.sheetHead}><Text style={styles.sheetTitle}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} style={styles.close}><BrandIcon name="close" /></Pressable></View>{children}</Pressable></Pressable></Modal>; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.ivory }, hero: { height: 492, overflow: "hidden", backgroundColor: palette.ivory }, haze: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(246,242,233,.2)" }, header: { minHeight: 92, paddingHorizontal: 17, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, headerButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" }, noticeDot: { position: "absolute", top: 8, right: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: palette.forest },
  heroCopy: { position: "absolute", top: 136, left: 22, right: 20 }, pin: { flexDirection: "row", gap: 7, alignItems: "center" }, pinText: { fontFamily: fonts.medium, fontSize: 13, color: palette.ink }, heroTitle: { marginTop: 20, fontFamily: fonts.serifRegular, fontSize: 32, lineHeight: 44, letterSpacing: -1.2, color: palette.forestDeep }, heroBody: { marginTop: 10, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 22, color: "#52615D" }, heroActions: { position: "absolute", left: 22, right: 22, bottom: 20, gap: 9 }, action: { minHeight: 53, borderRadius: 13, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center" }, primaryAction: { backgroundColor: palette.forest }, primaryActionText: { fontFamily: fonts.semibold, fontSize: 15, color: palette.white }, secondaryAction: { backgroundColor: "rgba(255,252,246,.9)", borderWidth: 1, borderColor: "rgba(23,63,54,.32)" }, secondaryActionText: { fontFamily: fonts.semibold, fontSize: 15, color: palette.forest }, pressed: { opacity: .86, transform: [{ scale: .99 }] },
  content: { paddingTop: 8 }, sectionHead: { height: 37, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, titleRow: { flexDirection: "row", alignItems: "center", gap: 7 }, sectionTitle: { fontFamily: fonts.serif, fontSize: 18, color: palette.ink }, moreButton: { minHeight: 40, flexDirection: "row", alignItems: "center" }, more: { fontFamily: fonts.medium, fontSize: 11.5, color: palette.muted }, recentRow: { paddingHorizontal: 22, flexDirection: "row", flexWrap: "wrap", gap: 10 }, recentCard: { width: "48.5%", height: 132, borderRadius: radius.sm, overflow: "hidden", backgroundColor: palette.forest }, recentCardLead: { width: "100%", height: 198 }, cardShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,30,24,.27)" }, pill: { position: "absolute", top: 11, left: 11, paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,.23)" }, pillText: { fontFamily: fonts.medium, fontSize: 9, color: palette.white }, cardCopy: { position: "absolute", left: 12, right: 10, bottom: 12 }, cardName: { fontFamily: fonts.serif, fontSize: 15, color: palette.white }, cardArea: { marginTop: 4, fontFamily: fonts.body, fontSize: 10, color: palette.white }, savedRow: { paddingHorizontal: 22, flexDirection: "row", gap: 9 }, savedCard: { flex: 1, aspectRatio: .95, borderRadius: radius.sm, overflow: "hidden", backgroundColor: palette.sage }, savedBookmark: { position: "absolute", top: 7, right: 7, width: 25, height: 25, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(14,38,32,.34)" },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(9,30,25,.45)" }, sheet: { padding: 22, paddingBottom: 40, backgroundColor: palette.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22 }, sheetHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }, sheetTitle: { fontFamily: fonts.serif, fontSize: 22, color: palette.ink }, close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" }, sheetText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 22, color: palette.muted }, menuItem: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: palette.line }, menuText: { fontFamily: fonts.medium, fontSize: 15, color: palette.ink },
});
