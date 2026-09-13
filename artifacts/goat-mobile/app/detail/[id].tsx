import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  findNodeHandle,
  InteractionManager,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  buildPublicPlaceShare,
  getPhotoCachePolicy,
  getPlace,
  getPlacePhotos,
  getPublicSelections,
  type CurrentWeather,
  type ExternalPlaceInfo,
  type OfficialTourInfo,
  type Place,
  type PlacePhotosData,
  type SourceAttribution,
} from "@workspace/api-client-react";
import { BrandIcon } from "@/src/components/BrandIcon";
import { DecisionSheet } from "@/src/components/discovery";
import { API_BASE_URL } from "@/src/config/api";
import { useApp } from "@/src/context/AppContext";
import { localSceneStore } from "@/src/services/deviceSceneStore";
import { createCourse } from "@/src/services/courseStore";
import { openKakaoMap } from "@/src/services/mapLink";
import { fonts, palette, radius } from "@/src/theme/editorial";

export default function DetailScreen() {
  const { id = "", selectionId: routeSelectionId = "" } = useLocalSearchParams<{
    id: string;
    selectionId?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { publicRecommendation, setCourse } = useApp();
  const contextualSelectionId =
    routeSelectionId || publicRecommendation?.selectionId || "";
  const [selectionId, setSelectionId] = useState(contextualSelectionId);
  const card = publicRecommendation?.cards.find((item) => item.placeId === id);
  const [place, setPlace] = useState<Place | null>(null);
  const [officialTourInfo, setOfficialTourInfo] =
    useState<OfficialTourInfo | null>(null);
  const [externalPlaceInfo, setExternalPlaceInfo] =
    useState<ExternalPlaceInfo | null>(null);
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(
    null,
  );
  const [photos, setPhotos] = useState<PlacePhotosData | null>(null);
  const [state, setState] = useState<"loading" | "content" | "error">(
    "loading",
  );
  const [contentAttempt, setContentAttempt] = useState(0);
  const [photoAttempt, setPhotoAttempt] = useState(0);
  const [heroFailed, setHeroFailed] = useState(false);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [decisionVisible, setDecisionVisible] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "loading" | "saved" | "error"
  >("idle");
  const [courseStatus, setCourseStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [saveNote, setSaveNote] = useState("");
  const [generalInfoExpanded, setGeneralInfoExpanded] = useState(false);
  const galleryTriggerRef = useRef<View>(null);
  const decisionTriggerRef = useRef<View>(null);
  useEffect(() => setGeneralInfoExpanded(false), [id]);

  useEffect(() => {
    if (contextualSelectionId) {
      setSelectionId(contextualSelectionId);
      return;
    }
    let active = true;
    void getPublicSelections().then(({ data }) => {
      const fallback = data.selections.find(
        ({ availability }) => availability === "AVAILABLE",
      );
      if (active && fallback) setSelectionId(fallback.selectionId);
    });
    return () => {
      active = false;
    };
  }, [contextualSelectionId]);

  useEffect(() => {
    let active = true;
    setState("loading");
    const placeRequest = getPlace(id);
    const photoRequest = selectionId
      ? getPlacePhotos({ placeId: id, selectionId })
      : Promise.reject(new Error("missing selection"));
    Promise.allSettled([placeRequest, photoRequest]).then(
      ([placeResult, photoResult]) => {
        if (!active) return;
        if (placeResult.status === "fulfilled") {
          setPlace(placeResult.value.data.place);
          setOfficialTourInfo(placeResult.value.data.officialTourInfo);
          setExternalPlaceInfo(placeResult.value.data.externalPlaceInfo);
          setCurrentWeather(placeResult.value.data.currentWeather);
        }
        if (photoResult.status === "fulfilled")
          setPhotos(photoResult.value.data);
        setState(placeResult.status === "fulfilled" ? "content" : "error");
        if (placeResult.status === "rejected")
          AccessibilityInfo.announceForAccessibility(
            "장소 정보를 불러오지 못했어요. 다시 시도할 수 있어요.",
          );
      },
    );
    return () => {
      active = false;
    };
  }, [id, selectionId, photoAttempt, contentAttempt]);

  const restriction = useMemo(() => {
    const note = place?.note?.trim();
    return note && /(예약|투숙|숙박|입장|출입|통제|휴장|운영)/.test(note)
      ? note
      : null;
  }, [place?.note]);
  const heroAsset = photos?.placeHero ?? card?.placeHero ?? null;
  const hero = heroAsset?.url;
  useEffect(() => setHeroFailed(false), [hero]);

  const openMap = () => {
    if (place) {
      const lat =
        officialTourInfo?.latitude ?? externalPlaceInfo?.latitude ?? place.lat;
      const lng =
        officialTourInfo?.longitude ??
        externalPlaceInfo?.longitude ??
        place.lng;
      void openKakaoMap(
        {
          ...place,
          address:
            officialTourInfo?.address ??
            externalPlaceInfo?.address ??
            place.address,
        },
        lat != null && lng != null ? { lat, lng } : undefined,
      );
    }
  };
  const continueCourse = async () => {
    if (!place || courseStatus === "loading") return;
    setCourseStatus("loading");
    try {
      const next = await createCourse(place, card?.matchedFeatures);
      setCourse(next);
      AccessibilityInfo.announceForAccessibility("여행 코스를 만들었어요");
      setDecisionVisible(false);
      router.push("/map");
    } catch {
      setCourseStatus("error");
      AccessibilityInfo.announceForAccessibility(
        "코스를 만들지 못했어요. 다시 시도해 주세요.",
      );
    }
  };
  const save = async () => {
    if (!place) return;
    if (!selectionId) {
      setSaveStatus("error");
      return;
    }
    setSaveStatus("loading");
    try {
      await localSceneStore.saveScene({
        placeId: id,
        selectionId,
        note: saveNote,
        selected: true,
      });
      setSaveStatus("saved");
      AccessibilityInfo.announceForAccessibility("내 장면에 저장했어요");
    } catch {
      setSaveStatus("error");
      AccessibilityInfo.announceForAccessibility(
        "저장하지 못했어요. 다시 시도해 주세요.",
      );
    }
  };
  const share = async () => {
    if (!place || !API_BASE_URL) {
      Alert.alert(
        "공개 링크를 만들 수 없어요",
        "운영 웹 주소 연결이 필요해요.",
      );
      return;
    }
    const payload = buildPublicPlaceShare(
      API_BASE_URL,
      id,
      place.place_name,
      selectionId,
    );
    try {
      await Share.share({
        title: payload.title,
        message: payload.message,
        url: payload.url,
      });
    } catch {
      setShareUrl(payload.url);
    }
  };

  if (state === "loading")
    return (
      <View style={styles.center}>
        <ActivityIndicator color={palette.forest} />
        <Text style={styles.stateText}>장소 정보를 불러오는 중이에요</Text>
      </View>
    );
  if (state === "error" || !place)
    return (
      <View style={styles.center} accessibilityLiveRegion="polite">
        <Text style={styles.stateTitle}>장소 정보를 불러오지 못했어요</Text>
        <Text style={styles.stateText}>
          이 화면에서 다시 시도하거나 추천으로 돌아갈 수 있어요.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="장소 정보 다시 불러오기"
          onPress={() => setContentAttempt((value) => value + 1)}
          style={styles.backAction}
        >
          <Text style={styles.backActionText}>다시 시도</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.secondaryAction}
        >
          <Text style={styles.secondaryActionText}>추천으로 돌아가기</Text>
        </Pressable>
      </View>
    );

  return (
    <View style={styles.screen}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
      >
        <View style={styles.hero}>
          {hero && !heroFailed ? (
            <Image
              source={{ uri: hero }}
              style={StyleSheet.absoluteFillObject}
              contentFit={heroAsset?.contentFit ?? "cover"}
              cachePolicy={heroAsset ? getPhotoCachePolicy(heroAsset) : "none"}
              accessibilityLabel={`${place.place_name} 실제 풍경`}
              onError={() => setHeroFailed(true)}
            />
          ) : (
            <View style={styles.photoFallback}>
              <BrandIcon name="image" size={42} color={palette.forestSoft} />
              <Text style={styles.photoFallbackText}>
                확보된 대표 사진이 없어요
              </Text>
            </View>
          )}
          <View style={styles.scrim} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="추천으로 돌아가기"
            onPress={() => router.back()}
            style={[styles.back, { top: insets.top + 10 }]}
          >
            <BrandIcon name="back" color={palette.white} />
          </Pressable>
          <View style={styles.heroCopy}>
            <Text style={styles.region}>{place.city}</Text>
            <Text style={styles.name}>{place.place_name}</Text>
            <Text style={styles.summary}>
              {card?.differenceNote ?? place.recommendation_use}
            </Text>
          </View>
        </View>
        {heroAsset ? <PhotoCredit attribution={heroAsset.attribution} /> : null}
        <View style={styles.body}>
          {restriction ? (
            <View style={styles.restriction}>
              <BrandIcon name="warning" size={19} color={palette.error} />
              <Text style={styles.restrictionText}>{restriction}</Text>
            </View>
          ) : null}
          <Section title="장면과 닮은 점">
            {card?.matchedFeatures.length ? (
              card.matchedFeatures.map((feature) => (
                <View key={feature} style={styles.feature}>
                  <BrandIcon name="check" size={16} color={palette.forest} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.bodyText}>확인된 특징 정보가 없어요.</Text>
            )}
          </Section>
          {card?.differenceNote ? (
            <Section title="알려진 차이">
              <Text style={styles.bodyText}>{card.differenceNote}</Text>
            </Section>
          ) : null}
          <Section title="사진 포인트">
            <Text style={styles.bodyText}>
              {place.photo_point || "확인된 사진 포인트가 없어요."}
            </Text>
          </Section>
          <Section title="실제 사진">
            <Pressable
              ref={galleryTriggerRef}
              accessibilityRole="button"
              accessibilityLabel={`${place.place_name} 실제 사진 더 보기`}
              onPress={() => setGalleryVisible(true)}
              style={styles.galleryAction}
            >
              <Text style={styles.galleryActionText}>실제 사진 더 보기</Text>
              <Text style={styles.galleryStatus}>{galleryCopy(photos)}</Text>
              <BrandIcon name="arrow-right" color={palette.forest} />
            </Pressable>
            {!photos ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="사진 다시 불러오기"
                onPress={() => setPhotoAttempt((value) => value + 1)}
                style={styles.photoRetry}
              >
                <Text style={styles.photoRetryText}>사진 다시 불러오기</Text>
              </Pressable>
            ) : null}
          </Section>
          <Section title="GOAT 추천 정보">
            <Info label="추천 시간" value={place.best_time || "확인 필요"} />
            <Info
              label="이동 참고"
              value={place.accessibility || "확인 필요"}
            />
          </Section>
          {officialTourInfo ? (
            <ExpandableInfo
              title="공식 관광정보"
              expanded={generalInfoExpanded}
              onToggle={() => setGeneralInfoExpanded((value) => !value)}
            >
              <Info label="공식 명칭" value={officialTourInfo.canonicalName} />
              {officialTourInfo.overview ? (
                <Info label="소개" value={officialTourInfo.overview} />
              ) : null}
              <ActionInfo
                label="주소"
                value={officialTourInfo.address || "확인 필요"}
                actionLabel="지도에서 보기"
                onPress={officialTourInfo.address ? openMap : undefined}
              />
              {officialTourInfo.usageTime ? (
                <Info label="이용 시간" value={officialTourInfo.usageTime} />
              ) : null}
              {officialTourInfo.restDate ? (
                <Info label="휴무일" value={officialTourInfo.restDate} />
              ) : null}
              {officialTourInfo.parking ? (
                <Info label="주차" value={officialTourInfo.parking} />
              ) : null}
              {officialTourInfo.phone ? (
                <ActionInfo
                  label="문의"
                  value={officialTourInfo.phone}
                  actionLabel="전화하기"
                  onPress={() =>
                    void openExternal(
                  `tel:${String(officialTourInfo.phone).replace(/[^+\d]/g, "")}`,
                      "전화 앱을 열 수 없어요.",
                    )
                  }
                />
              ) : null}
              {officialTourInfo.homepage ? (
                <ActionInfo
                  label="홈페이지"
                  value={officialTourInfo.homepage}
                  actionLabel="홈페이지 열기"
                  onPress={() =>
                    void openExternal(
                      officialTourInfo.homepage!,
                      "홈페이지를 열 수 없어요.",
                    )
                  }
                />
              ) : null}
              <Attribution attribution={officialTourInfo.attribution} />
            </ExpandableInfo>
          ) : externalPlaceInfo ? (
            <ExpandableInfo
              title={
                externalPlaceInfo.provider === "GOOGLE_PLACES"
                  ? "Google Places 이용 정보"
                  : "GOAT 편집 안내"
              }
              expanded={generalInfoExpanded}
              onToggle={() => setGeneralInfoExpanded((value) => !value)}
            >
              {externalPlaceInfo.provider === "GOOGLE_PLACES" ? (
                <>
                  <Info
                    label="Google 등록명"
                    value={externalPlaceInfo.canonicalName || "확인 필요"}
                  />
                  <ActionInfo
                    label="주소"
                    value={externalPlaceInfo.address || "확인 필요"}
                    actionLabel="지도에서 보기"
                    onPress={externalPlaceInfo.address ? openMap : undefined}
                  />
                  {externalPlaceInfo.businessStatus ? (
                    <Info
                      label="Google 등록 상태"
                      value={businessStatusCopy(
                        externalPlaceInfo.businessStatus,
                      )}
                    />
                  ) : null}
                  {externalPlaceInfo.openingHours?.length ? (
                    <Info
                      label="영업시간"
                      value={externalPlaceInfo.openingHours.join("\n")}
                    />
                  ) : null}
                  {externalPlaceInfo.phone ? (
                    <ActionInfo
                      label="전화"
                      value={externalPlaceInfo.phone}
                      actionLabel="전화하기"
                      onPress={() =>
                        void openExternal(
                          `tel:${externalPlaceInfo.phone!.replace(/[^+\d]/g, "")}`,
                          "전화 앱을 열 수 없어요.",
                        )
                      }
                    />
                  ) : null}
                  {externalPlaceInfo.homepage ? (
                    <ActionInfo
                      label="홈페이지"
                      value={externalPlaceInfo.homepage}
                      actionLabel="홈페이지 열기"
                      onPress={() =>
                        void openExternal(
                          externalPlaceInfo.homepage!,
                          "홈페이지를 열 수 없어요.",
                        )
                      }
                    />
                  ) : null}
                  <Attribution
                    attribution={externalPlaceInfo.attribution}
                    url={
                      externalPlaceInfo.googleMapsUri ??
                      externalPlaceInfo.attribution.sourceUrl
                    }
                    label="Google Maps에서 보기"
                  />
                </>
              ) : (
                <>
                  {externalPlaceInfo.scopeNotice ? (
                    <Info
                      label="편집 범위"
                      value={externalPlaceInfo.scopeNotice}
                    />
                  ) : null}
                  {externalPlaceInfo.representativePointNotice ? (
                    <Info
                      label="대표점 안내"
                      value={externalPlaceInfo.representativePointNotice}
                    />
                  ) : null}
                  <ActionInfo
                    label="대표 주소"
                    value={externalPlaceInfo.address || "확인 필요"}
                    actionLabel="지도에서 보기"
                    onPress={externalPlaceInfo.address ? openMap : undefined}
                  />
                  <Info
                    label="좌표 출처"
                    value="카카오맵 장소검색 기반 대표점"
                  />
                  <Attribution attribution={externalPlaceInfo.attribution} />
                </>
              )}
            </ExpandableInfo>
          ) : place.address ? (
            <Section title="보유 장소 정보">
              <ActionInfo
                label="주소"
                value={place.address}
                actionLabel="지도에서 보기"
                onPress={openMap}
              />
            </Section>
          ) : null}
          {currentWeather ? (
            <Section title="현재 날씨">
              <Info
                label="예보 시각"
                value={formatForecastTime(currentWeather.atKst)}
              />
              <Info label="상태" value={weatherCopy(currentWeather)} />
              {currentWeather.temperatureC != null ? (
                <Info label="기온" value={`${currentWeather.temperatureC}°C`} />
              ) : null}
              {currentWeather.windSpeedMps != null ? (
                <Info
                  label="바람"
                  value={`${currentWeather.windSpeedMps}m/s`}
                />
              ) : null}
            </Section>
          ) : null}
          <Section title="정보 출처">
            <Info label="추천·감성·사진 포인트" value="GOAT 자체 큐레이션" />
            {officialTourInfo ? (
              <Info
                label="이용정보 출처"
                value={officialTourInfo.attribution.label}
              />
            ) : externalPlaceInfo ? (
              <Info
                label="이용정보 출처"
                value={externalPlaceInfo.attribution.label}
              />
            ) : null}
            {currentWeather ? (
              <Info
                label="날씨정보 출처"
                value={currentWeather.attribution.label}
              />
            ) : null}
          </Section>
        </View>
      </ScrollView>
      <View
        style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}
      >
        <Pressable
          ref={decisionTriggerRef}
          accessibilityRole="button"
          onPress={() => {
            setSaveStatus("idle");
            setCourseStatus("idle");
            setShareUrl(null);
            setSaveNote("");
            setDecisionVisible(true);
            void localSceneStore
              .getScenes()
              .then((scenes) =>
                setSaveNote(
                  scenes.find(({ placeId }) => placeId === id)?.note ?? "",
                ),
              )
              .catch(() => undefined);
          }}
          style={styles.choose}
        >
          <Text style={styles.chooseText}>여기로 갈래요</Text>
          <BrandIcon name="arrow-right" color={palette.white} />
        </Pressable>
      </View>
      <Gallery
        visible={galleryVisible}
        name={place.place_name}
        photos={photos}
        returnFocusRef={galleryTriggerRef}
        onClose={() => setGalleryVisible(false)}
      />
      <DecisionSheet
        visible={decisionVisible}
        returnFocusRef={decisionTriggerRef}
        selectedPlace={{ region: place.city, name: place.place_name }}
        criticalRestriction={restriction}
        saveStatus={saveStatus}
        courseStatus={courseStatus}
        saveError="저장하지 못했어요. 다시 시도해 주세요."
        courseError="코스를 만들지 못했어요. 고른 장소는 그대로예요."
        note={saveNote}
        shareUrl={shareUrl}
        onNoteChange={setSaveNote}
        onOpenMap={openMap}
        onSave={() => void save()}
        onShare={() => void share()}
        onContinueCourse={() => void continueCourse()}
        onClose={() => setDecisionVisible(false)}
      />
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text selectable style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}
function ActionInfo({
  label,
  value,
  actionLabel,
  onPress,
}: {
  label: string;
  value: string;
  actionLabel: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text selectable style={styles.infoValue}>
        {value}
      </Text>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${value} ${actionLabel}`}
          onPress={onPress}
          style={styles.infoAction}
        >
          <Text style={styles.infoActionText}>{actionLabel}</Text>
          <BrandIcon name="external" size={15} color={palette.forest} />
        </Pressable>
      ) : null}
    </View>
  );
}
function ExpandableInfo({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.expandable}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title} ${expanded ? "접기" : "펼치기"}`}
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={styles.expandableToggle}
      >
        <View style={styles.expandableCopy}>
          <Text style={styles.expandableTitle}>{title}</Text>
          <Text style={styles.expandableCaption}>
            앱에서 현재 불러온 정보예요
          </Text>
        </View>
        <BrandIcon
          name="arrow-right"
          size={18}
          color={palette.forest}
          style={expanded ? styles.expandableIconOpen : undefined}
        />
      </Pressable>
      {expanded ? <View style={styles.expandableBody}>{children}</View> : null}
    </View>
  );
}
function Attribution({
  attribution,
  url = attribution.sourceUrl,
  label = "출처 보기",
}: {
  attribution: SourceAttribution;
  url?: string;
  label?: string;
}) {
  return (
    <View style={styles.attribution}>
      <Text style={styles.attributionText}>출처 · {attribution.label}</Text>
      {url ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${attribution.label} 출처 열기`}
          onPress={() => void openExternal(url, "출처 링크를 열 수 없어요.")}
          style={styles.attributionLink}
        >
          <Text style={styles.attributionLinkText}>{label}</Text>
          <BrandIcon name="external" size={15} color={palette.forest} />
        </Pressable>
      ) : null}
    </View>
  );
}
function PhotoCredit({
  attribution,
  dark = false,
}: {
  attribution: SourceAttribution;
  dark?: boolean;
}) {
  const textStyle = [
    styles.photoCreditText,
    dark && styles.photoCreditTextDark,
  ];
  const open = (url?: string) => {
    if (url) void openExternal(url, "사진 출처 링크를 열 수 없어요.");
  };
  return (
    <View style={[styles.photoCredit, dark && styles.photoCreditDark]}>
      <Text style={textStyle}>사진 출처 · {attribution.label}</Text>
      {attribution.author ? (
        attribution.authorUri ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`사진 작성자 ${attribution.author} 프로필 열기`}
            onPress={() => open(attribution.authorUri)}
            style={styles.creditLink}
          >
            <Text style={textStyle}>{attribution.author}</Text>
          </Pressable>
        ) : (
          <Text style={textStyle}>{attribution.author}</Text>
        )
      ) : null}
      {attribution.label === "Google Maps" && attribution.sourceUrl ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Google Maps에서 원본 사진 보기"
          onPress={() => open(attribution.sourceUrl)}
          style={styles.creditLink}
        >
          <Text style={textStyle}>원본 보기</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
function galleryCopy(photos: PlacePhotosData | null) {
  if (!photos) return "사진 정보를 확인하지 못했어요";
  if (photos.galleryStatus === "AVAILABLE")
    return `${photos.evidenceImages.length}장`;
  if (photos.galleryStatus === "ERROR") return "다시 시도해 주세요";
  return "확보된 추가 사진이 없어요";
}
function businessStatusCopy(value: string) {
  return value === "OPERATIONAL"
    ? "영업 중"
    : value === "CLOSED_TEMPORARILY"
      ? "임시 휴업"
      : value === "CLOSED_PERMANENTLY"
        ? "폐업"
        : value;
}
function formatForecastTime(value: string) {
  return /^\d{12}$/.test(value)
    ? `${value.slice(4, 6)}월 ${value.slice(6, 8)}일 ${value.slice(8, 10)}시`
    : value;
}
function weatherCopy(weather: CurrentWeather) {
  const sky =
    weather.sky === "CLEAR"
      ? "맑음"
      : weather.sky === "CLOUDY"
        ? "구름 많음"
        : weather.sky === "OVERCAST"
          ? "흐림"
          : "확인 필요";
  return weather.precipitation === "RAIN_OR_SNOW" ? `${sky} · 비 또는 눈` : sky;
}
async function openExternal(url: string, failureMessage: string) {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:", "tel:"].includes(parsed.protocol))
      throw new Error("unsupported link");
    if (!(await Linking.canOpenURL(url))) throw new Error("unavailable link");
    await Linking.openURL(url);
  } catch {
    Alert.alert(failureMessage);
    AccessibilityInfo.announceForAccessibility(failureMessage);
  }
}
function Gallery({
  visible,
  name,
  photos,
  returnFocusRef,
  onClose,
}: {
  visible: boolean;
  name: string;
  photos: PlacePhotosData | null;
  returnFocusRef: React.RefObject<View | null>;
  onClose: () => void;
}) {
  const images = photos?.evidenceImages ?? [];
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const closeRef = useRef<View>(null);
  const pagerRef = useRef<ScrollView>(null);
  const wasVisible = useRef(false);
  const [current, setCurrent] = useState(0);
  const [imageRatios, setImageRatios] = useState<Record<string, number>>({});
  const frameWidth = Math.min(width - 40, 420);
  const galleryHeaderHeight = Math.max(insets.top, 12) + 70;
  const galleryControlsHeight = images.length > 1 ? 60 : 0;
  const pagerHeight = Math.max(
    240,
    height - galleryHeaderHeight - Math.max(insets.bottom, 12) - galleryControlsHeight,
  );
  const maxFrameHeight = Math.max(160, pagerHeight - 48);
  const galleryPosition = images.length
    ? `${current + 1} / ${images.length}`
    : "사진 없음";
  useEffect(() => {
    if (visible) setCurrent(0);
  }, [visible]);
  const focus = (target: View | null | undefined) => {
    if (Platform.OS === "web") {
      (target as unknown as { focus?: () => void } | null)?.focus?.();
      return;
    }
    const handle = target ? findNodeHandle(target) : null;
    if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
  };
  const handleShow = () => {
    wasVisible.current = true;
    setCurrent(0);
    pagerRef.current?.scrollTo({ x: 0, animated: false });
    focus(closeRef.current);
  };
  const handleClose = () => {
    const shouldReturnFocus = wasVisible.current;
    wasVisible.current = false;
    onClose();
    if (shouldReturnFocus)
      InteractionManager.runAfterInteractions(() =>
        focus(returnFocusRef.current),
      );
  };
  const goTo = (next: number) => {
    const bounded = Math.max(0, Math.min(images.length - 1, next));
    pagerRef.current?.scrollTo({ x: bounded * width, animated: true });
    setCurrent(bounded);
    AccessibilityInfo.announceForAccessibility(
      `${name} 사진 ${bounded + 1} / ${images.length}`,
    );
  };
  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={handleClose}
      onShow={handleShow}
    >
      <View accessibilityViewIsModal style={styles.gallery}>
        <View
          style={[styles.galleryHead, { paddingTop: Math.max(insets.top, 12) }]}
        >
          <View style={styles.galleryHeading}>
            <Text
              lineBreakStrategyIOS="hangul-word"
              textBreakStrategy="balanced"
              android_hyphenationFrequency="none"
              style={styles.galleryTitle}
            >
              {name}
            </Text>
            <Text
              accessibilityLiveRegion="polite"
              style={styles.galleryPosition}
            >
              {galleryPosition}
            </Text>
          </View>
          <Pressable
            ref={closeRef}
            accessibilityRole="button"
            accessibilityLabel="사진 닫기"
            onPress={handleClose}
            style={styles.galleryClose}
          >
            <BrandIcon name="close" color={palette.white} />
          </Pressable>
        </View>
        {images.length ? (
          <ScrollView
            ref={pagerRef}
            style={[styles.galleryPager, { height: pagerHeight }]}
            horizontal
            pagingEnabled
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const next = Math.round(event.nativeEvent.contentOffset.x / width);
              setCurrent(next);
              AccessibilityInfo.announceForAccessibility(
                `${name} 사진 ${next + 1} / ${images.length}`,
              );
            }}
          >
            {images.map((image, index) => {
              const ratio = imageRatios[image.url] ?? 4 / 3;
              const resolvedFrameWidth = Math.min(
                frameWidth,
                maxFrameHeight * ratio,
              );
              return (
                <View key={image.url} style={[styles.galleryPage, { width, height: pagerHeight }]}>
                  <View
                    style={[
                      styles.galleryFrame,
                      { width: resolvedFrameWidth, aspectRatio: ratio },
                    ]}
                  >
                    <Image
                      source={{ uri: image.url }}
                      style={StyleSheet.absoluteFillObject}
                      contentFit="contain"
                      cachePolicy={getPhotoCachePolicy(image)}
                      accessible={index === current}
                      importantForAccessibility={index === current ? "auto" : "no-hide-descendants"}
                      accessibilityLabel={`${name} 실제 사진 ${index + 1}`}
                      onLoad={({ source }) => {
                        if (source.width > 0 && source.height > 0)
                          setImageRatios((ratios) =>
                            ratios[image.url]
                              ? ratios
                              : {
                                  ...ratios,
                                  [image.url]: source.width / source.height,
                                },
                          );
                      }}
                    />
                  </View>
                  <PhotoCredit attribution={image.attribution} dark />
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.galleryEmpty}>
            <Text style={styles.galleryEmptyText}>
              {photos?.galleryStatus === "ERROR"
                ? "사진을 불러오지 못했어요."
                : "확보된 추가 사진이 없어요."}
            </Text>
          </View>
        )}
        {images.length > 1 ? (
          <View style={styles.galleryControls}>
            <Pressable accessibilityRole="button" accessibilityLabel="이전 사진" accessibilityState={{ disabled: current === 0 }} disabled={current === 0} onPress={() => goTo(current - 1)} style={[styles.galleryNav, current === 0 && styles.galleryNavDisabled]}>
              <BrandIcon name="chevron-back" color={palette.white} />
              <Text style={styles.galleryNavText}>이전</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="다음 사진" accessibilityState={{ disabled: current === images.length - 1 }} disabled={current === images.length - 1} onPress={() => goTo(current + 1)} style={[styles.galleryNav, current === images.length - 1 && styles.galleryNavDisabled]}>
              <Text style={styles.galleryNavText}>다음</Text>
              <BrandIcon name="arrow-right" color={palette.white} />
            </Pressable>
          </View>
        ) : null}
        <View style={{ height: Math.max(insets.bottom, 12) }} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.ivory },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 28,
    backgroundColor: palette.ivory,
  },
  stateText: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
    color: palette.muted,
  },
  stateTitle: {
    fontFamily: fonts.serif,
    fontSize: 21,
    textAlign: "center",
    color: palette.ink,
  },
  backAction: {
    minHeight: 48,
    paddingHorizontal: 20,
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: palette.forest,
  },
  backActionText: { fontFamily: fonts.semibold, color: palette.white },
  secondaryAction: {
    minHeight: 48,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  secondaryActionText: { fontFamily: fonts.semibold, color: palette.forest },
  hero: {
    minHeight: 380,
    justifyContent: "flex-end",
    backgroundColor: palette.sage,
  },
  photoFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  photoFallbackText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: palette.forestSoft,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(9,31,25,.36)",
  },
  back: {
    position: "absolute",
    left: 14,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(9,31,25,.46)",
  },
  heroCopy: { padding: 22, gap: 6 },
  region: { fontFamily: fonts.semibold, fontSize: 13, color: palette.sage },
  name: {
    fontFamily: fonts.serif,
    fontSize: 31,
    lineHeight: 41,
    color: palette.white,
  },
  summary: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    color: palette.white,
  },
  body: { padding: 20, gap: 8 },
  restriction: {
    flexDirection: "row",
    gap: 9,
    padding: 14,
    borderRadius: radius.sm,
    backgroundColor: "#FCECEA",
    borderWidth: 1,
    borderColor: "#E4B4AA",
  },
  restrictionText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 21,
    color: palette.error,
  },
  section: { paddingTop: 24, gap: 10 },
  sectionTitle: { fontFamily: fonts.serif, fontSize: 21, color: palette.ink },
  feature: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  featureText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 22,
    color: palette.forest,
  },
  bodyText: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 24,
    color: palette.ink,
  },
  infoAction: {
    minHeight: 48,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoActionText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: palette.forest,
  },
  galleryAction: {
    minHeight: 70,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: radius.md,
    backgroundColor: palette.paper,
    borderWidth: 1,
    borderColor: palette.line,
  },
  galleryActionText: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: palette.forest,
  },
  galleryStatus: { fontFamily: fonts.body, fontSize: 12, color: palette.muted },
  info: {
    paddingVertical: 12,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
  },
  infoLabel: { fontFamily: fonts.medium, fontSize: 12, color: palette.muted },
  infoValue: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    color: palette.ink,
  },
  expandable: { paddingTop: 24 },
  expandableToggle: {
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.md,
    backgroundColor: palette.paper,
    borderWidth: 1,
    borderColor: palette.line,
  },
  expandableCopy: { flex: 1, gap: 2 },
  expandableTitle: {
    fontFamily: fonts.serif,
    fontSize: 19,
    lineHeight: 26,
    color: palette.ink,
  },
  expandableCaption: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    color: palette.muted,
  },
  expandableIconOpen: { transform: [{ rotate: "90deg" }] },
  expandableBody: { paddingHorizontal: 2 },
  attribution: {
    minHeight: 48,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  attributionText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.muted,
  },
  attributionLink: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  attributionLinkText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: palette.forest,
  },
  photoCredit: {
    minHeight: 48,
    paddingHorizontal: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    backgroundColor: palette.paper,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
  },
  photoCreditDark: {
    width: "100%",
    marginTop: 4,
    paddingHorizontal: 0,
    backgroundColor: "transparent",
    borderBottomWidth: 0,
  },
  photoCreditText: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: palette.muted,
  },
  photoCreditTextDark: { color: palette.white },
  creditLink: { minHeight: 48, justifyContent: "center" },
  photoRetry: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.forest,
  },
  photoRetryText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: palette.forest,
  },
  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: palette.paper,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
  },
  choose: {
    minHeight: 54,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.pill,
    backgroundColor: palette.forest,
  },
  chooseText: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: palette.white,
  },
  gallery: { flex: 1, backgroundColor: palette.forestDeep },
  galleryHead: {
    minHeight: 82,
    paddingHorizontal: 18,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  galleryHeading: { flex: 1, gap: 3 },
  galleryTitle: {
    fontFamily: fonts.serif,
    fontSize: 20,
    lineHeight: 28,
    color: palette.white,
  },
  galleryPosition: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: palette.sage,
    fontVariant: ["tabular-nums"],
  },
  galleryClose: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  galleryPager: { flexGrow: 0, flexShrink: 0 },
  galleryPage: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  galleryFrame: {
    overflow: "hidden",
    borderRadius: radius.md,
    backgroundColor: palette.forest,
  },
  galleryControls: { minHeight: 60, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  galleryNav: { minWidth: 96, minHeight: 48, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,.12)" },
  galleryNavDisabled: { opacity: 0.35 },
  galleryNavText: { fontFamily: fonts.semibold, fontSize: 14, color: palette.white },
  galleryEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  galleryEmptyText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: palette.white,
  },
  shareFallback: {
    gap: 4,
    padding: 12,
    borderRadius: radius.sm,
    backgroundColor: palette.ivory,
  },
  shareFallbackLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: palette.forest,
  },
  shareFallbackUrl: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: palette.ink,
  },
});
