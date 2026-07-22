import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { deleteBookmark, getBookmarks } from "@workspace/api-client-react";
import { AppTabBar } from "@/src/components/AppTabBar";
import { BrandIcon } from "@/src/components/BrandIcon";
import { Header } from "@/src/components/Header";
import { fonts, palette, radius } from "@/src/theme/editorial";

type BookmarkItem = { placeId?: string; place_id?: string; placeName?: string; place_name_at_save?: string; region?: string; region_at_save?: string };

export default function SavedScreen() {
  const router = useRouter(); const insets = useSafeAreaInsets(); const [items, setItems] = useState<BookmarkItem[]>([]);
  const load = useCallback(() => { getBookmarks().then((response) => setItems(response.data.items as BookmarkItem[])).catch(() => setItems([])); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return <View style={styles.screen}><Header title="저장한 곳" />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: 108 + insets.bottom }]}>
      <Text style={styles.eyebrow}>MY PLACES · {items.length}</Text>
      {items.length === 0 ? <View style={styles.empty}><View style={styles.emptyIcon}><BrandIcon name="bookmark" size={28} color={palette.forest} /></View><Text style={styles.emptyTitle}>저장한 장소가 없어요</Text><Text style={styles.emptyText}>추천 결과에서 마음에 드는 장소를 저장해 보세요.</Text></View> : <View style={styles.list}>{items.map((item) => {
        const id = item.placeId ?? item.place_id ?? ""; const name = item.placeName ?? item.place_name_at_save ?? id; const region = item.region ?? item.region_at_save ?? "강원";
        return <Pressable key={id} accessibilityRole="button" accessibilityLabel={`${name} 상세 보기`} onPress={() => router.push(`/detail/${id}` as never)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}><View style={styles.mark}><BrandIcon name="location" size={20} color={palette.forest} /></View><View style={styles.copy}><Text style={styles.name}>{name}</Text><Text style={styles.region}>{region}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`${name} 저장 해제`} hitSlop={4} onPress={async (event) => { event.stopPropagation(); await deleteBookmark(id); setItems((previous) => previous.filter((value) => (value.placeId ?? value.place_id) !== id)); }} style={styles.remove}><BrandIcon name="bookmark" size={20} color={palette.forest} filled /></Pressable></Pressable>;
      })}</View>}
    </ScrollView><AppTabBar />
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.ivory }, content: { paddingHorizontal: 20, paddingTop: 20 }, eyebrow: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.5, color: palette.forestSoft }, list: { marginTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderColor: palette.line }, row: { minHeight: 88, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: palette.line }, mark: { width: 48, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: palette.sage }, copy: { flex: 1 }, name: { fontFamily: fonts.serif, fontSize: 17, color: palette.ink }, region: { marginTop: 5, fontFamily: fonts.body, fontSize: 12, color: palette.muted }, remove: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: palette.paper, borderWidth: StyleSheet.hairlineWidth, borderColor: palette.line }, empty: { paddingTop: 110, alignItems: "center" }, emptyIcon: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center", backgroundColor: palette.sage }, emptyTitle: { marginTop: 18, fontFamily: fonts.serif, fontSize: 21, color: palette.ink }, emptyText: { marginTop: 8, fontFamily: fonts.body, fontSize: 14, lineHeight: 21, textAlign: "center", color: palette.muted }, pressed: { opacity: 0.72 },
});
