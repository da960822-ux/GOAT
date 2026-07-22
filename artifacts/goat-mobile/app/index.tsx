import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
  { name: "설악산 능선", image: editorialImages.hills }, { name: "속초의 노을", image: editorialImages.harbor },
  { name: "정선 산마을", image: editorialImages.village }, { name: "고성의 숲", image: editorialImages.forest },
];
type HomeApiPlace = { id: string; name: string; region: string; imageUrl: string | null };

export default function HomeScreen() {
  const router = useRouter(); const insets = useSafeAreaInsets(); const { session } = useAuth();
  const [activities, setActivities] = useState(false); const [menu, setMenu] = useState(false); const [recentCount, setRecentCount] = useState(0); const [bookmarkCount, setBookmarkCount] = useState(0); const [recentItems, setRecentItems] = useState<HomeApiPlace[]>([]); const [bookmarkItems, setBookmarkItems] = useState<HomeApiPlace[]>([]);
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then((reduced) => reduced ? fade.setValue(1) : Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: Platform.OS !== "web" }).start()); }, [fade]);
  useEffect(() => { if (!session) { setRecentCount(0); setBookmarkCount(0); setRecentItems([]); setBookmarkItems([]); return; } Promise.allSettled([getRecentRecommendations({ limit: 3 }), getBookmarks()]).then(([recent, saved]) => { if (recent.status === "fulfilled") { const items = recent.value.data.items; setRecentCount(items.length); setRecentItems(items.flatMap((item) => item.cards.slice(0, 1).map((card) => ({ id: card.placeId, name: card.name, region: card.region, imageUrl: card.imageUrl })))); } if (saved.status === "fulfilled") { const items = saved.value.data.items as Array<{ placeId?: string; name?: string; region?: string; imageUrl?: string | null }>; setBookmarkCount(items.length); setBookmarkItems(items.flatMap((item) => item.placeId && item.name ? [{ id: item.placeId, name: item.name, region: item.region ?? "강원", imageUrl: item.imageUrl ?? null }] : [])); } }); }, [session]);
  const startMood = () => router.push("/mood-selection");
  const startLocation = () => router.push({ pathname: "/travel-preference", params: { originMode: "current" } } as never);
  const startReference = () => router.push("/reference-selection" as never);
  return <View style={styles.screen}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}>
      <Animated.View style={[styles.heroZone, { opacity: fade }]}>
        <Image source={landingImage} style={StyleSheet.absoluteFillObject} contentFit="cover" contentPosition="center" accessibilityLabel="소나무 절벽 위 숙소와 잔잔한 동해 풍경"/>
        <View style={styles.haze}/>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <Pressable accessibilityLabel="메뉴" onPress={() => setMenu(true)} style={styles.headerButton}><BrandIcon name="menu" size={25}/></Pressable>
          <GoatMark/>
          <Pressable accessibilityLabel="최근 활동" onPress={() => setActivities(true)} style={styles.headerButton}><BrandIcon name="notification" size={24}/>{(recentCount + bookmarkCount) > 0 && <View style={styles.noticeDot}/>}</Pressable>
        </View>
        <View style={styles.heroCopy}>
          <View style={styles.pinRow}><BrandIcon name="location" size={17}/><Text style={styles.pinText}>강원도의 특별한 순간</Text></View>
          <Text style={styles.heroTitle}>해외여행 같은{`\n`}장면을 강원에서</Text>
          <Text style={styles.heroBody}>보고 싶은 분위기를 고르면 GOAT가{`\n`}강원 여행지 3곳을 추천해드려요.</Text>
        </View>
        <View style={styles.ctaRow}>
          <Pressable accessibilityLabel="감성으로 찾기" onPress={startMood} style={({ pressed }) => [styles.cta, styles.ctaPrimary, pressed && styles.pressed]}><BrandIcon name="mood" color={palette.white}/><Text style={styles.ctaPrimaryText}>감성으로 찾기</Text></Pressable>
          <Pressable accessibilityLabel="닮은 여행지 찾기" onPress={startReference} style={({ pressed }) => [styles.cta, styles.ctaPaper, pressed && styles.pressed]}><BrandIcon name="location"/><Text style={styles.ctaPaperText}>닮은 여행지 찾기</Text></Pressable>
        </View>
      </Animated.View>
      <View style={styles.content}>
        <SectionTitle title="최근 추천" onMore={() => session ? router.push("/recommendations" as never) : router.push({ pathname: "/login", params: { next: "/recommendations" } } as never)}/>
        <View style={styles.recentRow}>{showcasePlaces.map((place, index) => { const actual = recentItems[index]; const id = actual?.id ?? place.id; return <Pressable key={id} onPress={() => session ? router.push(`/detail/${id}`) : router.push({ pathname: "/login", params: { next: `/detail/${id}` } } as never)} style={styles.recentCard}>
          <Image source={actual?.imageUrl ? { uri: actual.imageUrl } : place.image} style={StyleSheet.absoluteFillObject} contentFit="cover" accessibilityLabel={`${actual?.name ?? place.name} 풍경`}/><View style={styles.cardShade}/><View style={styles.pill}><Text style={styles.pillText}>이국적</Text></View><View style={styles.cardBookmark}><BrandIcon name="bookmark" size={17} color={palette.white}/></View>
          <View style={styles.cardCopy}><Text numberOfLines={1} style={styles.cardName}>{actual?.name ?? place.name}</Text><Text style={styles.cardArea}>{actual?.region ?? place.area.split(" ").at(-1)}</Text><View style={styles.scoreRow}><View style={styles.scoreTrack}><View style={[styles.scoreFill, { width: `${[95,80,75][index]}%` }]}/></View><Text style={styles.score}>{[95,80,75][index]}%</Text></View></View>
        </Pressable>; })}</View>
        <SectionTitle title="저장한 곳" onMore={() => session ? router.push("/saved" as never) : router.push({ pathname: "/login", params: { next: "/saved" } } as never)}/>
        <View style={styles.savedRow}>{savedFallback.map((item, index) => { const actual = bookmarkItems[index]; return <Pressable key={actual?.id ?? item.name} accessibilityLabel={actual?.name ?? item.name} onPress={() => actual ? router.push(`/detail/${actual.id}` as never) : router.push("/saved" as never)} style={styles.saved}><Image source={actual?.imageUrl ? { uri: actual.imageUrl } : item.image} style={StyleSheet.absoluteFillObject} contentFit="cover" accessibilityLabel={`${actual?.name ?? item.name} 풍경`}/><View style={styles.savedBookmark}><BrandIcon name="bookmark" size={17} color={palette.white}/></View></Pressable>; })}</View>
      </View>
    </ScrollView>
    <AppTabBar/>
    <InfoSheet visible={activities} onClose={() => setActivities(false)} title="최근 활동"><Text style={styles.sheetText}>{session ? `최근 추천 ${recentCount}개 · 저장 ${bookmarkCount}개` : "로그인하면 최근 추천과 저장 변화를 한곳에서 확인할 수 있어요."}</Text></InfoSheet>
    <InfoSheet visible={menu} onClose={() => setMenu(false)} title="GOAT"><Pressable onPress={() => { setMenu(false); router.push("/guide"); }} style={styles.menuLink}><BrandIcon name="info"/><Text style={styles.menuText}>이용 안내</Text></Pressable><Pressable onPress={() => { setMenu(false); router.push("/data-source"); }} style={styles.menuLink}><BrandIcon name="database"/><Text style={styles.menuText}>데이터 출처</Text></Pressable></InfoSheet>
  </View>;
}

function SectionTitle({ title, onMore }: { title: string; onMore: () => void }) { return <View style={styles.sectionHead}><View style={styles.titleRow}><Text style={styles.sectionTitle}>{title}</Text><BrandIcon name="heart" size={16} color={palette.muted}/></View><Pressable onPress={onMore} hitSlop={9} style={styles.moreButton}><Text style={styles.more}>전체보기</Text><BrandIcon name="arrow-right" size={15} color={palette.muted}/></Pressable></View>; }
function InfoSheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) { return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><Pressable style={styles.backdrop} onPress={onClose}><Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}><View style={styles.sheetHead}><Text style={styles.sheetTitle}>{title}</Text><Pressable accessibilityLabel="닫기" onPress={onClose} style={styles.close}><BrandIcon name="close"/></Pressable></View>{children}</Pressable></Pressable></Modal>; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.ivory }, heroZone: { height: 428, overflow: "hidden", backgroundColor: palette.ivory }, haze: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(247,244,236,.12)" },
  header: { minHeight: 92, paddingHorizontal: 17, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, headerButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" }, noticeDot: { position: "absolute", right: 9, top: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: palette.forest },
  heroCopy: { position: "absolute", left: 20, top: 137, right: 18 }, pinRow: { flexDirection: "row", alignItems: "center", gap: 7 }, pinText: { fontFamily: fonts.medium, fontSize: 13, color: palette.ink }, heroTitle: { marginTop: 25, fontFamily: fonts.serifRegular, fontSize: 31, lineHeight: 44, letterSpacing: -1.15, color: palette.forestDeep }, heroBody: { marginTop: 17, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 23, color: "#52615D" },
  ctaRow: { position: "absolute", left: 22, right: 22, bottom: 23, flexDirection: "row", gap: 12 }, cta: { flex: 1, minHeight: 54, borderRadius: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, ctaPrimary: { backgroundColor: "#416F35", shadowColor: palette.forestDeep, shadowOpacity: .16, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } }, ctaPaper: { backgroundColor: "rgba(255,255,255,.92)", shadowColor: palette.forestDeep, shadowOpacity: .08, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } }, ctaPrimaryText: { color: palette.white, fontFamily: fonts.semibold, fontSize: 15 }, ctaPaperText: { color: palette.ink, fontFamily: fonts.semibold, fontSize: 15 }, pressed: { opacity: .84, transform: [{ scale: .985 }] },
  content: { paddingTop: 2 }, sectionHead: { paddingHorizontal: 22, marginTop: 0, marginBottom: 9, height: 30, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, titleRow: { flexDirection: "row", alignItems: "center", gap: 7 }, sectionTitle: { fontFamily: fonts.serif, fontSize: 18, color: palette.ink }, moreButton: { minHeight: 26, flexDirection: "row", alignItems: "center", gap: 1 }, more: { fontFamily: fonts.medium, fontSize: 11.5, color: palette.muted },
  recentRow: { paddingHorizontal: 22, flexDirection: "row", gap: 10 }, recentCard: { flex: 1, height: 162, borderRadius: radius.md, overflow: "hidden", backgroundColor: palette.forest }, cardShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,30,24,.25)" }, pill: { position: "absolute", left: 8, top: 9, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12, backgroundColor: "rgba(255,255,255,.22)" }, pillText: { fontFamily: fonts.medium, fontSize: 9, color: palette.white }, cardBookmark: { position: "absolute", right: 7, top: 8 }, cardCopy: { position: "absolute", left: 9, right: 8, bottom: 9 }, cardName: { fontFamily: fonts.serif, fontSize: 12.5, color: palette.white }, cardArea: { marginTop: 4, fontFamily: fonts.body, fontSize: 9, color: palette.white }, scoreRow: { marginTop: 7, flexDirection: "row", alignItems: "center", gap: 5 }, scoreTrack: { flex: 1, height: 5, borderRadius: 3, overflow: "hidden", backgroundColor: "rgba(255,255,255,.25)" }, scoreFill: { height: 5, borderRadius: 3, backgroundColor: "#96C457" }, score: { fontFamily: fonts.semibold, fontSize: 9, color: palette.white },
  savedRow: { paddingHorizontal: 22, flexDirection: "row", gap: 9 }, saved: { flex: 1, aspectRatio: .95, borderRadius: 12, overflow: "hidden", backgroundColor: palette.sage }, savedBookmark: { position: "absolute", right: 7, top: 7, width: 25, height: 25, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(14,38,32,.32)" },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(9,30,25,.45)" }, sheet: { backgroundColor: palette.paper, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22, paddingBottom: 40 }, sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }, sheetTitle: { fontFamily: fonts.serif, fontSize: 22, color: palette.ink }, close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" }, sheetText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 22, color: palette.muted }, menuLink: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: palette.line }, menuText: { fontFamily: fonts.medium, fontSize: 15, color: palette.ink },
});
