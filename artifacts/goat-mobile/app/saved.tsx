import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getPhotoCachePolicy, getPlace, getPlacePhotos, type Place } from "@workspace/api-client-react";
import { AppTabBar } from "@/src/components/AppTabBar";
import { BrandIcon } from "@/src/components/BrandIcon";
import { Header } from "@/src/components/Header";
import { localSceneStore } from "@/src/services/deviceSceneStore";
import type { SavedScene } from "@/src/services/localSceneStore";
import { fonts, palette, radius } from "@/src/theme/editorial";

type SceneRow = SavedScene & { place: Place | null; photoUri: string | null; photoAttribution: string | null; photoCacheEnabled: boolean };

export default function SavedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<SceneRow[]>([]);
  const [state, setState] = useState<"loading" | "content" | "error">("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const scenes = await localSceneStore.getScenes();
      const rows = await Promise.all(scenes.map(async (scene) => {
        const [placeResult, photoResult] = await Promise.allSettled([
          getPlace(scene.placeId),
          getPlacePhotos({ placeId: scene.placeId, selectionId: scene.selectionId }),
        ]);
        const place = placeResult.status === "fulfilled" ? placeResult.value.data.place : null;
        const photo = photoResult.status === "fulfilled"
          ? photoResult.value.data.placeHero ?? photoResult.value.data.evidenceImages[0] ?? null
          : null;
        return { ...scene, place, photoUri: photo?.url ?? null, photoAttribution: photo?.attribution.label ?? null, photoCacheEnabled: photo?.cacheEnabled ?? false };
      }));
      setItems(rows);
      setState("content");
    } catch {
      setState("error");
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const removeConfirmed = async (item: SceneRow) => {
    try {
      await localSceneStore.removeScene(item.placeId);
      setItems((previous) => previous.filter((value) => value.placeId !== item.placeId));
    } catch {
      Alert.alert("삭제하지 못했어요", "잠시 후 다시 시도해 주세요.");
    }
  };
  const remove = (item: SceneRow) => {
    if (Platform.OS === "web") {
      if (globalThis.confirm("내 장면에서 뺄까요?\n이 기기에 저장한 항목이 삭제돼요.")) void removeConfirmed(item);
      return;
    }
    Alert.alert("내 장면에서 뺄까요?", "이 기기에 저장한 항목이 삭제돼요.", [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: () => void removeConfirmed(item) },
    ]);
  };

  return <View style={styles.screen}>
    <Header title="내 장면" />
    <Text style={styles.storageNotice}>로그인 없이 이 기기에만 저장돼요.</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="마지막 여행 코스 보기" onPress={() => router.push("/map")} style={styles.courseEntry}><BrandIcon name="course" size={19} color={palette.forest} /><Text style={styles.courseEntryText}>마지막 여행 코스 보기</Text><BrandIcon name="arrow-right" size={17} color={palette.forest} /></Pressable>
    {state === "loading" ? <State icon="bookmark" title="저장한 장면을 불러오는 중이에요"><ActivityIndicator color={palette.forest} /></State>
      : state === "error" ? <State icon="warning" title="내 장면을 불러오지 못했어요" body="저장된 항목은 그대로예요. 다시 시도해 주세요." action="다시 시도" onPress={load} />
      : items.length === 0 ? <State icon="bookmark" title="아직 담은 장면이 없어요" body="추천 카드에서 마음에 드는 곳을 담아보세요." action="장면 발견하기" onPress={() => router.replace("/")} />
      : <FlatList
          data={items}
          keyExtractor={(item) => item.placeId}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110 + insets.bottom, gap: 12 }}
          renderItem={({ item }) => {
            const name = item.place?.place_name ?? "장소 정보를 확인할 수 없어요";
            const region = item.place?.city ?? "저장된 장면";
            const sourceLabel = item.photoAttribution ? ` 사진 출처 ${item.photoAttribution}.` : "";
            return <View style={styles.row}><Pressable accessibilityRole="button" accessibilityLabel={`${name} 상세 보기.${sourceLabel}`} onPress={() => router.push({ pathname: "/detail/[id]", params: { id: item.placeId, selectionId: item.selectionId } })} style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}><View style={styles.thumbnail}>{item.photoUri ? <Image source={{ uri: item.photoUri }} style={StyleSheet.absoluteFillObject} contentFit="cover" cachePolicy={getPhotoCachePolicy({ cacheEnabled: item.photoCacheEnabled })} accessible={false} importantForAccessibility="no-hide-descendants" /> : <BrandIcon name="location" size={24} color={palette.forest} />}</View><View style={styles.copy}><Text lineBreakStrategyIOS="hangul-word" textBreakStrategy="balanced" android_hyphenationFrequency="none" style={styles.name}>{name}</Text><Text style={styles.region}>{region}</Text>{item.photoAttribution ? <Text numberOfLines={1} style={styles.photoSource}>사진 출처 · {item.photoAttribution}</Text> : null}{item.note ? <Text numberOfLines={2} style={styles.note}>{item.note}</Text> : null}<Text style={styles.date}>{formatDate(item.savedAt)}</Text></View></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`${name} 삭제`} onPress={() => remove(item)} style={styles.remove}><BrandIcon name="delete" size={19} color={palette.error} /></Pressable></View>;
          }}
        />}
    <AppTabBar />
  </View>;
}

function State({ icon, title, body, action, onPress, children }: { icon: "bookmark" | "warning"; title: string; body?: string; action?: string; onPress?: () => void; children?: React.ReactNode }) {
  return <View style={styles.state} accessibilityLiveRegion="polite"><View style={styles.stateIcon}><BrandIcon name={icon} size={28} color={palette.forest} /></View><Text style={styles.stateTitle}>{title}</Text>{body ? <Text style={styles.stateBody}>{body}</Text> : null}{children}{action && onPress ? <Pressable accessibilityRole="button" onPress={onPress} style={styles.stateAction}><Text style={styles.stateActionText}>{action}</Text></Pressable> : null}</View>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(new Date(value));
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.ivory },
  storageNotice: { paddingHorizontal: 20, paddingBottom: 16, fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: palette.muted },
  courseEntry: { minHeight: 48, marginHorizontal: 20, marginBottom: 12, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 9, borderRadius: radius.md, backgroundColor: palette.sage },
  courseEntryText: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: palette.forest },
  row: { minHeight: 104, padding: 12, flexDirection: "row", alignItems: "center", gap: 4, borderRadius: radius.md, backgroundColor: palette.paper, borderWidth: StyleSheet.hairlineWidth, borderColor: palette.line },
  rowMain: { minHeight: 80, flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  pressed: { opacity: 0.75 },
  thumbnail: { width: 76, height: 76, overflow: "hidden", alignItems: "center", justifyContent: "center", borderRadius: radius.sm, backgroundColor: palette.sage },
  copy: { flex: 1, gap: 3 },
  name: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 24, color: palette.ink },
  region: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, color: palette.forestSoft },
  photoSource: { fontFamily: fonts.body, fontSize: 11, lineHeight: 16, color: palette.muted },
  note: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: palette.ink },
  date: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: palette.muted },
  remove: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  state: { flex: 1, paddingHorizontal: 28, paddingBottom: 100, alignItems: "center", justifyContent: "center", gap: 10 },
  stateIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: palette.sage },
  stateTitle: { fontFamily: fonts.serif, fontSize: 21, lineHeight: 29, textAlign: "center", color: palette.ink },
  stateBody: { maxWidth: 300, fontFamily: fonts.body, fontSize: 15, lineHeight: 23, textAlign: "center", color: palette.muted },
  stateAction: { minHeight: 48, marginTop: 8, paddingHorizontal: 20, borderRadius: radius.md, justifyContent: "center", backgroundColor: palette.forest },
  stateActionText: { fontFamily: fonts.semibold, fontSize: 15, color: palette.white },
});
