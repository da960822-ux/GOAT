import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Alert, Modal, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { buildPublicPlaceShare, type DiscoveryTransportType, type PublicRecommendationData } from "@workspace/api-client-react";
import { BrandIcon } from "@/src/components/BrandIcon";
import { DecisionCard, DecisionSheet } from "@/src/components/discovery";
import { useApp } from "@/src/context/AppContext";
import { API_BASE_URL } from "@/src/config/api";
import { localSceneStore } from "@/src/services/deviceSceneStore";
import { hydrateDisplayCards, replacePublicCard, requestPublicRecommendation, StaleDiscoveryResponse, type DisplayCard } from "@/src/services/publicDiscovery";
import { openKakaoMap } from "@/src/services/mapLink";
import { fonts, palette, radius } from "@/src/theme/editorial";

const transportOptions: Array<{ value: DiscoveryTransportType | undefined; label: string }> = [
  { value: undefined, label: "분위기 우선" },
  { value: "CAR", label: "자차" },
  { value: "PUBLIC_TRANSIT", label: "대중교통" },
];

export default function ResultsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const deckRef = useRef<ScrollView>(null);
  const { publicSelection, publicRecommendation, setPublicRecommendation } = useApp();
  const [cards, setCards] = useState<DisplayCard[]>([]);
  const [index, setIndex] = useState(0);
  const [seenIds, setSeenIds] = useState(() => publicRecommendation?.cards.map((card) => card.placeId) ?? []);
  const [transport, setTransport] = useState<DiscoveryTransportType | undefined>();
  const [loadingContext, setLoadingContext] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [compareVisible, setCompareVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState<DisplayCard | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "loading" | "saved" | "error">("idle");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const cardWidth = Math.min(width - 40, 480);
  const gap = 12;

  useEffect(() => {
    if (!publicRecommendation) { router.replace("/"); return; }
    let active = true;
    setCards(publicRecommendation.cards.map((card) => ({ ...card, place: null })));
    hydrateDisplayCards(publicRecommendation.cards).then((next) => { if (active) setCards(next); });
    return () => { active = false; };
  }, [publicRecommendation, router]);

  const todayCopy = useMemo(() => {
    if (!publicRecommendation || publicRecommendation.todayStatus === "NOT_REQUESTED") return "오늘 조건 반영하기";
    if (publicRecommendation.todayStatus === "APPLIED") return "오늘 조건을 반영했어요";
    if (publicRecommendation.todayStatus === "NO_CHANGE") return "현재 후보가 그대로 적합해요";
    return "오늘 조건은 반영하지 못했어요";
  }, [publicRecommendation]);

  if (!publicRecommendation) return null;

  const applyRecommendation = (next: PublicRecommendationData, message: string) => {
    setPublicRecommendation(next);
    setCards(next.cards.map((card) => ({ ...card, place: null })));
    setSeenIds((previous) => [...new Set([...previous, ...next.cards.map((card) => card.placeId)])]);
    setStatusMessage(message);
    void localSceneStore.saveDraft({ selectionId: next.selectionId, placeIds: next.cards.map((card) => card.placeId), seenIds: [...new Set([...seenIds, ...next.cards.map((card) => card.placeId)])], mode: next.mode, catalogVersion: next.catalogVersion, policyVersion: next.policyVersion, revision: next.revision }).catch(() => undefined);
    AccessibilityInfo.announceForAccessibility(message);
  };

  const updateContext = async (mode: "SCENE" | "TODAY", nextTransport = transport) => {
    setLoadingContext(true);
    try {
      const next = await requestPublicRecommendation({ selectionId: publicRecommendation.selectionId, mode, transportType: nextTransport });
      applyRecommendation(next, mode === "TODAY" ? todayStatusCopy(next) : "이동 방법을 반영했어요");
    } catch (error) {
      if (!(error instanceof StaleDiscoveryResponse)) Alert.alert("조건을 반영하지 못했어요", "기존 세 곳은 그대로 유지했어요.");
    } finally {
      setLoadingContext(false);
    }
  };

  const chooseTransport = (next: DiscoveryTransportType | undefined) => {
    setTransport(next);
    void updateContext(publicRecommendation.mode, next);
  };

  const replace = async (card: DisplayCard, slot: number) => {
    if (!card.canReplace || replacingId) return;
    setReplacingId(card.placeId);
    try {
      const next = await replacePublicCard(publicRecommendation, slot, seenIds, card.replaceOptions[0] ?? "ANY", transport);
      applyRecommendation(next, "한 곳을 새 후보로 바꿨어요");
    } catch (error) {
      if (!(error instanceof StaleDiscoveryResponse)) Alert.alert("이 카드로 바꾸지 못했어요", "기존 세 곳은 그대로 유지했어요.");
    } finally {
      setReplacingId(null);
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
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="장면 선택으로 돌아가기" onPress={() => router.replace("/")} style={styles.iconButton}><BrandIcon name="back" color={palette.forest} /></Pressable><Text style={styles.headerTitle}>추천한 세 곳</Text><Pressable accessibilityRole="button" accessibilityLabel="세 곳 한눈에 보기" onPress={() => setCompareVisible(true)} style={styles.iconButton}><BrandIcon name="menu" color={palette.forest} /></Pressable></View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 + insets.bottom, gap: 18 }}>
      <View style={styles.intro}><Text style={styles.kicker}>{publicSelection?.title ?? "고른 장면"}</Text><Text style={styles.title}>어울리는 세 곳을{`\n`}바로 비교해 보세요.</Text><Text style={styles.description}>상세를 보지 않아도 지금 카드에서 결정할 수 있어요.</Text></View>
      <View style={styles.controls}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{transportOptions.map((option) => <Pressable key={option.label} accessibilityRole="button" accessibilityState={{ selected: transport === option.value, busy: loadingContext }} disabled={loadingContext} onPress={() => chooseTransport(option.value)} style={[styles.chip, transport === option.value && styles.chipActive]}><Text style={[styles.chipText, transport === option.value && styles.chipTextActive]}>{option.label}</Text></Pressable>)}</ScrollView><Pressable accessibilityRole="button" accessibilityState={{ busy: loadingContext, selected: publicRecommendation.mode === "TODAY" }} disabled={loadingContext} onPress={() => void updateContext("TODAY")} style={styles.todayButton}><BrandIcon name="sunny-outline" size={18} color={palette.forest} /><Text style={styles.todayText}>{todayCopy}</Text></Pressable>{factorCopy(publicRecommendation) ? <Text style={styles.factor}>{factorCopy(publicRecommendation)}</Text> : null}{publicRecommendation.partialApplied ? <Text style={styles.partial}>일부 정보만 반영했어요</Text> : null}{statusMessage ? <Text accessibilityLiveRegion="polite" style={styles.live}>{statusMessage}</Text> : null}</View>
      <ScrollView ref={deckRef} horizontal snapToInterval={cardWidth + gap} decelerationRate="fast" showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap }} onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / (cardWidth + gap)))}>
        {cards.map((card, cardIndex) => <View key={card.placeId} style={{ width: cardWidth }}><DecisionCard index={cardIndex + 1} total={cards.length} region={card.place?.city ?? "강원"} name={card.place?.place_name ?? card.placeId} summary={summaryFor(card)} features={card.matchedFeatures} imageUri={card.placeHero?.url} criticalRestriction={restrictionFor(card)} attribution={attributionFor(card)} replacementState={card.canReplace ? replacingId === card.placeId ? "loading" : "available" : "unavailable"} replacementHint={replacementCopy(card)} onDetails={() => router.push({ pathname: "/detail/[id]", params: { id: card.placeId, selectionId: publicRecommendation.selectionId } })} onReplace={() => void replace(card, cardIndex + 1)} onChoose={() => openDecision(card)} /></View>)}
      </ScrollView>
      <View style={styles.deckNav}><Pressable accessibilityRole="button" accessibilityLabel="이전 카드" accessibilityState={{ disabled: index === 0 }} disabled={index === 0} onPress={() => goTo(index - 1)} style={[styles.navButton, index === 0 && styles.navDisabled]}><BrandIcon name="back" size={18} color={palette.forest} /><Text style={styles.navText}>이전</Text></Pressable><Text style={styles.nextHint}>{index < cards.length - 1 ? `다음은 ${cards[index + 1]?.place?.place_name ?? "또 다른 장소"}` : "세 곳을 모두 봤어요"}</Text><Pressable accessibilityRole="button" accessibilityLabel="다음 카드" accessibilityState={{ disabled: index >= cards.length - 1 }} disabled={index >= cards.length - 1} onPress={() => goTo(index + 1)} style={[styles.navButton, index >= cards.length - 1 && styles.navDisabled]}><Text style={styles.navText}>다음</Text><BrandIcon name="arrow-right" size={18} color={palette.forest} /></Pressable></View>
      <Pressable accessibilityRole="button" onPress={() => setCompareVisible(true)} style={styles.compareButton}><Text style={styles.compareText}>세 곳 한눈에 보기</Text><BrandIcon name="arrow-right" size={18} color={palette.forest} /></Pressable>
    </ScrollView>
    <CompareSheet visible={compareVisible} cards={cards} onClose={() => setCompareVisible(false)} onChoose={(card) => { setCompareVisible(false); openDecision(card); }} />
    {selectedCard ? <DecisionSheet visible selectedPlace={{ region: selectedCard.place?.city ?? "강원", name: selectedCard.place?.place_name ?? selectedCard.placeId }} criticalRestriction={restrictionFor(selectedCard)} saveStatus={saveStatus} saveError="저장하지 못했어요. 이 화면에서 다시 시도해 주세요." onOpenMap={openMap} onSave={() => void save()} onShare={() => void share()} onClose={() => setSelectedCard(null)}>{shareUrl ? <View style={styles.shareFallback}><Text style={styles.shareFallbackLabel}>공유 링크</Text><Text selectable style={styles.shareFallbackUrl}>{shareUrl}</Text></View> : null}</DecisionSheet> : null}
  </View>;
}

function CompareSheet({ visible, cards, onClose, onChoose }: { visible: boolean; cards: DisplayCard[]; onClose: () => void; onChoose: (card: DisplayCard) => void }) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={styles.modalBackdrop}><View accessibilityViewIsModal style={styles.compareSheet}><View style={styles.compareHead}><Text style={styles.compareTitle}>세 곳 한눈에 보기</Text><Pressable accessibilityRole="button" accessibilityLabel="비교 닫기" onPress={onClose} style={styles.iconButton}><BrandIcon name="close" /></Pressable></View><ScrollView contentContainerStyle={styles.compareList}>{cards.map((card, index) => <View key={card.placeId} style={styles.compareRow}><Text style={styles.compareIndex}>{index + 1}</Text><View style={styles.compareCopy}><Text style={styles.compareName}>{card.place?.place_name ?? card.placeId}</Text><Text style={styles.compareFeatures}>{card.matchedFeatures.slice(0, 3).join(" · ") || "장면과 닮은 후보"}</Text>{restrictionFor(card) ? <Text style={styles.compareRestriction}>{restrictionFor(card)}</Text> : null}</View><Pressable accessibilityRole="button" accessibilityLabel={`${card.place?.place_name ?? card.placeId} 선택`} onPress={() => onChoose(card)} style={styles.selectButton}><Text style={styles.selectText}>선택</Text></Pressable></View>)}</ScrollView></View></View></Modal>;
}

function summaryFor(card: DisplayCard) { return card.differenceNote ?? (card.matchedFeatures.length ? `고른 장면과 닮은 점: ${card.matchedFeatures.slice(0, 2).join(", ")}` : "고른 장면과 비교해 볼 수 있는 장소예요."); }
function restrictionFor(card: DisplayCard) { const note = card.place?.note?.trim(); return note && /(예약|투숙|입장|출입|통제|휴장|운영)/.test(note) ? note : null; }
function attributionFor(card: DisplayCard) { const sources = card.sourceAttributions.length ? card.sourceAttributions : card.placeHero ? [card.placeHero.attribution] : []; return sources.map((source) => [source.label, source.author].filter(Boolean).join(" ")).join(", "); }
function replacementCopy(card: DisplayCard) {
  if (!card.canReplace) return `교체 불가 · 이미 ${card.replacementCount}회 교체했어요`;
  const labels = { ANY: "다른 분위기", LESS_RAIN: "비를 덜 맞는 곳", LESS_CROWDED: "덜 붐비는 곳", BETTER_PUBLIC_TRANSIT: "대중교통이 나은 곳" } as const;
  return `교체 가능 · ${card.replaceOptions.map((reason) => labels[reason]).join(" · ") || "다른 후보"}`;
}
function todayStatusCopy(data: PublicRecommendationData) { if (data.todayStatus === "APPLIED") return "오늘 조건을 반영했어요"; if (data.todayStatus === "NO_CHANGE") return "현재 후보가 그대로 적합해요"; if (data.todayStatus === "UNAVAILABLE") return "오늘 조건은 반영하지 못했어요"; return "오늘 조건 반영하기"; }
function factorCopy(data: PublicRecommendationData) {
  const labels = { WEATHER: "날씨", VISIT_CONCENTRATION: "방문 집중도" } as const;
  const reasons = { TIMEOUT: "시간 초과", NO_DATA: "데이터 없음", NOT_COMPARABLE: "비교 불가", SINGLE_CANDIDATE: "후보 부족", INVALID_DATA: "데이터 확인 필요" } as const;
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
  chips: { gap: 8 },
  chip: { minHeight: 48, paddingHorizontal: 16, justifyContent: "center", borderRadius: radius.pill, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.paper },
  chipActive: { borderColor: palette.forest, backgroundColor: palette.forest },
  chipText: { fontFamily: fonts.semibold, fontSize: 14, color: palette.forest },
  chipTextActive: { color: palette.white },
  todayButton: { minHeight: 50, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 9, borderRadius: radius.md, backgroundColor: palette.sage },
  todayText: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: palette.forest },
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
