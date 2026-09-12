import { useRouter } from "expo-router";
import { Image } from "expo-image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Alert, findNodeHandle, InteractionManager, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from "react-native";
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
  const compareTriggerRef = useRef<View>(null);
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
      <View style={styles.intro}><Text lineBreakStrategyIOS="hangul-word" textBreakStrategy="balanced" android_hyphenationFrequency="none" style={styles.title}>{publicSelection?.title ?? "고른 장면"}{`\n`}어울리는 세 곳</Text><Text style={styles.description}>사진·이동·제한을 비교한 뒤 한 곳을 고르세요.</Text></View>
      <ScrollView ref={deckRef} horizontal snapToInterval={cardWidth + gap} decelerationRate="fast" showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap }} onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / (cardWidth + gap)))}>
        {cards.map((card, cardIndex) => <View key={card.placeId} style={{ width: cardWidth }}><DecisionCard index={cardIndex + 1} total={cards.length} region={card.place?.city ?? "강원"} name={card.place?.place_name ?? "추천 장소"} summary={summaryFor(card)} features={card.matchedFeatures} imageUri={card.placeHero?.url} criticalRestriction={restrictionFor(card)} attribution={attributionFor(card)} replacementState={card.canReplace && card.replacementCount > 0 ? replacingId === card.placeId ? "loading" : "available" : "unavailable"} replacementDisabled={conditionLoading || replacingId !== null} onDetails={() => router.push({ pathname: "/detail/[id]", params: { id: card.placeId, selectionId: publicRecommendation.selectionId } })} onReplace={() => void replace(card, cardIndex + 1)} onChoose={(trigger) => { decisionTriggerRef.current = trigger ?? null; openDecision(card); }} /></View>)}
      </ScrollView>
      <View style={styles.deckNav}><Pressable accessibilityRole="button" accessibilityLabel="이전 카드" accessibilityState={{ disabled: index === 0 }} disabled={index === 0} onPress={() => goTo(index - 1)} style={[styles.navButton, index === 0 && styles.navDisabled]}><BrandIcon name="back" size={18} color={palette.forest} /><Text style={styles.navText}>이전</Text></Pressable><Text style={styles.nextHint}>{index < cards.length - 1 ? `다음은 ${cards[index + 1]?.place?.place_name ?? "또 다른 장소"}` : "세 곳을 모두 봤어요"}</Text><Pressable accessibilityRole="button" accessibilityLabel="다음 카드" accessibilityState={{ disabled: index >= cards.length - 1 }} disabled={index >= cards.length - 1} onPress={() => goTo(index + 1)} style={[styles.navButton, index >= cards.length - 1 && styles.navDisabled]}><Text style={styles.navText}>다음</Text><BrandIcon name="arrow-right" size={18} color={palette.forest} /></Pressable></View>
      <View style={styles.controls}><Pressable ref={conditionTriggerRef} accessibilityRole="button" accessibilityLabel="추천 조건 조정" accessibilityState={{ disabled: conditionLoading || replacingId !== null }} disabled={conditionLoading || replacingId !== null} onPress={() => { setConditionError(null); setConditionVisible(true); }} style={[styles.conditionButton, (conditionLoading || replacingId !== null) && styles.controlDisabled]}><BrandIcon name="transport" size={18} color={palette.forest} /><View style={styles.conditionCopy}><Text style={styles.conditionTitle}>추천 조건 조정</Text><Text style={styles.conditionSummary}>{`${conditions.transport === "CAR" ? "자차 이동" : conditions.transport === "PUBLIC_TRANSIT" ? "대중교통 이동" : "분위기 우선"} · ${conditions.today ? todayCopy : "오늘 조건 미반영"}`}</Text></View><BrandIcon name="arrow-right" size={18} color={palette.forest} /></Pressable>{conditionState?.undo ? <Pressable accessibilityRole="button" accessibilityLabel="이전 세 곳으로 되돌리기" accessibilityState={{ disabled: conditionLoading || replacingId !== null }} disabled={conditionLoading || replacingId !== null} onPress={undoConditions} style={[styles.undoButton, (conditionLoading || replacingId !== null) && styles.controlDisabled]}><BrandIcon name="refresh" size={17} color={palette.forest} /><Text style={styles.undoText}>이전 결과로 되돌리기</Text></Pressable> : null}{factorCopy(publicRecommendation) || publicRecommendation.partialApplied ? <View><Pressable accessibilityRole="button" accessibilityState={{ expanded: diagnosticsVisible }} onPress={() => setDiagnosticsVisible((value) => !value)} style={styles.diagnosticsToggle}><Text style={styles.diagnosticsText}>{publicRecommendation.partialApplied ? "일부 조건만 반영됐어요" : "조건 반영 정보"}</Text><BrandIcon name="arrow-right" size={16} color={palette.forest} /></Pressable>{diagnosticsVisible ? <View style={styles.diagnostics}>{factorCopy(publicRecommendation) ? <Text style={styles.factor}>{factorCopy(publicRecommendation)}</Text> : null}{publicRecommendation.partialApplied ? <Text style={styles.partial}>일부 정보만 반영했어요</Text> : null}</View> : null}</View> : null}{statusMessage ? <Text accessibilityLiveRegion="polite" style={styles.live}>{statusMessage}</Text> : null}</View>
      <Pressable ref={compareTriggerRef} accessibilityRole="button" accessibilityLabel="세 곳 비교 열기" onPress={() => setCompareVisible(true)} style={styles.compareButton}><Text style={styles.compareText}>세 곳 한눈에 보기</Text><BrandIcon name="arrow-right" size={18} color={palette.forest} /></Pressable>
    </ScrollView>
    <CompareSheet visible={compareVisible} cards={cards} returnFocusRef={compareTriggerRef} onClose={() => setCompareVisible(false)} onChoose={(card) => { setCompareVisible(false); decisionTriggerRef.current = compareTriggerRef.current; InteractionManager.runAfterInteractions(() => openDecision(card)); }} />
    {conditionState ? <ConditionSheet visible={conditionVisible} draft={conditionState.draft} loading={conditionLoading} disabled={replacingId !== null} error={conditionError} returnFocusRef={conditionTriggerRef} onChange={(draft) => setConditionState((current) => current ? updateConditionDraft(current, draft) : current)} onApply={() => void applyConditions()} onClose={closeConditions} /> : null}
    {selectedCard ? <DecisionSheet visible returnFocusRef={decisionTriggerRef} selectedPlace={{ region: selectedCard.place?.city ?? "강원", name: selectedCard.place?.place_name ?? "추천 장소" }} criticalRestriction={restrictionFor(selectedCard)} saveStatus={saveStatus} saveError="저장하지 못했어요. 이 화면에서 다시 시도해 주세요." onOpenMap={openMap} onSave={() => void save()} onShare={() => void share()} onClose={() => setSelectedCard(null)}>{shareUrl ? <View style={styles.shareFallback}><Text style={styles.shareFallbackLabel}>공유 링크</Text><Text selectable style={styles.shareFallbackUrl}>{shareUrl}</Text> </View> : null}</DecisionSheet> : null}
  </View>;
}

function CompareSheet({ visible, cards, returnFocusRef, onClose, onChoose }: { visible: boolean; cards: DisplayCard[]; returnFocusRef: React.RefObject<View | null>; onClose: () => void; onChoose: (card: DisplayCard) => void }) {
  const closeRef = useRef<View>(null);
  const wasVisible = useRef(false);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const focus = (target: View | null | undefined) => { if (Platform.OS === "web") { (target as unknown as { focus?: () => void } | null)?.focus?.(); return; } const handle = target ? findNodeHandle(target) : null; if (handle) AccessibilityInfo.setAccessibilityFocus(handle); };
  const handleShow = () => { wasVisible.current = true; focus(closeRef.current); };
  const handleClose = () => { const shouldReturnFocus = wasVisible.current; wasVisible.current = false; onClose(); if (shouldReturnFocus) InteractionManager.runAfterInteractions(() => focus(returnFocusRef.current)); };
  const handleChoose = (card: DisplayCard) => { wasVisible.current = false; onChoose(card); };

  return <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose} onShow={handleShow}><View style={styles.modalBackdrop}><View accessibilityViewIsModal style={[styles.compareSheet, { maxHeight: height - Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 20) }]}><View style={styles.compareHead}><View style={styles.compareHeading}><Text style={styles.compareTitle}>세 곳 비교</Text><Text style={styles.compareDescription}>같은 기준으로 확인하세요.</Text></View><Pressable ref={closeRef} accessibilityRole="button" accessibilityLabel="비교 닫기" onPress={handleClose} style={styles.iconButton}><BrandIcon name="close" /></Pressable></View><ScrollView style={styles.compareScroll} contentContainerStyle={styles.compareList} showsVerticalScrollIndicator={false}>{cards.map((card, index) => { const name = card.place?.place_name ?? "추천 장소"; return <View key={card.placeId} style={styles.compareRow}><View style={styles.compareCardHead}>{card.placeHero?.url ? <Image source={{ uri: card.placeHero.url }} style={styles.compareImage} contentFit="cover" accessible={false} importantForAccessibility="no-hide-descendants" /> : <View style={styles.compareImageFallback} accessibilityElementsHidden><BrandIcon name="image" size={22} color={palette.forestSoft} /></View>}<View style={styles.compareNameWrap}><Text style={styles.compareIndex}>{index + 1} / {cards.length}</Text><Text lineBreakStrategyIOS="hangul-word" textBreakStrategy="balanced" android_hyphenationFrequency="none" style={styles.compareName}>{name}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`${name} 선택`} onPress={() => handleChoose(card)} style={styles.selectButton}><Text style={styles.selectText}>선택</Text></Pressable></View><CompareAxis label="사진에서 보이는 차이" value={photoDifferenceFor(card)} /><CompareAxis label="접근·이동" value={card.place?.accessibility?.trim() || "확인된 접근·이동 정보가 없어요."} /><CompareAxis label="중요 제한" value={restrictionFor(card) || "확인된 중요 제한이 없어요."} critical={Boolean(restrictionFor(card))} /></View>; })}</ScrollView></View></View></Modal>;
}

function CompareAxis({ label, value, critical = false }: { label: string; value: string; critical?: boolean }) { return <View style={styles.compareAxis}><Text style={styles.compareAxisLabel}>{label}</Text><Text style={[styles.compareAxisValue, critical && styles.compareAxisCritical]}>{value}</Text></View>; }
function photoDifferenceFor(card: DisplayCard) { return card.differenceNote?.trim() || "확인된 사진 차이 정보가 없어요."; }

function summaryFor(card: DisplayCard) { return card.differenceNote ?? (card.matchedFeatures.length ? `고른 장면과 닮은 점: ${card.matchedFeatures.slice(0, 2).join(", ")}` : "고른 장면과 비교해 볼 수 있는 장소예요."); }
function restrictionFor(card: DisplayCard) { const note = card.place?.note?.trim(); return note && /(예약|투숙|입장|출입|통제|휴장|운영)/.test(note) ? note : null; }
function attributionFor(card: DisplayCard) { const sources = card.sourceAttributions.length ? card.sourceAttributions : card.placeHero ? [card.placeHero.attribution] : []; return sources.map((source) => [source.label, source.author].filter(Boolean).join(" ")).join(", "); }
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
  title: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 38, letterSpacing: -0.5, color: palette.ink },
  description: { fontFamily: fonts.body, fontSize: 14, lineHeight: 22, color: palette.muted },
  controls: { paddingHorizontal: 20, gap: 10 },
  conditionButton: { minHeight: 58, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: radius.md, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.paper },
  controlDisabled: { opacity: 0.55 },
  conditionCopy: { flex: 1, gap: 2 },
  conditionTitle: { fontFamily: fonts.semibold, fontSize: 15, color: palette.forest },
  conditionSummary: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: palette.muted },
  undoButton: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: radius.pill, backgroundColor: palette.sage },
  undoText: { fontFamily: fonts.semibold, fontSize: 14, color: palette.forest },
  diagnosticsToggle: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 },
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
  compareSheet: { paddingHorizontal: 20, paddingTop: 12, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, backgroundColor: palette.paper },
  compareHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 8 },
  compareHeading: { flex: 1, gap: 2 },
  compareTitle: { fontFamily: fonts.serif, fontSize: 23, color: palette.ink },
  compareDescription: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: palette.muted },
  compareScroll: { flexShrink: 1, minHeight: 0 },
  compareList: { paddingBottom: 8 },
  compareRow: { paddingVertical: 18, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: palette.line },
  compareCardHead: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 12 },
  compareImage: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: palette.sage },
  compareImageFallback: { width: 64, height: 64, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", backgroundColor: palette.sage },
  compareNameWrap: { flex: 1, gap: 2 },
  compareIndex: { fontFamily: fonts.medium, fontSize: 11, color: palette.forestSoft, fontVariant: ["tabular-nums"] },
  compareName: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 23, color: palette.ink },
  compareAxis: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  compareAxisLabel: { width: 96, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 19, color: palette.forest },
  compareAxisValue: { flex: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 20, color: palette.muted },
  compareAxisCritical: { fontFamily: fonts.medium, color: palette.error },
  selectButton: { minWidth: 58, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: radius.pill, backgroundColor: palette.forest },
  selectText: { fontFamily: fonts.semibold, fontSize: 13, color: palette.white },
  shareFallback: { gap: 4, padding: 12, borderRadius: radius.sm, backgroundColor: palette.ivory },
  shareFallbackLabel: { fontFamily: fonts.semibold, fontSize: 12, color: palette.forest },
  shareFallbackUrl: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: palette.ink },
});
