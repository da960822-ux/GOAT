import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, ReduceMotion, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getPhotoCachePolicy, getPublicSelections, type PublicSelection } from "@workspace/api-client-react";
import { AppTabBar } from "@/src/components/AppTabBar";
import { BrandIcon } from "@/src/components/BrandIcon";
import { SceneCoverCard } from "@/src/components/discovery";
import { getEditorialSceneCover } from "@/src/data/sceneCoverEditorial";
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
  const [draftAvailable, setDraftAvailable] = useState(false);
  const reducedMotion = useReducedMotion();
  const visibleSelections = useMemo(() => expanded ? selections : selections.slice(0, 6), [expanded, selections]);
  const heroSelection = visibleSelections[0];
  const supportingSelections = visibleSelections.slice(1);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const response = await getPublicSelections();
      setSelections(response.data.selections);
      setState("content");
      try {
        const loaded = await localSceneStore.loadDraft();
        if (loaded.status === "STALE" || (loaded.status === "RESTORED" && !response.data.selections.some(({ selectionId }) => selectionId === loaded.draft.selectionId))) {
          await localSceneStore.clearDraft();
          setDraftAvailable(false);
          Alert.alert("이전 추천을 새로 시작할게요", "저장된 추천이 현재 장면 목록과 맞지 않아요.");
        } else {
          setDraftAvailable(loaded.status === "RESTORED");
        }
      } catch {
        setDraftAvailable(false);
      }
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
    <Animated.View entering={reducedMotion ? undefined : FadeInDown.duration(420).reduceMotion(ReduceMotion.System)} style={[styles.header, { paddingTop: Math.max(insets.top, 14) }]}><GoatMark /><Pressable accessibilityRole="button" accessibilityLabel="이용 안내" onPress={() => router.push("/guide")} style={styles.headerButton}><BrandIcon name="info" size={21} color={palette.forest} /></Pressable></Animated.View>
    {state === "loading" ? <ScreenState title="장면을 불러오는 중이에요"><ActivityIndicator color={palette.forest} /></ScreenState>
      : state === "error" ? <ScreenState title="장면을 불러오지 못했어요" body="잠시 후 다시 시도해 주세요." action="다시 시도" onPress={load} />
      : selections.length === 0 ? <ScreenState title="지금 고를 수 있는 장면이 없어요" body="새로운 장면을 준비하고 있어요." action="다시 확인" onPress={load} />
      : <FlatList
          data={supportingSelections}
          keyExtractor={(item) => item.selectionId}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 116 + insets.bottom, gap: 16 }}
          ListHeaderComponent={<View style={styles.intro}><View style={styles.heroCopy}><Text style={styles.kicker}>오늘의 장면</Text><Text accessibilityRole="header" lineBreakStrategyIOS="hangul-word" textBreakStrategy="balanced" android_hyphenationFrequency="none" style={styles.title}>오늘 보고 싶은{`\n`}장면은 무엇인가요?</Text></View><Text style={styles.description}>한 장면을 고르면, 닮은 강원 장소 세 곳을 바로 보여드려요.</Text>{draftAvailable ? <Pressable accessibilityRole="button" onPress={() => router.push("/results")} style={styles.resume}><BrandIcon name="refresh" size={18} color={palette.forest} /><Text style={styles.resumeText}>이전 추천 이어보기</Text></Pressable> : null}{heroSelection ? <View style={styles.heroScene}><Text style={styles.heroSceneLabel}>먼저 만나볼 장면</Text><SceneCoverCard number="01" featured title={heroSelection.title} description={heroSelection.availability === "AVAILABLE" ? heroSelection.description : `${heroSelection.description} · 준비 중`} picturedPlaceName={heroSelection.sceneCover.kind === "PHOTO" ? heroSelection.sceneCover.picturedPlaceName : "선택 결과가 아닌 분위기 예시"} imageUri={heroSelection.sceneCover.kind === "PHOTO" ? heroSelection.sceneCover.photo.url : undefined} imageCachePolicy={heroSelection.sceneCover.kind === "PHOTO" ? getPhotoCachePolicy(heroSelection.sceneCover.photo) : "none"} attribution={heroSelection.sceneCover.kind === "PHOTO" ? heroSelection.sceneCover.photo.attribution.label : null} selected={busyId === heroSelection.selectionId} disabled={heroSelection.availability !== "AVAILABLE" || busyId !== null} onPress={() => void choose(heroSelection)} /></View> : null}</View>}
          renderItem={({ item, index }) => {
            const cover = item.sceneCover;
            const editorial = getEditorialSceneCover(item.selectionId);
            const photo = !editorial && cover.kind === "PHOTO" ? cover.photo : null;
            const picturedPlaceName = editorial?.picturedPlaceName ?? (cover.kind === "PHOTO" ? cover.picturedPlaceName : "선택 결과가 아닌 분위기 예시");
            const attribution = editorial?.attribution ?? (cover.kind === "PHOTO" ? cover.photo.attribution.label : null);
            return <View><SceneCoverCard number={index + 2} title={item.title} description={item.availability === "AVAILABLE" ? item.description : `${item.description} · 준비 중`} picturedPlaceName={picturedPlaceName} imageUri={photo?.url} imageSource={editorial?.source} imageCachePolicy={photo ? getPhotoCachePolicy(photo) : editorial ? "memory-disk" : "none"} attribution={attribution} selected={busyId === item.selectionId} disabled={item.availability !== "AVAILABLE" || busyId !== null} onPress={() => void choose(item)} />{busyId === item.selectionId ? <View style={styles.busy} accessibilityLiveRegion="polite"><ActivityIndicator size="small" color={palette.forest} /><Text style={styles.busyText}>어울리는 세 곳을 찾고 있어요</Text></View> : null}</View>;
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
  intro: { paddingTop: 18, paddingBottom: 14, gap: 12 },
  heroCopy: { flex: 1, gap: 5 },
  kicker: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1.2, color: palette.forestSoft },
  heroScene: { marginTop: 14, gap: 9 },
  heroSceneLabel: { fontFamily: fonts.semibold, fontSize: 12, color: palette.forest },
  title: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 42, letterSpacing: -1.1, color: palette.ink },
  description: { maxWidth: 340, fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: palette.muted },
  resume: { minHeight: 48, marginTop: 6, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: radius.md, backgroundColor: palette.sage },
  resumeText: { fontFamily: fonts.semibold, fontSize: 14, color: palette.forest },
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
