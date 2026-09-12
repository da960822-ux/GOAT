import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getPublicSelections, type PublicSelection } from "@workspace/api-client-react";
import { AppTabBar } from "@/src/components/AppTabBar";
import { BrandIcon } from "@/src/components/BrandIcon";
import { SceneCoverCard } from "@/src/components/discovery";
import { GoatMark } from "@/src/components/editorial/Brand";
import { useApp } from "@/src/context/AppContext";
import { localSceneStore } from "@/src/services/deviceSceneStore";
import { requestPublicRecommendation } from "@/src/services/publicDiscovery";
import { fonts, palette, radius } from "@/src/theme/editorial";

export default function DiscoveryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setPublicSelection, setPublicRecommendation } = useApp();
  const [selections, setSelections] = useState<PublicSelection[]>([]);
  const [state, setState] = useState<"loading" | "content" | "error">("loading");
  const [expanded, setExpanded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const visibleSelections = useMemo(() => expanded ? selections : selections.slice(0, 6), [expanded, selections]);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const response = await getPublicSelections();
      setSelections(response.data.selections);
      setState("content");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const choose = async (selection: PublicSelection) => {
    if (selection.availability !== "AVAILABLE") {
      Alert.alert("이 장면은 아직 준비 중이에요", "다른 장면을 골라주세요.");
      return;
    }
    setBusyId(selection.selectionId);
    try {
      const recommendation = await requestPublicRecommendation({ selectionId: selection.selectionId, mode: "SCENE" });
      if (recommendation.cards.length !== 3) throw new Error("Expected exactly three recommendation cards.");
      setPublicSelection(selection);
      setPublicRecommendation(recommendation);
      void localSceneStore.saveDraft({
        selectionId: recommendation.selectionId,
        placeIds: recommendation.cards.map((card) => card.placeId),
        seenIds: recommendation.cards.map((card) => card.placeId),
        mode: recommendation.mode,
        catalogVersion: recommendation.catalogVersion,
        policyVersion: recommendation.policyVersion,
        revision: recommendation.revision,
      }).catch(() => undefined);
      router.push("/results");
    } catch {
      Alert.alert("세 곳을 불러오지 못했어요", "연결을 확인하고 다시 시도해 주세요.");
    } finally {
      setBusyId(null);
    }
  };

  return <View style={styles.screen}>
    <View style={[styles.header, { paddingTop: Math.max(insets.top, 14) }]}><GoatMark /><Pressable accessibilityRole="button" accessibilityLabel="이용 안내" onPress={() => router.push("/guide")} style={styles.headerButton}><BrandIcon name="info" size={21} color={palette.forest} /></Pressable></View>
    {state === "loading" ? <ScreenState title="장면을 불러오는 중이에요"><ActivityIndicator color={palette.forest} /></ScreenState>
      : state === "error" ? <ScreenState title="장면을 불러오지 못했어요" body="잠시 후 다시 시도해 주세요." action="다시 시도" onPress={load} />
      : selections.length === 0 ? <ScreenState title="지금 고를 수 있는 장면이 없어요" body="새로운 장면을 준비하고 있어요." action="다시 확인" onPress={load} />
      : <FlatList
          data={visibleSelections}
          keyExtractor={(item) => item.selectionId}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 116 + insets.bottom, gap: 16 }}
          ListHeaderComponent={<View style={styles.intro}><Text style={styles.kicker}>가고 싶은 장면, 강원에서 찾아보세요.</Text><Text style={styles.title}>오늘 보고 싶은{`\n`}장면은 무엇인가요?</Text><Text style={styles.description}>하나만 고르면 실제 사진과 함께 어울리는 세 곳을 바로 보여드릴게요.</Text></View>}
          renderItem={({ item, index }) => {
            const cover = item.sceneCover;
            const photo = cover.kind === "PHOTO" ? cover.photo : null;
            const picturedPlaceName = cover.kind === "PHOTO" ? cover.picturedPlaceName : "선택 결과가 아닌 분위기 예시";
            const attribution = cover.kind === "PHOTO" ? cover.sourceAttributions.map((source) => [source.label, source.author].filter(Boolean).join(" ")).join(", ") : null;
            return <View><SceneCoverCard number={index + 1} title={item.title} description={item.availability === "AVAILABLE" ? item.description : `${item.description} · 준비 중`} picturedPlaceName={picturedPlaceName} imageUri={photo?.url} attribution={attribution} selected={busyId === item.selectionId} disabled={item.availability !== "AVAILABLE" || busyId !== null} onPress={() => void choose(item)} />{busyId === item.selectionId ? <View style={styles.busy} accessibilityLiveRegion="polite"><ActivityIndicator size="small" color={palette.forest} /><Text style={styles.busyText}>어울리는 세 곳을 찾고 있어요</Text></View> : null}</View>;
          }}
          ListFooterComponent={selections.length > 6 ? <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded((value) => !value)} style={styles.more}><Text style={styles.moreText}>{expanded ? "대표 장면만 보기" : `장면 ${selections.length - 6}개 더 보기`}</Text><BrandIcon name="arrow-right" size={18} color={palette.forest} /></Pressable> : null}
        />}
    <AppTabBar />
  </View>;
}

function ScreenState({ title, body, action, onPress, children }: { title: string; body?: string; action?: string; onPress?: () => void; children?: React.ReactNode }) {
  return <View style={styles.state} accessibilityLiveRegion="polite"><Text style={styles.stateTitle}>{title}</Text>{body ? <Text style={styles.stateBody}>{body}</Text> : null}{children}{action && onPress ? <Pressable accessibilityRole="button" onPress={onPress} style={styles.retry}><Text style={styles.retryText}>{action}</Text></Pressable> : null}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.ivory },
  header: { minHeight: 76, paddingHorizontal: 20, paddingBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: radius.pill, backgroundColor: palette.paper },
  intro: { paddingTop: 16, paddingBottom: 12, gap: 10 },
  kicker: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 21, color: palette.forestSoft },
  title: { fontFamily: fonts.serif, fontSize: 31, lineHeight: 42, letterSpacing: -1.1, color: palette.ink },
  description: { maxWidth: 340, fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: palette.muted },
  busy: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  busyText: { fontFamily: fonts.medium, fontSize: 13, color: palette.forest },
  more: { minHeight: 52, marginTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: radius.md, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.paper },
  moreText: { fontFamily: fonts.semibold, fontSize: 14, color: palette.forest },
  state: { flex: 1, paddingHorizontal: 28, paddingBottom: 90, alignItems: "center", justifyContent: "center", gap: 12 },
  stateTitle: { fontFamily: fonts.serif, fontSize: 21, lineHeight: 29, textAlign: "center", color: palette.ink },
  stateBody: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, textAlign: "center", color: palette.muted },
  retry: { minHeight: 48, paddingHorizontal: 20, borderRadius: radius.md, justifyContent: "center", backgroundColor: palette.forest },
  retryText: { fontFamily: fonts.semibold, fontSize: 15, color: palette.white },
});
