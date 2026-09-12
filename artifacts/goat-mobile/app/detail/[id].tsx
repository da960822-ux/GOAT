import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { buildPublicPlaceShare, getPlace, getPlacePhotos, type Place, type PlacePhotosData } from "@workspace/api-client-react";
import { BrandIcon } from "@/src/components/BrandIcon";
import { DecisionSheet } from "@/src/components/discovery";
import { API_BASE_URL } from "@/src/config/api";
import { useApp } from "@/src/context/AppContext";
import { localSceneStore } from "@/src/services/deviceSceneStore";
import { openKakaoMap } from "@/src/services/mapLink";
import { fonts, palette, radius } from "@/src/theme/editorial";

export default function DetailScreen() {
  const { id = "", selectionId: routeSelectionId = "" } = useLocalSearchParams<{ id: string; selectionId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { publicRecommendation } = useApp();
  const selectionId = routeSelectionId || publicRecommendation?.selectionId || "";
  const card = publicRecommendation?.cards.find((item) => item.placeId === id);
  const [place, setPlace] = useState<Place | null>(null);
  const [photos, setPhotos] = useState<PlacePhotosData | null>(null);
  const [state, setState] = useState<"loading" | "content" | "error">("loading");
  const [photoAttempt, setPhotoAttempt] = useState(0);
  const [heroFailed, setHeroFailed] = useState(false);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [decisionVisible, setDecisionVisible] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "loading" | "saved" | "error">("idle");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const decisionTriggerRef = useRef<View>(null);

  useEffect(() => {
    let active = true;
    setState("loading");
    const placeRequest = getPlace(id);
    const photoRequest = selectionId ? getPlacePhotos({ placeId: id, selectionId }) : Promise.reject(new Error("missing selection"));
    Promise.allSettled([placeRequest, photoRequest]).then(([placeResult, photoResult]) => {
      if (!active) return;
      if (placeResult.status === "fulfilled") setPlace(placeResult.value.data.place);
      if (photoResult.status === "fulfilled") setPhotos(photoResult.value.data);
      setState(placeResult.status === "fulfilled" ? "content" : "error");
    });
    return () => { active = false; };
  }, [id, selectionId, photoAttempt]);

  const restriction = useMemo(() => { const note = place?.note?.trim(); return note && /(예약|투숙|입장|출입|통제|휴장|운영)/.test(note) ? note : null; }, [place?.note]);
  const hero = photos?.placeHero?.url ?? card?.placeHero?.url ?? place?.imageUrl;
  useEffect(() => setHeroFailed(false), [hero]);
  const attributions = (photos?.sourceAttributions ?? card?.sourceAttributions ?? []).map((source) => [source.label, source.author].filter(Boolean).join(" ")).join(", ");

  const openMap = () => { if (place) void openKakaoMap(place, place.lat != null && place.lng != null ? { lat: place.lat, lng: place.lng } : undefined); };
  const save = async () => {
    if (!place || !selectionId) return;
    setSaveStatus("loading");
    try { await localSceneStore.saveScene({ placeId: id, selectionId, selected: true }); setSaveStatus("saved"); } catch { setSaveStatus("error"); }
  };
  const share = async () => {
    if (!place || !API_BASE_URL) { Alert.alert("공개 링크를 만들 수 없어요", "운영 웹 주소 연결이 필요해요."); return; }
    const payload = buildPublicPlaceShare(API_BASE_URL, id, place.place_name);
    try { await Share.share({ title: payload.title, message: payload.message, url: payload.url }); } catch { setShareUrl(payload.url); }
  };

  if (state === "loading") return <View style={styles.center}><ActivityIndicator color={palette.forest} /><Text style={styles.stateText}>장소 정보를 불러오는 중이에요</Text></View>;
  if (state === "error" || !place) return <View style={styles.center}><Text style={styles.stateTitle}>장소 정보를 불러오지 못했어요</Text><Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backAction}><Text style={styles.backActionText}>추천으로 돌아가기</Text></Pressable></View>;

  return <View style={styles.screen}>
    <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}>
      <View style={styles.hero}>{hero && !heroFailed ? <Image source={{ uri: hero }} style={StyleSheet.absoluteFillObject} contentFit="cover" accessibilityLabel={`${place.place_name} 실제 풍경`} onError={() => setHeroFailed(true)} /> : <View style={styles.photoFallback}><BrandIcon name="image" size={42} color={palette.forestSoft} /><Text style={styles.photoFallbackText}>확보된 대표 사진이 없어요</Text></View>}<View style={styles.scrim} /><Pressable accessibilityRole="button" accessibilityLabel="추천으로 돌아가기" onPress={() => router.back()} style={[styles.back, { top: insets.top + 10 }]}><BrandIcon name="back" color={palette.white} /></Pressable><View style={styles.heroCopy}><Text style={styles.region}>{place.city}</Text><Text style={styles.name}>{place.place_name}</Text><Text style={styles.summary}>{card?.differenceNote ?? place.recommendation_use}</Text></View></View>
      <View style={styles.body}>
        {restriction ? <View style={styles.restriction}><BrandIcon name="warning" size={19} color={palette.error} /><Text style={styles.restrictionText}>{restriction}</Text></View> : null}
        <Section title="장면과 닮은 점">{card?.matchedFeatures.length ? card.matchedFeatures.map((feature) => <View key={feature} style={styles.feature}><BrandIcon name="check" size={16} color={palette.forest} /><Text style={styles.featureText}>{feature}</Text></View>) : <Text style={styles.bodyText}>확인된 특징 정보가 없어요.</Text>}</Section>
        {card?.differenceNote ? <Section title="알려진 차이"><Text style={styles.bodyText}>{card.differenceNote}</Text></Section> : null}
        <Section title="사진 포인트"><Text style={styles.bodyText}>{place.photo_point || "확인된 사진 포인트가 없어요."}</Text></Section>
        <Section title="실제 사진"><Pressable accessibilityRole="button" accessibilityLabel={`${place.place_name} 실제 사진 더 보기`} onPress={() => setGalleryVisible(true)} style={styles.galleryAction}><Text style={styles.galleryActionText}>실제 사진 더 보기</Text><Text style={styles.galleryStatus}>{galleryCopy(photos)}</Text><BrandIcon name="arrow-right" color={palette.forest} /></Pressable>{!photos ? <Pressable accessibilityRole="button" accessibilityLabel="사진 다시 불러오기" onPress={() => setPhotoAttempt((value) => value + 1)} style={styles.photoRetry}><Text style={styles.photoRetryText}>사진 다시 불러오기</Text></Pressable> : null}</Section>
        <Section title="이용 정보"><Info label="추천 시간" value={place.best_time || "확인 필요"} /><Info label="주소" value={place.address || "확인 필요"} /><Info label="이동 정보" value={place.accessibility || "확인 필요"} /></Section>
        {attributions ? <Text style={styles.attribution}>사진 출처: {attributions}</Text> : null}
      </View>
    </ScrollView>
    <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}><Pressable ref={decisionTriggerRef} accessibilityRole="button" onPress={() => { setSaveStatus("idle"); setShareUrl(null); setDecisionVisible(true); }} style={styles.choose}><Text style={styles.chooseText}>여기로 갈래요</Text><BrandIcon name="arrow-right" color={palette.white} /></Pressable></View>
    <Gallery visible={galleryVisible} name={place.place_name} photos={photos} onClose={() => setGalleryVisible(false)} />
    <DecisionSheet visible={decisionVisible} returnFocusRef={decisionTriggerRef} selectedPlace={{ region: place.city, name: place.place_name }} criticalRestriction={restriction} saveStatus={saveStatus} saveError="저장하지 못했어요. 다시 시도해 주세요." onOpenMap={openMap} onSave={() => void save()} onShare={() => void share()} onClose={() => setDecisionVisible(false)}>{shareUrl ? <View style={styles.shareFallback}><Text style={styles.shareFallbackLabel}>공유 링크</Text><Text selectable style={styles.shareFallbackUrl}>{shareUrl}</Text></View> : null}</DecisionSheet>
  </View>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>; }
function Info({ label, value }: { label: string; value: string }) { return <View style={styles.info}><Text style={styles.infoLabel}>{label}</Text><Text selectable style={styles.infoValue}>{value}</Text></View>; }
function galleryCopy(photos: PlacePhotosData | null) { if (!photos) return "사진 정보를 확인하지 못했어요"; if (photos.galleryStatus === "AVAILABLE") return `${photos.evidenceImages.length}장`; if (photos.galleryStatus === "ERROR") return "다시 시도해 주세요"; return "확보된 추가 사진이 없어요"; }
function Gallery({ visible, name, photos, onClose }: { visible: boolean; name: string; photos: PlacePhotosData | null; onClose: () => void }) {
  const images = photos?.evidenceImages ?? [];
  const { width } = useWindowDimensions();
  return <Modal visible={visible} animationType="fade" onRequestClose={onClose}><View style={styles.gallery}><View style={styles.galleryHead}><Text style={styles.galleryTitle}>{name} 실제 사진</Text><Pressable accessibilityRole="button" accessibilityLabel="사진 닫기" onPress={onClose} style={styles.galleryClose}><BrandIcon name="close" color={palette.white} /></Pressable></View>{images.length ? <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>{images.map((image) => <View key={image.url} style={[styles.galleryPage, { width }]}><Image source={{ uri: image.url }} style={StyleSheet.absoluteFillObject} contentFit="contain" accessibilityLabel={`${name} 실제 사진`} /><Text style={styles.galleryCredit}>{[image.attribution.label, image.attribution.author].filter(Boolean).join(" ")}</Text></View>)}</ScrollView> : <View style={styles.galleryEmpty}><Text style={styles.galleryEmptyText}>{photos?.galleryStatus === "ERROR" ? "사진을 불러오지 못했어요." : "확보된 추가 사진이 없어요."}</Text></View>}</View></Modal>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.ivory }, center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 28, backgroundColor: palette.ivory }, stateText: { fontFamily: fonts.body, fontSize: 15, color: palette.muted }, stateTitle: { fontFamily: fonts.serif, fontSize: 21, textAlign: "center", color: palette.ink }, backAction: { minHeight: 48, paddingHorizontal: 20, justifyContent: "center", borderRadius: radius.md, backgroundColor: palette.forest }, backActionText: { fontFamily: fonts.semibold, color: palette.white },
  hero: { minHeight: 380, justifyContent: "flex-end", backgroundColor: palette.sage }, photoFallback: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: 10 }, photoFallbackText: { fontFamily: fonts.medium, fontSize: 14, color: palette.forestSoft }, scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(9,31,25,.36)" }, back: { position: "absolute", left: 14, width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(9,31,25,.46)" }, heroCopy: { padding: 22, gap: 6 }, region: { fontFamily: fonts.semibold, fontSize: 13, color: palette.sage }, name: { fontFamily: fonts.serif, fontSize: 31, lineHeight: 41, color: palette.white }, summary: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: palette.white },
  body: { padding: 20, gap: 8 }, restriction: { flexDirection: "row", gap: 9, padding: 14, borderRadius: radius.sm, backgroundColor: "#FCECEA", borderWidth: 1, borderColor: "#E4B4AA" }, restrictionText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, color: palette.error }, section: { paddingTop: 24, gap: 10 }, sectionTitle: { fontFamily: fonts.serif, fontSize: 21, color: palette.ink }, feature: { flexDirection: "row", alignItems: "flex-start", gap: 8 }, featureText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, color: palette.forest }, bodyText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 24, color: palette.ink },
  galleryAction: { minHeight: 70, padding: 14, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: radius.md, backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line }, galleryActionText: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: palette.forest }, galleryStatus: { fontFamily: fonts.body, fontSize: 12, color: palette.muted }, info: { paddingVertical: 12, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: palette.line }, infoLabel: { fontFamily: fonts.medium, fontSize: 12, color: palette.muted }, infoValue: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: palette.ink }, attribution: { paddingTop: 22, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: palette.muted },
  photoRetry: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: radius.pill, borderWidth: 1, borderColor: palette.forest }, photoRetryText: { fontFamily: fonts.semibold, fontSize: 14, color: palette.forest },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10, backgroundColor: palette.paper, borderTopWidth: StyleSheet.hairlineWidth, borderColor: palette.line }, choose: { minHeight: 54, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: radius.pill, backgroundColor: palette.forest }, chooseText: { fontFamily: fonts.semibold, fontSize: 16, color: palette.white },
  gallery: { flex: 1, backgroundColor: palette.forestDeep }, galleryHead: { paddingTop: 48, minHeight: 106, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, galleryTitle: { fontFamily: fonts.serif, fontSize: 20, color: palette.white }, galleryClose: { width: 48, height: 48, alignItems: "center", justifyContent: "center" }, galleryPage: { flex: 1, justifyContent: "flex-end", padding: 20 }, galleryCredit: { fontFamily: fonts.body, fontSize: 12, color: palette.white }, galleryEmpty: { flex: 1, alignItems: "center", justifyContent: "center" }, galleryEmptyText: { fontFamily: fonts.body, fontSize: 15, color: palette.white },
  shareFallback: { gap: 4, padding: 12, borderRadius: radius.sm, backgroundColor: palette.ivory }, shareFallbackLabel: { fontFamily: fonts.semibold, fontSize: 12, color: palette.forest }, shareFallbackUrl: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: palette.ink },
});
