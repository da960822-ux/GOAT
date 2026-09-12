import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Alert, Modal, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { buildPublicPlaceShare, type PublicRecommendationData } from "@workspace/api-client-react";
import { BrandIcon } from "@/src/components/BrandIcon";
import { ConditionSheet, DecisionCard, DecisionSheet, type DiscoveryConditions } from "@/src/components/discovery";
import { applyConditionResult, createConditionState, diffPlaceIds, discardConditionUndo, resetConditionDraft, restoreUndo, syncConditionResult, updateConditionDraft, type ConditionState } from "@/src/components/discovery/conditionState";
import { useApp } from "@/src/context/AppContext";
import { API_BASE_URL } from "@/src/config/api";
import { localSceneStore } from "@/src/services/deviceSceneStore";
import { hydrateDisplayCards, replacePublicCard, requestPublicRecommendation, StaleDiscoveryResponse, type DisplayCard } from "@/src/services/publicDiscovery";
import { openKakaoMap } from "@/src/services/mapLink";
import { fonts, palette, radius } from "@/src/theme/editorial";

export default function ResultsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const deckRef = useRef<ScrollView>(null);
  const { publicSelection, publicRecommendation, setPublicRecommendation } = useApp();
  const [cards, setCards] = useState<DisplayCard[]>([]);
  const [index, setIndex] = useState(0);
  const [seenIds, setSeenIds] = useState(() => publicRecommendation?.cards.map((card) => card.placeId) ?? []);
  const [conditionState, setConditionState] = useState<ConditionState<DiscoveryConditions, PublicRecommendationData> | null>(null);
  const [conditionVisible, setConditionVisible] = useState(false);
  const [conditionLoading, setConditionLoading] = useState(false);
  const [conditionError, setConditionError] = useState<string | null>(null);
  const [diagnosticsVisible, setDiagnosticsVisible] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [compareVisible, setCompareVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState<DisplayCard | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "loading" | "saved" | "error">("idle");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const conditionTriggerRef = useRef<View>(null);
  const decisionTriggerRef = useRef<View>(null);
  const requestGeneration = useRef(0);
  const cardWidth = Math.min(width - 40, 480);
  const gap = 12;

  useEffect(() => {
    if (!publicRecommendation) { router.replace("/"); return; }
    let active = true;
    setCards(publicRecommendation.cards.map((card) => ({ ...card, place: null })));
    hydrateDisplayCards(publicRecommendation.cards).then((next) => { if (active) setCards(next); });
    return () => { active = false; };
  }, [publicRecommendation, router]);

  useEffect(() => {
    if (publicRecommendation && !conditionState) {
      setConditionState(createConditionState({ transport: undefined, today: publicRecommendation.mode === "TODAY" }, publicRecommendation));
    }
  }, [conditionState, publicRecommendation]);

  const todayCopy = useMemo(() => {
    if (!publicRecommendation || publicRecommendation.todayStatus === "NOT_REQUESTED") return "오늘 조건 반영하기";
    if (publicRecommendation.todayStatus === "APPLIED") return "오늘 조건을 반영했어요";
    if (publicRecommendation.todayStatus === "NO_CHANGE") return "현재 후보가 그대로 적합해요";
    return "오늘 조건은 반영하지 못했어요";
  }, [publicRecommendation]);

  if (!publicRecommendation) return null;

  const conditions = conditionState?.committed.conditions ?? { transport: undefined, today: publicRecommendation.mode === "TODAY" };

  const applyRecommendation = (next: PublicRecommendationData, message: string, persist = true, discardUndo = false) => {
    setPublicRecommendation(next);
    setCards(next.cards.map((card) => ({ ...card, place: null })));
    setConditionState((current) => current ? discardUndo ? discardConditionUndo(syncConditionResult(current, next)) : syncConditionResult(current, next) : current);
    setSeenIds((previous) => [...new Set([...previous, ...next.cards.map((card) => card.placeId)])]);
    setStatusMessage(message);
    if (persist) void localSceneStore.saveDraft({ selectionId: next.selectionId, placeIds: next.cards.map((card) => card.placeId), seenIds: [...new Set([...seenIds, ...next.cards.map((card) => card.placeId)])], mode: next.mode, catalogVersion: next.catalogVersion, policyVersion: next.policyVersion, revision: next.revision }).catch(() => undefined);
    AccessibilityInfo.announceForAccessibility(message);
  };

  const applyConditions = async () => {
    if (!conditionState || conditionLoading || replacingId) return;
    const generation = ++requestGeneration.current;
    const draft = conditionState.draft;
    setConditionLoading(true);
    setConditionError(null);
    try {
      const next = await requestPublicRecommendation({ selectionId: publicRecommendation.selectionId, mode: draft.today ? "TODAY" : "SCENE", transportType: draft.transport });
      if (generation !== requestGeneration.current) return;
      const change = diffPlaceIds(conditionState.committed.result.cards.map((card) => card.placeId), next.cards.map((card) => card.placeId));
      setConditionState((current) => current ? applyConditionResult(current, next) : current);
      applyRecommendation(next, change.message);
      setConditionVisible(false);
    } catch (error) {
      if (generation === requestGeneration.current && !(error instanceof StaleDiscoveryResponse)) setConditionError("조건을 반영하지 못했어요. 기존 세 곳은 그대로 유지했어요.");
    } finally {
      if (generation === requestGeneration.current) setConditionLoading(false);
    }
  };

  const closeConditions = () => {
    requestGeneration.current += 1;
    setConditionLoading(false);
    setConditionError(null);
    setConditionState((current) => current ? resetConditionDraft(current) : current);
    setConditionVisible(false);
  };

  const undoConditions = () => {
    if (!conditionState?.undo || conditionLoading || replacingId) return;
    requestGeneration.current += 1;
    const snapshot = conditionState.undo;
    setConditionState(restoreUndo(conditionState));
    applyRecommendation(snapshot.result, "이전 세 곳으로 되돌렸어요");
  };

  const replace = async (card: DisplayCard, slot: number) => {
    if (!card.canReplace || replacingId || conditionLoading) return;
    const generation = ++requestGeneration.current;
    setReplacingId(card.placeId);
    try {
      const next = await replacePublicCard(publicRecommendation, slot, seenIds, card.replaceOptions[0] ?? "ANY", conditions.transport);
      if (generation !== requestGeneration.current) return;
      applyRecommendation(next, "한 곳을 새 후보로 바꿨어요", true, true);
    } catch (error) {
      if (generation === requestGeneration.current && !(error instanceof StaleDiscoveryResponse)) Alert.alert("이 카드로 바꾸지 못했어요", "기존 세 곳은 그대로 유지했어요.");
    } finally {
      if (generation === requestGeneration.current) setReplacingId(null);
    }
  };

  const openDecision = (card: DisplayCard) => { setSaveStatus("idle"); setShareUrl(null); setSelectedCard(card); };
  const save = async () => {
    if (!selectedCard) return;
    setSaveStatus("loading");
    try {
      await localSceneStore.saveScene({ placeId: selectedCard.placeId, selectionId: publicRecommendation.selectionId, selected: true });
      setSaveStatus("saved");
      AccessibilityInfo.announceForAccessibility("내 장면에 저장했어요");
    } catch { setSaveStatus("error"); }
  };
  const openMap = () => { if (selectedCard?.place) void openKakaoMap(selectedCard.place, selectedCard.place.lat != null && selectedCard.place.lng != null ? { lat: selectedCard.place.lat, lng: selectedCard.place.lng } : undefined); else Alert.alert("지도 정보를 불러오지 못했어요"); };
  const share = async () => {
    if (!selectedCard?.place || !API_BASE_URL) { Alert.alert("공개 링크를 만들 수 없어요", "운영 웹 주소 연결이 필요해요."); return; }
    const payload = buildPublicPlaceShare(API_BASE_URL, selectedCard.placeId, selectedCard.place.place_name);
    try { await Share.share({ title: payload.title, message: payload.message, url: payload.url }); } catch { setShareUrl(payload.url); }
  };
  const goTo = (next: number) => { const safe = Math.max(0, Math.min(cards.length - 1, next)); setIndex(safe); deckRef.current?.scrollTo({ x: safe * (cardWidth + gap), animated: true }); AccessibilityInfo.announceForAccessibility(`카드 ${safe + 1}/${cards.length}`); };

  return <View style={[styles.screen, { paddingTop: insets.top }]}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="장면 선택으로 돌아가기" onPress={() => router.replace("/")} style={styles.iconButton}><BrandIcon name="back" color={palette.forest} /></Pressable><Text style={styles.headerTitle}>추천한 세 곳</Text><View style={styles.iconButton} /></View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 + insets.bottom, gap: 18 }}>
      <View style={styles.intro}><Text style={styles.kicker}>{publicSelection?.title ?? "고른 장면"}</Text><Text style={styles.title}>어울리는 세 곳을{`\n`}바로 비교해 보세요.</Text><Text style={styles.description}>상세를 보지 않아도 지금 카드에서 결정할 수 있어요.</Text></View>
      <ScrollView ref={deckRef} horizontal snapToInterval={cardWidth + gap} decelerationRate="fast" showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap }} onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / (cardWidth + gap)))}>
        {cards.map((card, cardIndex) => <View key={card.placeId} style={{ width: cardWidth }}><DecisionCard index={cardIndex + 1} total={cards.length} region={card.place?.city ?? "강원"} name={card.place?.place_name ?? "추천 장소"} summary={summaryFor(card)} features={card.matchedFeatures} imageUri={card.placeHero?.url} criticalRestriction={restrictionFor(card)} attribution={attributionFor(card)} replacementState={card.canReplace ? replacingId === card.placeId ? "loading" : "available" : "unavailable"} replacementDisabled={conditionLoading || replacingId !== null} replacementHint={replacementCopy(card)} onDetails={() => router.push({ pathname: "/detail/[id]", params: { id: card.placeId, selectionId: publicRecommendation.selectionId } })} onReplace={() => void replace(card, cardIndex + 1)} onChoose={(trigger) => { decisionTriggerRef.current = trigger ?? null; openDecision(card); }} /></View>)}
      </ScrollView>
      <View style={styles.deckNav}><Pressable accessibilityRole="button" accessibilityLabel="이전 카드" accessibilityState={{ disabled: index === 0 }} disabled={index === 0} onPress={() => goTo(index - 1)} style={[styles.navButton, index === 0 && styles.navDisabled]}><BrandIcon name="back" size={18} color={palette.forest} /><Text style={styles.navText}>이전</Text></Pressable><Text style={styles.nextHint}>{index < cards.length - 1 ? `다음은 ${cards[index + 1]?.place?.place_name ?? "또 다른 장소"}` : "세 곳을 모두 봤어요"}</Text><Pressable accessibilityRole="button" accessibilityLabel="다음 카드" accessibilityState={{ disabled: index >= cards.length - 1 }} disabled={index >= cards.length - 1} onPress={() => goTo(index + 1)} style={[styles.navButton, index >= cards.length - 1 && styles.navDisabled]}><Text style={styles.navText}>다음</Text><BrandIcon name="arrow-right" size={18} color={palette.forest} /></Pressable></View>
      <View style={styles.controls}><Pressable ref={conditionTriggerRef} accessibilityRole="button" accessibilityLabel="추천 조건 조정" accessibilityState={{ disabled: conditionLoading || replacingId !== null }} disabled={conditionLoading || replacingId !== null} onPress={() => { setConditionError(null); setConditionVisible(true); }} style={[styles.conditionButton, (conditionLoading || replacingId !== null) && styles.controlDisabled]}><BrandIcon name="transport" size={18} color={palette.forest} /><View style={styles.conditionCopy}><Text style={styles.conditionTitle}>추천 조건 조정</Text><Text style={styles.conditionSummary}>{`${conditions.transport === "CAR" ? "자차 이동" : conditions.transport === "PUBLIC_TRANSIT" ? "대중교통 이동" : "분위기 우선"} · ${conditions.today ? todayCopy : "오늘 조건 미반영"}`}</Text></View><BrandIcon name="arrow-right" size={18} color={palette.forest} /></Pressable>{conditionState?.undo ? <Pressable accessibilityRole="button" accessibilityLabel="이전 세 곳으로 되돌리기" accessibilityState={{ disabled: conditionLoading || replacingId !== null }} disabled={conditionLoading || replacingId !== null} onPress={undoConditions} style={[styles.undoButton, (conditionLoading || replacingId !== null) && styles.controlDisabled]}><BrandIcon name="refresh" size={17} color={palette.forest} /><Text style={styles.undoText}>이전 결과로 되돌리기</Text></Pressable> : null}{factorCopy(publicRecommendation) || publicRecommendation.partialApplied ? <View><Pressable accessibilityRole="button" accessibilityState={{ expanded: diagnosticsVisible }} onPress={() => setDiagnosticsVisible((value) => !value)} style={styles.diagnosticsToggle}><Text style={styles.diagnosticsText}>{publicRecommendation.partialApplied ? "일부 조건만 반영됐어요" : "조건 반영 정보"}</Text><BrandIcon name="arrow-right" size={16} color={palette.forest} /></Pressable>{diagnosticsVisible ? <View style={styles.diagnostics}>{factorCopy(publicRecommendation) ? <Text style={styles.factor}>{factorCopy(publicRecommendation)}</Text> : null}{publicRecommendation.partialApplied ? <Text style={styles.partial}>일부 정보만 반영했어요</Text> : null}</View> : null}</View> : null}{statusMessage ? <Text accessibilityLiveRegion="polite" style={styles.live}>{statusMessage}</Text> : null}</View>
      <Pressable accessibilityRole="button" onPress={() => setCompareVisible(true)} style={styles.compareButton}><Text style={styles.compareText}>세 곳 한눈에 보기</Text><BrandIcon name="arrow-right" size={18} color={palette.forest} /></Pressable>
    </ScrollView>
    <CompareSheet visible={compareVisible} cards={cards} onClose={() => setCompareVisible(false)} onChoose={(card) => { setCompareVisible(false); openDecision(card); }} />
    {conditionState ? <ConditionSheet visible={conditionVisible} draft={conditionState.draft} loading={conditionLoading} disabled={replacingId !== null} error={conditionError} returnFocusRef={conditionTriggerRef} onChange={(draft) => setConditionState((current) => current ? updateConditionDraft(current, draft) : current)} onApply={() => void applyConditions()} onClose={closeConditions} /> : null}
    {selectedCard ? <DecisionSheet visible returnFocusRef={decisionTriggerRef} selectedPlace={{ region: selectedCard.place?.city ?? "강원", name: selectedCard.place?.place_name ?? "추천 장소" }} criticalRestriction={restrictionFor(selectedCard)} saveStatus={saveStatus} saveError="저장하지 못했어요. 이 화면에서 다시 시도해 주세요." onOpenMap={openMap} onSave={() => void save()} onShare={() => void share()} onClose={() => setSelectedCard(null)}>{shareUrl ? <View style={styles.shareFallback}><Text style={styles.shareFallbackLabel}>공유 링크</Text><Text selectable style={styles.shareFallbackUrl}>{shareUrl}</Text> </View> : null}</DecisionSheet> : null}
  </View>;
}

function CompareSheet({ visible, cards, onClose, onChoose }: { visible: boolean; cards: DisplayCard[]; onClose: () => void; onChoose: (card: DisplayCard) => void }) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={styles.modalBackdrop}><View accessibilityViewIsModal style={styles.compareSheet}><View style={styles.compareHead}><Text style={styles.compareTitle}>세 곳 한눈에 보기</Text><Pressable accessibilityRole="button" accessibilityLabel="비교 닫기" onPress={onClose} style={styles.iconButton}><BrandIcon name="close" /></Pressable></View><ScrollView contentContainerStyle={styles.compareList}>{cards.map((card, index) => { const name = card.place?.place_name ?? "추천 장소"; return <View key={card.placeId} style={styles.compareRow}><Text style={styles.compareIndex}>{index + 1}</Text><View style={styles.compareCopy}><Text style={styles.compareName}>{name}</Text><Text style={styles.compareFeatures}>{card.matchedFeatures.slice(0, 3).join(" · ") || "장면과 닮은 후보"}</Text>{restrictionFor(card) ? <Text style={styles.compareRestriction}>{restrictionFor(card)}</Text> : null}</View><Pressable accessibilityRole="button" accessibilityLabel={`${name} 선택`} onPress={() => onChoose(card)} style={styles.selectButton}><Text style={styles.selectText}>선택</Text></Pressable></View>; })}</ScrollView></View></View></Modal>;
}

function summaryFor(card: DisplayCard) { return card.differenceNote ?? (card.matchedFeatures.length ? `고른 장면과 닮은 점: ${card.matchedFeatures.slice(0, 2).join(", ")}` : "고른 장면과 비교해 볼 수 있는 장소예요."); }
function restrictionFor(card: DisplayCard) { const note = card.place?.note?.trim(); return note && /(예약|투숙|입장|출입|통제|휴장|운영)/.test(note) ? note : null; }
function attributionFor(card: DisplayCard) { const sources = card.sourceAttributions.length ? card.sourceAttributions : card.placeHero ? [card.placeHero.attribution] : []; return sources.map((source) => [source.label, source.author].filter(Boolean).join(" ")).join(", "); }
function replacementCopy(card: DisplayCard) {
  if (!card.canReplace) return "현재 조건에서 바꿀 수 있는 다른 후보가 없어요";
  const labels = { ANY: "다른 분위기", LESS_RAIN: "비를 덜 맞는 곳", LESS_CROWDED: "덜 붐비는 곳", BETTER_PUBLIC_TRANSIT: "대중교통이 나은 곳" } as const;
  return `교체 가능 · ${card.replaceOptions.map((reason) => labels[reason]).join(" · ") || "다른 후보"}`;
}
function todayStatusCopy(data: PublicRecommendationData) { if (data.todayStatus === "APPLIED") return "오늘 조건을 반영했어요"; if (data.todayStatus === "NO_CHANGE") return "현재 후보가 그대로 적합해요"; if (data.todayStatus === "UNAVAILABLE") return "오늘 조건은 반영하지 못했어요"; return "오늘 조건 반영하기"; }
function factorCopy(data: PublicRecommendationData) {
  const labels = { WEATHER: "날씨", VISIT_CONCENTRATION: "방문 집중도" } as const;
  const reasons = { TIMEOUT: "정보 확인이 지연됐어요", NO_DATA: "확인 가능한 정보가 없어요", NOT_COMPARABLE: "비교할 정보가 충분하지 않아요", SINGLE_CANDIDATE: "비교할 후보가 더 필요해요", INVALID_DATA: "일부 정보를 확인할 수 없어요" } as const;
  const applied = data.appliedFactors.map((factor) => labels[factor]).join(" · ");
  const skipped = data.skippedFactors.map(({ factor, reason }) => `${labels[factor]}(${reasons[reason]})`).join(" · ");
  return [applied ? `반영: ${applied}` : "", skipped ? `미반영: ${skipped}` : ""].filter(Boolean).join(" / ");
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.ivory },
  header: { minHeight: 60, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontFamily: fonts.semibold, fontSize: 16, color: palette.ink },
  iconButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  intro: { paddingHorizontal: 20, paddingTop: 8, gap: 8 },
  kicker: { fontFamily: fonts.semibold, fontSize: 13, color: palette.forestSoft },
  title: { fontFamily: fonts.serif, fontSize: 29, lineHeight: 39, color: palette.ink },
  description: { fontFamily: fonts.body, fontSize: 14, lineHeight: 22, color: palette.muted },
  controls: { paddingHorizontal: 20, gap: 10 },
  conditionButton: { minHeight: 58, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: radius.md, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.paper },
  controlDisabled: { opacity: 0.55 },
  conditionCopy: { flex: 1, gap: 2 },
  conditionTitle: { fontFamily: fonts.semibold, fontSize: 15, color: palette.forest },
  conditionSummary: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: palette.muted },
  undoButton: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: radius.pill, backgroundColor: palette.sage },
  undoText: { fontFamily: fonts.semibold, fontSize: 14, color: palette.forest },
  diagnosticsToggle: { minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 },
  diagnosticsText: { fontFamily: fonts.medium, fontSize: 13, color: palette.forest },
  diagnostics: { gap: 4, paddingHorizontal: 4, paddingBottom: 4 },
  partial: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, color: palette.error },
  factor: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: palette.muted },
  live: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, color: palette.forestSoft },
  deckNav: { paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  navButton: { minWidth: 76, minHeight: 48, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: radius.pill, backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line },
  navDisabled: { opacity: 0.4 },
  navText: { fontFamily: fonts.semibold, fontSize: 13, color: palette.forest },
  nextHint: { flex: 1, textAlign: "center", fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: palette.muted },
  compareButton: { minHeight: 52, marginHorizontal: 20, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: radius.md, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.paper },
  compareText: { fontFamily: fonts.semibold, fontSize: 15, color: palette.forest },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,48,42,.52)" },
  compareSheet: { maxHeight: "86%", padding: 20, paddingBottom: 32, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, backgroundColor: palette.paper },
  compareHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  compareTitle: { fontFamily: fonts.serif, fontSize: 23, color: palette.ink },
  compareList: { gap: 4 },
  compareRow: { minHeight: 106, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: palette.line },
  compareIndex: { width: 24, fontFamily: fonts.serif, fontSize: 22, color: palette.forest },
  compareCopy: { flex: 1, gap: 4 },
  compareName: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 23, color: palette.ink },
  compareFeatures: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: palette.muted },
  compareRestriction: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, color: palette.error },
  selectButton: { minWidth: 58, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: radius.pill, backgroundColor: palette.forest },
  selectText: { fontFamily: fonts.semibold, fontSize: 13, color: palette.white },
  shareFallback: { gap: 4, padding: 12, borderRadius: radius.sm, backgroundColor: palette.ivory },
  shareFallbackLabel: { fontFamily: fonts.semibold, fontSize: 12, color: palette.forest },
  shareFallbackUrl: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: palette.ink },
});
