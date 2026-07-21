import React, { useEffect, useRef, useState } from 'react';
import {
  View, ScrollView, StyleSheet, Text,
  TouchableOpacity, Alert, Platform, Linking, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '@/src/components/Header';
import { TagBadge } from '@/src/components/TagBadge';
import { RecommendationRoleBadge } from '@/src/components/RecommendationRoleBadge';
import { EmptyState } from '@/src/components/EmptyState';
import { recommendCourse, RecommendCourseData, useGetPlace } from '@workspace/api-client-react';
import { useApp } from '@/src/context/AppContext';
import { openKakaoMap } from '@/src/services/mapLink';
import { getRegionPalette } from '@/src/utils/regionColors';
import { toggleBookmark, isBookmarked } from '@/src/services/bookmarkService';
import { usePlacePhoto } from '@/src/hooks/usePlacePhoto';
import { useTourInfo } from '@/src/hooks/useTourInfo';
import { useVisitConcentration } from '@/src/hooks/useVisitConcentration';
import { VISIT_NOTE } from '@/src/services/ktoVisitApi';
import { useColors } from '@/hooks/useColors';
import { Place, RecommendationRole } from '@/src/types/place';
import { resolveApiUrl } from '@/src/config/api';

const HERO_PHOTO_HEIGHT = 240;

function getPhotoSource(photo: NonNullable<ReturnType<typeof usePlacePhoto>['photo']>) {
  return photo.imageSource ?? { uri: photo.imageUrl! };
}

function normalizeCoursePurpose(purpose?: string | null) {
  if (!purpose) return undefined;
  if (purpose.includes('사진')) return '사진·포토스팟';
  if (purpose.includes('산책') || purpose.includes('휴식')) return '산책·힐링';
  if (purpose.includes('액티비티') || purpose.includes('체험')) return '체험·액티비티';
  if (purpose.includes('카페')) return '카페·실내휴식';
  if (purpose.includes('전시') || purpose.includes('건축')) return '전시·건축관람';
  if (purpose.includes('먹거리') || purpose.includes('야간')) return '먹거리·야간탐방';
  if (purpose.includes('숙소') || purpose.includes('리조트')) return '숙소·리조트';
  return '사진·포토스팟';
}

function normalizeTransport(transport?: string | null) {
  if (!transport) return undefined;
  if (transport.includes('대중')) return '대중교통';
  if (transport.includes('도보') || transport.includes('뚜벅')) return '도보중심';
  return '자차';
}

export default function DetailScreen() {
  const router = useRouter();
  const { id, role, reason } = useLocalSearchParams<{ id: string; role?: string; reason?: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const { selectedMood, recommendations, travelPreferences } = useApp();
  const { data, isLoading, isError, refetch } = useGetPlace(id ?? '');

  const place = data?.data.place as Place | undefined;
  const alternatives = place
    ? recommendations
        .map((card) => card.place)
        .filter((candidate) => candidate.place_id !== place.place_id)
        .slice(0, 3)
    : [];
  const region = place ? getRegionPalette(place.region_group) : null;

  const [bookmarked, setBookmarked] = useState(false);
  const [course, setCourse] = useState<RecommendCourseData | null>(null);
  const [courseLoading, setCourseLoading] = useState(false);
  const [courseError, setCourseError] = useState<string | null>(null);
  const courseRequestSequence = useRef(0);

  const { photo } = usePlacePhoto(
    place?.place_name ?? '',
    place?.primary_mood ?? '',
    place?.mood_tags ?? [],
    place?.city
  );
  const { info: tourInfo } = useTourInfo(place?.place_name ?? '', place?.city ?? '');
  const { concentration } = useVisitConcentration(
    place?.place_name ?? '',
    place?.city ?? ''
  );

  useEffect(() => {
    if (!place) return;
    isBookmarked(place.place_id).then(setBookmarked);
  }, [place?.place_id]);

  async function loadCourseForPlace(targetPlace: Place) {
    const requestSequence = ++courseRequestSequence.current;
    setCourseLoading(true);
    setCourseError(null);
    try {
      const referenceCard = selectedMood?.referenceCards?.[0];
      const userMoodTags = Array.from(new Set([
        ...(referenceCard?.moodTags ?? []),
        ...(selectedMood?.keywords ?? []),
        ...targetPlace.mood_tags,
      ])).slice(0, 10);
      const userSceneTags = Array.from(new Set([
        ...(referenceCard?.sceneTags ?? []),
        ...(selectedMood?.keywords ?? []),
        ...targetPlace.mood_tags,
      ])).slice(0, 10);
      const result = await recommendCourse({
        selectedPlaceId: targetPlace.place_id,
        primaryTheme: (selectedMood?.name ?? targetPlace.primary_mood) as any,
        userMoodTags,
        userSceneTags,
        companionType: travelPreferences?.companion as any,
        travelPurpose: normalizeCoursePurpose(travelPreferences?.purpose) as any,
        transportType: normalizeTransport(travelPreferences?.transport) as any,
      });
      if (result.data.status === 'FAILED' || result.data.stops.length === 0) {
        throw new Error(result.data.failReason ?? 'EMPTY_COURSE');
      }
      if (requestSequence !== courseRequestSequence.current) return;
      setCourse(result.data);
    } catch {
      if (requestSequence !== courseRequestSequence.current) return;
      setCourse(null);
      setCourseError('하루 코스를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      if (requestSequence === courseRequestSequence.current) setCourseLoading(false);
    }
  }

  useEffect(() => {
    if (!place) return;
    setCourse(null);
    loadCourseForPlace(place);
    return () => {
      courseRequestSequence.current += 1;
    };
  }, [
    place?.place_id,
    selectedMood?.id,
    travelPreferences?.companion,
    travelPreferences?.purpose,
    travelPreferences?.transport,
  ]);

  if (isLoading) {
    return (
      <View style={[styles.root, styles.loadingState, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>장소 정보를 불러오는 중이에요</Text>
      </View>
    );
  }

  async function handleBookmark() {
    if (!place) return;
    const saved = await toggleBookmark(place);
    setBookmarked(saved);
  }

  async function handleKakaoMap() {
    if (!place) return;
    const coords =
      tourInfo?.latitude && tourInfo?.longitude
        ? { lat: tourInfo.latitude, lng: tourInfo.longitude }
        : undefined;
    try {
      await openKakaoMap(place, coords);
    } catch {
      Alert.alert('지도 앱 열기', '카카오맵을 열 수 없어 웹 지도로 연결할게요.', [{ text: '확인' }]);
    }
  }

  if (isError || !place) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <Header title="장소 상세" onBack={() => router.back()} />
        <EmptyState
          title="장소를 찾을 수 없습니다"
          description="서버 연결을 확인하고 다시 시도해주세요."
          actionLabel="다시 시도"
          onAction={() => refetch()}
        />
      </View>
    );
  }

  const typedRole = role as RecommendationRole | undefined;
  const accentColor = region?.accent ?? colors.primary;
  const heroBg = region?.bg ?? colors.secondary;
  const heroBorder = region?.border ?? colors.border;
  const hasPhoto = !!(photo?.imageUrl || photo?.imageSource);

  const crowdLevel = concentration?.concentrationLevel ?? 'unknown';
  const crowdNote = crowdLevel !== 'unknown' ? VISIT_NOTE[crowdLevel] : null;

  const hasOfficialInfo =
    tourInfo?.source === 'KTO_TOUR_INFO' &&
    (tourInfo.address || tourInfo.usageTime || tourInfo.parking || tourInfo.restDate);
  const hasOverview = !!tourInfo?.overview;
  const hasContact = !!(tourInfo?.phone || tourInfo?.homepage);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header
        title={place.place_name}
        onBack={() => router.back()}
        right={
          <TouchableOpacity
            onPress={handleBookmark}
            style={styles.bookmarkBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={bookmarked ? '북마크 해제' : '북마크 저장'}
            accessibilityState={{ selected: bookmarked }}
          >
            <Feather
              name="bookmark"
              size={20}
              color={bookmarked ? accentColor : colors.mutedForeground}
              style={bookmarked ? { opacity: 1 } : { opacity: 0.5 }}
            />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero photo ── */}
        {hasPhoto ? (
          <View style={styles.photoHeroWrap}>
            <Image
              source={getPhotoSource(photo!)}
              style={styles.photoHero}
              contentFit="cover"
              transition={400}
            />
            <View style={styles.photoHeroScrim} />
            <View style={styles.photoHeroOverlay}>
              <View style={styles.typeBadgeDark}>
                <Text style={styles.typeBadgeDarkText}>{place.place_type}</Text>
              </View>
              <View style={styles.regionPillDark}>
                <View style={[styles.regionDot, { backgroundColor: '#FFF' }]} />
                <Text style={styles.regionPillDarkText}>
                  {place.city} · {region?.label ?? place.region_group}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.colorHero, { backgroundColor: heroBg, borderBottomColor: heroBorder }]}>
            <View style={styles.heroTopRow}>
              <View style={[styles.typeBadge, { backgroundColor: accentColor + '22', borderColor: accentColor + '44' }]}>
                <Text style={[styles.typeBadgeText, { color: accentColor }]}>{place.place_type}</Text>
              </View>
              <View style={[styles.regionPill, { backgroundColor: heroBg, borderColor: heroBorder }]}>
                <View style={[styles.regionDot, { backgroundColor: accentColor }]} />
                <Text style={[styles.regionPillText, { color: accentColor }]}>
                  {place.city} · {region?.label ?? place.region_group}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Identity ── */}
        <View style={[styles.identityBlock, { borderBottomColor: heroBorder, borderBottomWidth: 1 }]}>
          <Text style={[styles.placeName, { color: colors.foreground }]}>{place.place_name}</Text>
          <Text style={[styles.moodSubtitle, { color: accentColor }]}>{place.primary_mood}</Text>

          <View style={styles.heroTagRow}>
            {place.mood_tags.slice(0, 5).map((tag) => (
              <View key={tag} style={[styles.heroTag, { backgroundColor: accentColor + '18', borderColor: accentColor + '35' }]}>
                <Text style={[styles.heroTagText, { color: accentColor }]}>#{tag}</Text>
              </View>
            ))}
          </View>

          {!!place.photo_point && (
            <View style={[styles.photoQuote, { backgroundColor: accentColor + '14', borderLeftColor: accentColor }]}>
              <Feather name="camera" size={12} color={accentColor} style={{ marginTop: 1 }} />
              <Text style={[styles.photoQuoteText, { color: colors.foreground }]}>{place.photo_point}</Text>
            </View>
          )}

          {typedRole && (
            <View style={styles.roleWrap}>
              <RecommendationRoleBadge role={typedRole} />
            </View>
          )}

          {hasPhoto && (
            <Text style={[styles.photoCredit, { color: colors.mutedForeground }]}>
              📷 사진 출처: {photo?.source === 'LOCAL_PLACE_IMAGE' ? '프로젝트 보조 이미지' : '한국관광공사'}
            </Text>
          )}
        </View>

        {/* ── Reason ── */}
        {!!reason && (
          <InfoCard colors={colors} icon="zap" title="추천 이유">
            <Text style={[styles.bodyText, { color: colors.primary }]}>{reason}</Text>
          </InfoCard>
        )}

        {/* ── Overview (장소 소개) ── */}
        {hasOverview && (
          <InfoCard colors={colors} icon="book-open" title="장소 소개">
            <Text style={[styles.bodyText, { color: colors.foreground }]} numberOfLines={4}>
              {tourInfo!.overview}
            </Text>
          </InfoCard>
        )}

        {/* ── Mood tags ── */}
        <InfoCard colors={colors} icon="tag" title="분위기 태그">
          <View style={styles.tagRow}>
            {place.mood_tags.map((tag) => <TagBadge key={tag} label={`#${tag}`} />)}
          </View>
        </InfoCard>

        <CourseRecommendationSection
          colors={colors}
          accentColor={accentColor}
          course={course}
          loading={courseLoading}
          error={courseError}
          onRetry={() => loadCourseForPlace(place)}
        />

        {/* ── Visit tips ── */}
        <InfoCard colors={colors} icon="sun" title="방문 팁">
          <InfoRow label="추천 시간" value={place.best_time} colors={colors} />
          <InfoRow label="추천 계절" value={place.best_season} colors={colors} />
          <InfoRow label="접근성" value={place.accessibility} colors={colors} />
          {crowdNote && (
            <View style={[styles.crowdNote, { backgroundColor: accentColor + '10', borderColor: accentColor + '30' }]}>
              <Feather name="users" size={12} color={accentColor} style={{ marginTop: 1 }} />
              <Text style={[styles.crowdNoteText, { color: colors.foreground }]}>{crowdNote}</Text>
            </View>
          )}
        </InfoCard>

        {/* ── Official info (기본 정보) ── */}
        {hasOfficialInfo && (
          <InfoCard colors={colors} icon="info" title="기본 정보">
            {!!tourInfo?.address && (
              <InfoRow label="주소" value={tourInfo.address} colors={colors} />
            )}
            {!!tourInfo?.usageTime && (
              <InfoRow label="이용 시간" value={tourInfo.usageTime} colors={colors} />
            )}
            {!!tourInfo?.restDate && (
              <InfoRow label="쉬는 날" value={tourInfo.restDate} colors={colors} />
            )}
            {!!tourInfo?.parking && (
              <InfoRow label="주차" value={tourInfo.parking} colors={colors} />
            )}
            {hasContact && (
              <View style={styles.contactRow}>
                {!!tourInfo?.phone && (
                  <TouchableOpacity
                    style={[styles.contactBtn, { borderColor: colors.border }]}
                    onPress={() => Linking.openURL(`tel:${tourInfo.phone!.replace(/[^0-9]/g, '')}`)}
                    activeOpacity={0.7}
                  >
                    <Feather name="phone" size={12} color={colors.primary} />
                    <Text style={[styles.contactBtnText, { color: colors.primary }]}>전화 연결</Text>
                  </TouchableOpacity>
                )}
                {!!tourInfo?.homepage && (
                  <TouchableOpacity
                    style={[styles.contactBtn, { borderColor: colors.border }]}
                    onPress={() => Linking.openURL(tourInfo.homepage!)}
                    activeOpacity={0.7}
                  >
                    <Feather name="external-link" size={12} color={colors.primary} />
                    <Text style={[styles.contactBtnText, { color: colors.primary }]}>홈페이지</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </InfoCard>
        )}

        {/* ── Purpose ── */}
        <InfoCard colors={colors} icon="star" title="추천 용도">
          <Text style={[styles.bodyText, { color: colors.foreground }]}>{place.recommendation_use}</Text>
        </InfoCard>

        {/* ── Caution ── */}
        {!!place.note && (
          <View style={[styles.cautionCard, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
            <View style={styles.cautionHeader}>
              <Feather name="alert-triangle" size={14} color="#D97706" />
              <Text style={styles.cautionTitle}>방문 전 확인해주세요</Text>
            </View>
            <Text style={styles.cautionBody}>{place.note}</Text>
          </View>
        )}

        {/* ── Same-mood alternatives ── */}
        {alternatives.length > 0 && (
          <InfoCard colors={colors} icon="compass" title="같은 감성 대안">
            <Text style={[styles.altHint, { color: colors.mutedForeground }]}>
              비슷한 감성을 더 여유롭게 즐길 수 있어요
            </Text>
            {alternatives.map((alt) => (
              <AlternativeCard
                key={alt.place_id}
                place={alt}
                colors={colors}
                onPress={() =>
                  router.replace({ pathname: '/detail/[id]', params: { id: alt.place_id } })
                }
              />
            ))}
          </InfoCard>
        )}
      </ScrollView>

      {/* ── Sticky bottom CTA ── */}
      <View style={[styles.stickyBottom, {
        backgroundColor: colors.background,
        borderTopColor: colors.border,
        paddingBottom: bottomPad + 12,
      }]}>
        <TouchableOpacity style={styles.kakaoBtn} onPress={handleKakaoMap} activeOpacity={0.85}>
          <Feather name="navigation" size={16} color="#3A1D00" />
          <Text style={styles.kakaoBtnText}>카카오맵에서 보기</Text>
          {tourInfo?.latitude && (
            <View style={styles.coordsBadge}>
              <Text style={styles.coordsBadgeText}>좌표 기반</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InfoCard({ title, icon, colors, children }: {
  title: string; icon: string; colors: any; children: React.ReactNode;
}) {
  return (
    <View style={[styles.infoCard, { borderBottomColor: colors.border }]}>
      <View style={styles.infoCardHeader}>
        <Feather name={icon as any} size={13} color={colors.primary} />
        <Text style={[styles.infoCardTitle, { color: colors.foreground }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function InfoRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

function KakaoCourseMap({ course, colors }: { course: RecommendCourseData; colors: any }) {
  const config = course.staticMap.staticMapConfig as any;
  const markers = Array.isArray(config?.markers) ? config.markers : [];
  const center = config?.center;
  const iframeMapUrl = center && markers.length > 0
    ? resolveApiUrl(`/api/course-map?${new URLSearchParams({
        centerLat: String(center.lat),
        centerLng: String(center.lng),
        level: String(config?.level ?? 7),
        markers: JSON.stringify(markers.map((marker: any) => ({
          order: marker.order,
          title: marker.title,
          lat: marker.lat,
          lng: marker.lng,
        }))),
      }).toString()}`)
    : null;
  const containerId = `goat-course-map-${course.stops
    .map((stop) => stop.id)
    .join('-')
    .replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !center || markers.length === 0) return;
    setMapError(null);
    if (!config?.sdkScriptUrl) {
      setMapError('카카오 지도 설정을 불러오지 못해 대체 지도를 표시해요.');
      return;
    }

    const win = globalThis as any;
    const maybeDoc = win.document as Document | undefined;
    if (!maybeDoc) return;
    const doc = maybeDoc;
    let cancelled = false;
    const loadTimeout = setTimeout(() => {
      if (!cancelled) setMapError('카카오 지도 응답이 늦어 대체 지도를 표시해요.');
    }, 8_000);

    function markFailed(message: string) {
      if (cancelled) return;
      clearTimeout(loadTimeout);
      setMapError(message);
    }

    function renderMap() {
      const kakao = win.kakao;
      const container = doc.getElementById(containerId);
      if (!kakao?.maps) {
        markFailed('카카오 지도를 불러오지 못했어요.');
        return;
      }
      if (!container) return;

      const centerLat = Number(center.lat);
      const centerLng = Number(center.lng);
      if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng)) {
        markFailed('지도 중심 좌표가 올바르지 않아요.');
        return;
      }

      container.innerHTML = '';
      const map = new kakao.maps.Map(container, {
        center: new kakao.maps.LatLng(centerLat, centerLng),
        level: Number(config.level ?? 7),
      });
      const bounds = new kakao.maps.LatLngBounds();
      const path: unknown[] = [];

      markers.forEach((marker: any) => {
        const lat = Number(marker.lat);
        const lng = Number(marker.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        const position = new kakao.maps.LatLng(lat, lng);
        bounds.extend(position);
        path.push(position);

        new kakao.maps.Marker({
          map,
          position,
          title: String(marker.title ?? ''),
        });

        new kakao.maps.CustomOverlay({
          map,
          position,
          yAnchor: 1.55,
          content: `<div style="min-width:22px;height:22px;border-radius:999px;background:#0ea5e9;color:#fff;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">${marker.order ?? ''}</div>`,
        });
      });

      if (path.length > 1) {
        new kakao.maps.Polyline({
          map,
          path,
          strokeWeight: 4,
          strokeColor: '#0EA5E9',
          strokeOpacity: 0.85,
          strokeStyle: 'solid',
        });
        map.setBounds(bounds);
      }
      if (!cancelled) {
        clearTimeout(loadTimeout);
        setMapError(null);
      }
    }

    function renderWhenReady() {
      const kakao = win.kakao;
      if (kakao?.maps?.load) {
        kakao.maps.load(renderMap);
        return;
      }
      renderMap();
    }

    if (win.kakao?.maps) {
      renderWhenReady();
      return () => {
        cancelled = true;
        clearTimeout(loadTimeout);
      };
    }

    const scriptId = 'goat-kakao-map-sdk';
    const existingScript = doc.getElementById(scriptId) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', renderWhenReady, { once: true });
      return () => {
        cancelled = true;
        clearTimeout(loadTimeout);
        existingScript.removeEventListener('load', renderWhenReady);
      };
    }

    const rawSdkScriptUrl = String(config.sdkScriptUrl);
    const sdkScriptUrl = rawSdkScriptUrl.includes('autoload=')
      ? rawSdkScriptUrl
      : `${rawSdkScriptUrl}${rawSdkScriptUrl.includes('?') ? '&' : '?'}autoload=false`;
    const script = doc.createElement('script');
    script.id = scriptId;
    script.async = true;
    script.src = sdkScriptUrl;
    script.onload = renderWhenReady;
    script.onerror = () => markFailed('카카오 지도를 불러오지 못했어요.');
    doc.head.appendChild(script);
    return () => {
      cancelled = true;
      clearTimeout(loadTimeout);
      script.onload = null;
      script.onerror = null;
    };
  }, [center, config, containerId, markers]);

  if (Platform.OS !== 'web' || !config || !center || markers.length === 0) return null;

  return (
    <View style={[styles.courseMapWrap, { borderColor: colors.border }]}>
      {mapError && iframeMapUrl
        ? React.createElement('iframe', {
            src: iframeMapUrl,
            title: 'GOAT course map',
            style: {
              width: '100%',
              height: 240,
              border: 0,
              borderRadius: 12,
              overflow: 'hidden',
              background: '#E5E7EB',
            },
          })
        : React.createElement('div', {
            id: containerId,
            style: {
              width: '100%',
              height: 240,
              borderRadius: 12,
              overflow: 'hidden',
              background: '#E5E7EB',
            },
          })}
      {!!mapError && !iframeMapUrl && (
        <Text style={[styles.courseMapErrorText, { color: colors.mutedForeground }]}>
          {mapError}
        </Text>
      )}
    </View>
  );
}

function CourseRecommendationSection({
  colors,
  accentColor,
  course,
  loading,
  error,
  onRetry,
}: {
  colors: any;
  accentColor: string;
  course: RecommendCourseData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const modeLabel = course?.mode === 'LLM_OPENROUTER' ? 'AI 코스' : '기본 코스';
  const mapUrl = course?.staticMap.fallbackMapSearchUrl;

  return (
    <InfoCard colors={colors} icon="map" title="선택 장소 중심 하루 코스">
      {loading && (
        <View style={styles.courseLoadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.courseHintText, { color: colors.mutedForeground }]}>
            동행자와 여행 조건에 맞춰 코스를 만드는 중이에요.
          </Text>
        </View>
      )}

      {!loading && error && (
        <View style={[styles.courseNoticeBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Text style={[styles.courseHintText, { color: colors.mutedForeground }]}>{error}</Text>
          <TouchableOpacity style={[styles.courseRetryBtn, { borderColor: colors.border }]} onPress={onRetry}>
            <Text style={[styles.courseRetryText, { color: colors.primary }]}>다시 생성</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && course && (
        <View>
          <View style={styles.courseTitleRow}>
            <View style={[styles.courseModeBadge, { backgroundColor: accentColor + '18', borderColor: accentColor + '35' }]}>
              <Text style={[styles.courseModeText, { color: accentColor }]}>{modeLabel}</Text>
            </View>
            <Text style={[styles.courseCandidateText, { color: colors.mutedForeground }]}>
              후보 {course.nearbyCandidateCount}곳 반영
            </Text>
          </View>

          {!!course.courseTitle && (
            <Text style={[styles.courseTitle, { color: colors.foreground }]}>{course.courseTitle}</Text>
          )}
          {!!course.summary && (
            <Text style={[styles.courseSummary, { color: colors.mutedForeground }]}>{course.summary}</Text>
          )}

          <KakaoCourseMap course={course} colors={colors} />

          <View style={styles.courseStopList}>
            {course.stops.map((stop, index) => (
              <View key={`${stop.id}-${stop.order}`} style={styles.courseStopRow}>
                <View style={styles.courseTimeline}>
                  <View style={[styles.courseOrderDot, { backgroundColor: accentColor }]}>
                    <Text style={styles.courseOrderText}>{stop.order}</Text>
                  </View>
                  {index < course.stops.length - 1 && (
                    <View style={[styles.courseTimelineLine, { backgroundColor: colors.border }]} />
                  )}
                </View>
                <View style={styles.courseStopContent}>
                  <View style={styles.courseStopHeader}>
                    <Text style={[styles.courseStopTitle, { color: colors.foreground }]}>{stop.title}</Text>
                    <Text style={[styles.courseStayText, { color: colors.mutedForeground }]}>
                      {stop.stayMinutes}분
                    </Text>
                  </View>
                  {!!stop.address && (
                    <Text style={[styles.courseAddressText, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {stop.address}
                    </Text>
                  )}
                  <Text style={[styles.courseReasonText, { color: colors.foreground }]}>{stop.reason}</Text>
                </View>
              </View>
            ))}
          </View>

          {!!mapUrl && (
            <TouchableOpacity
              style={[styles.courseMapBtn, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '35' }]}
              onPress={() => Linking.openURL(mapUrl)}
              activeOpacity={0.75}
            >
              <Feather name="map-pin" size={14} color={colors.primary} />
              <Text style={[styles.courseMapBtnText, { color: colors.primary }]}>카카오맵에서 코스 기준 장소 보기</Text>
            </TouchableOpacity>
          )}

          {course.warnings.length > 0 && (
            <Text style={[styles.courseWarningText, { color: colors.mutedForeground }]}>
              {course.warnings[0]}
            </Text>
          )}
        </View>
      )}
    </InfoCard>
  );
}

function AlternativeCard({ place, colors, onPress }: {
  place: Place; colors: any; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.altCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.8}
    >
      <View style={styles.altContent}>
        <Text style={[styles.altName, { color: colors.foreground }]}>{place.place_name}</Text>
        <Text style={[styles.altMeta, { color: colors.mutedForeground }]}>{place.city} · {place.place_type}</Text>
        <View style={styles.altTags}>
          {place.mood_tags.slice(0, 3).map((tag) => (
            <View key={tag} style={[styles.altTag, { backgroundColor: colors.muted }]}>
              <Text style={[styles.altTagText, { color: colors.mutedForeground }]}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingState: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  scroll: { paddingBottom: 40 },
  bookmarkBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  photoHeroWrap: { width: '100%', height: HERO_PHOTO_HEIGHT, position: 'relative', backgroundColor: '#E5E5E5' },
  photoHero: { width: '100%', height: HERO_PHOTO_HEIGHT },
  photoHeroScrim: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: 'rgba(0,0,0,0.18)' },
  photoHeroOverlay: { position: 'absolute', top: 12, left: 16, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  typeBadgeDark: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 7, backgroundColor: 'rgba(0,0,0,0.45)' },
  typeBadgeDarkText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
  regionPillDark: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 7, backgroundColor: 'rgba(0,0,0,0.35)' },
  regionPillDarkText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#FFF' },

  colorHero: { paddingVertical: 20, paddingHorizontal: 20, borderBottomWidth: 1 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 7, borderWidth: 1 },
  typeBadgeText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  regionPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 7, borderWidth: 1 },
  regionDot: { width: 6, height: 6, borderRadius: 3 },
  regionPillText: { fontSize: 12, fontFamily: 'Inter_500Medium' },

  identityBlock: { paddingVertical: 20, paddingHorizontal: 20, gap: 10 },
  placeName: { fontSize: 24, fontWeight: '800', fontFamily: 'Inter_700Bold' },
  moodSubtitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginTop: -4 },
  heroTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  heroTag: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7, borderWidth: 1 },
  heroTagText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  photoQuote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingLeft: 12, paddingRight: 12, paddingVertical: 10, borderLeftWidth: 3, borderRadius: 4 },
  photoQuoteText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  roleWrap: {},
  photoCredit: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: -4 },

  infoCard: { paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1 },
  infoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  infoCardTitle: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  bodyText: { fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap' },
  infoRow: { flexDirection: 'row', marginBottom: 9 },
  infoLabel: { width: 80, fontSize: 13, fontFamily: 'Inter_500Medium' },
  infoValue: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },

  crowdNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 6,
  },
  crowdNoteText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },

  contactRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  contactBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7,
  },
  contactBtnText: { fontSize: 13, fontFamily: 'Inter_500Medium' },

  courseLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  courseHintText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  courseNoticeBox: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
  courseRetryBtn: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  courseRetryText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  courseTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  courseModeBadge: { borderWidth: 1, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4 },
  courseModeText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  courseCandidateText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  courseTitle: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold', lineHeight: 23, marginBottom: 5 },
  courseSummary: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19, marginBottom: 14 },
  courseMapWrap: { borderWidth: 1, borderRadius: 14, overflow: 'hidden', marginBottom: 14 },
  courseMapErrorText: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18, padding: 10 },
  courseStopList: { gap: 0 },
  courseStopRow: { flexDirection: 'row', gap: 10 },
  courseTimeline: { width: 24, alignItems: 'center' },
  courseOrderDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  courseOrderText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#FFF' },
  courseTimelineLine: { width: 1, flex: 1, minHeight: 52, marginVertical: 4 },
  courseStopContent: { flex: 1, paddingBottom: 14 },
  courseStopHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 3 },
  courseStopTitle: { flex: 1, fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  courseStayText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  courseAddressText: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 4 },
  courseReasonText: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  courseMapBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderRadius: 12, paddingVertical: 12, marginTop: 2,
  },
  courseMapBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  courseWarningText: { fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 16, marginTop: 8 },

  cautionCard: { marginHorizontal: 20, marginVertical: 4, borderRadius: 14, borderWidth: 1, padding: 14 },
  cautionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  cautionTitle: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: '#D97706' },
  cautionBody: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20, color: '#92400E' },

  altHint: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 12 },
  altCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 8 },
  altContent: { flex: 1 },
  altName: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginBottom: 3 },
  altMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 6 },
  altTags: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  altTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  altTagText: { fontSize: 11, fontFamily: 'Inter_400Regular' },

  stickyBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 12, paddingHorizontal: 20, borderTopWidth: 1 },
  kakaoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#F7E600', paddingVertical: 16, borderRadius: 16,
  },
  kakaoBtnText: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#3A1D00' },
  coordsBadge: { backgroundColor: 'rgba(58,29,0,0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  coordsBadgeText: { fontSize: 10, fontFamily: 'Inter_500Medium', color: '#3A1D00' },
});
