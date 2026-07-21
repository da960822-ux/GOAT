import React, { useRef, useState } from 'react';
import {
  View, ScrollView, StyleSheet, Text, TouchableOpacity, TextInput,
  Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { Header } from '@/src/components/Header';
import { BottomCTA } from '@/src/components/BottomCTA';
import { StepIndicator } from '@/src/components/StepIndicator';
import { useApp } from '@/src/context/AppContext';
import { geocodeOrigin, recommendFromTags } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import {
  Companion,
  Transport,
  VisitTime,
  TravelPurpose,
  TravelSeason,
  TravelPreferences,
  TravelOrigin,
} from '@/src/types/preferences';
import {
  buildRecommendationRequest,
  getRecommendationRequestId,
} from '@/src/services/recommendationRequest';

const COMPANIONS: { value: Companion; icon: string }[] = [
  { value: '혼자', icon: '🧍' },
  { value: '연인', icon: '💑' },
  { value: '친구', icon: '👥' },
  { value: '가족', icon: '👨‍👩‍👧' },
];

const TRANSPORTS: { value: Transport; icon: string }[] = [
  { value: '자차', icon: '🚗' },
  { value: '대중교통', icon: '🚌' },
  { value: '도보중심', icon: '🚶' },
];

const VISIT_TIMES: { value: VisitTime; icon: string }[] = [
  { value: '오전', icon: '🌅' },
  { value: '오후', icon: '☀️' },
  { value: '일몰', icon: '🌇' },
  { value: '저녁', icon: '🌆' },
  { value: '밤/새벽', icon: '🌙' },
];

const PURPOSES: { value: TravelPurpose; icon: string }[] = [
  { value: '사진·포토스팟', icon: '📷' },
  { value: '산책·힐링', icon: '🍃' },
  { value: '카페·실내휴식', icon: '☕' },
  { value: '전시·건축관람', icon: '🏛️' },
  { value: '체험·액티비티', icon: '🏄' },
  { value: '먹거리·야간탐방', icon: '🌙' },
  { value: '숙소·리조트', icon: '🏨' },
];

const SEASONS: { value: TravelSeason; icon: string }[] = [
  { value: '봄', icon: '🌸' },
  { value: '여름', icon: '🌊' },
  { value: '가을', icon: '🍂' },
  { value: '겨울', icon: '❄️' },
];

type QuickOrigin = {
  label: string;
  regionName: string;
  lat: number;
  lng: number;
};

type QuickOriginGroup = {
  name: string;
  regions: QuickOrigin[];
};

// 빠른 선택은 전국 17개 시·도를 동일한 광역 단위로 제공한다.
// 도 단위는 도청 소재지의 대표 좌표를 사용하며, 정확한 출발지는 주소 검색을 이용한다.
const QUICK_ORIGIN_GROUPS: QuickOriginGroup[] = [
  {
    name: '수도권',
    regions: [
      { label: '서울', regionName: '서울특별시', lat: 37.5665, lng: 126.9780 },
      { label: '인천', regionName: '인천광역시', lat: 37.4563, lng: 126.7052 },
      { label: '경기', regionName: '경기도', lat: 37.2636, lng: 127.0286 },
    ],
  },
  {
    name: '강원권',
    regions: [
      { label: '강원', regionName: '강원특별자치도', lat: 37.8813, lng: 127.7300 },
    ],
  },
  {
    name: '충청권',
    regions: [
      { label: '대전', regionName: '대전광역시', lat: 36.3504, lng: 127.3845 },
      { label: '세종', regionName: '세종특별자치시', lat: 36.4800, lng: 127.2890 },
      { label: '충북', regionName: '충청북도', lat: 36.6424, lng: 127.4890 },
      { label: '충남', regionName: '충청남도', lat: 36.6012, lng: 126.6608 },
    ],
  },
  {
    name: '호남권',
    regions: [
      { label: '광주', regionName: '광주광역시', lat: 35.1595, lng: 126.8526 },
      { label: '전북', regionName: '전북특별자치도', lat: 35.8242, lng: 127.1480 },
      { label: '전남', regionName: '전라남도', lat: 34.9905, lng: 126.4817 },
    ],
  },
  {
    name: '영남권',
    regions: [
      { label: '부산', regionName: '부산광역시', lat: 35.1796, lng: 129.0756 },
      { label: '대구', regionName: '대구광역시', lat: 35.8714, lng: 128.6014 },
      { label: '울산', regionName: '울산광역시', lat: 35.5395, lng: 129.3114 },
      { label: '경북', regionName: '경상북도', lat: 36.5684, lng: 128.7294 },
      { label: '경남', regionName: '경상남도', lat: 35.2285, lng: 128.6811 },
    ],
  },
  {
    name: '제주권',
    regions: [
      { label: '제주', regionName: '제주특별자치도', lat: 33.4996, lng: 126.5312 },
    ],
  },
];

type LocationStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'error' | 'skipped';

const LOCATION_FAILURE_MESSAGE = '현재 위치를 불러오지 못했어요. 우선 거리 정보 없이 추천해드릴게요.';
const LOCATION_TIMEOUT_MS = 10_000;

function getInitialLocationStatus(origin: TravelOrigin | null): LocationStatus {
  if (!origin) return 'idle';
  if (origin.type === 'skip') return 'skipped';
  if (origin.type === 'current') {
    return Number.isFinite(origin.latitude) && Number.isFinite(origin.longitude) ? 'granted' : 'error';
  }
  return 'idle';
}

export default function TravelPreferenceScreen() {
  const router = useRouter();
  const colors = useColors();
  const {
    selectedMood,
    travelPreferences,
    origin: savedOrigin,
    sessionId,
    setTravelPreferences,
    setRecommendations,
    setOrigin,
    setLastRecommendationRequestId,
  } = useApp();

  const [companion, setCompanion] = useState<Companion | null>(travelPreferences?.companion ?? null);
  const [transport, setTransport] = useState<Transport | null>(travelPreferences?.transport ?? null);
  const [visitTime, setVisitTime] = useState<VisitTime | null>(travelPreferences?.visitTime ?? null);
  const [purpose, setPurpose] = useState<TravelPurpose | null>(travelPreferences?.purpose ?? null);
  const [season, setSeason] = useState<TravelSeason | null>(travelPreferences?.season ?? null);
  const [origin, setLocalOrigin] = useState<TravelOrigin | null>(savedOrigin);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>(() => getInitialLocationStatus(savedOrigin));
  const [showRegions, setShowRegions] = useState(false);
  const [addressQuery, setAddressQuery] = useState('');
  const [addressError, setAddressError] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitInFlight = useRef(false);

  const requiredSelected = companion && transport && purpose;
  const count = [companion, transport, purpose].filter(Boolean).length;

  function pick() {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
  }

  function applyLocationFailure(status: 'denied' | 'error') {
    setLocationStatus(status);
    // 실패 상태를 그대로 전달해 백엔드도 400 없이 UNAVAILABLE fallback으로 처리한다.
    // 사용자가 '출발지 없이 계속'을 직접 누른 경우에만 skip으로 바뀐다.
    setLocalOrigin({ type: 'current' });
    setShowRegions(false);
    setAddressError(null);
  }

  async function getCurrentPositionWithFallback() {
    const currentPosition = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('LOCATION_TIMEOUT')), LOCATION_TIMEOUT_MS);
    });
    try {
      return await Promise.race([currentPosition, timeout]);
    } catch {
      return await Location.getLastKnownPositionAsync({
        maxAge: 5 * 60 * 1000,
        requiredAccuracy: 5000,
      });
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  async function handleCurrentLocation() {
    pick();
    setLocationStatus('loading');
    setShowRegions(false);
    setAddressError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        applyLocationFailure('denied');
        return;
      }
      const loc = await getCurrentPositionWithFallback();
      if (!loc || !Number.isFinite(loc.coords.latitude) || !Number.isFinite(loc.coords.longitude)) {
        applyLocationFailure('error');
        return;
      }
      const newOrigin: TravelOrigin = {
        type: 'current',
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setLocalOrigin(newOrigin);
      setLocationStatus('granted');
    } catch {
      applyLocationFailure('error');
    }
  }

  function handleRegionSelect(region: QuickOrigin) {
    pick();
    const newOrigin: TravelOrigin = {
      type: 'region',
      latitude: region.lat,
      longitude: region.lng,
      regionName: region.regionName,
    };
    setLocalOrigin(newOrigin);
    setShowRegions(false);
    setLocationStatus('idle');
    setAddressError(null);
  }

  async function handleAddressSearch() {
    const query = addressQuery.trim();
    if (query.length < 2 || isGeocoding) {
      setAddressError('지역명이나 주소를 두 글자 이상 입력해 주세요.');
      return;
    }
    pick();
    setIsGeocoding(true);
    setAddressError(null);
    try {
      const result = await geocodeOrigin({ query });
      const resolved = result.data.origin;
      if (!Number.isFinite(resolved.latitude) || !Number.isFinite(resolved.longitude)) {
        throw new Error('INVALID_GEOCODE_RESULT');
      }
      setLocalOrigin({
        type: 'address',
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        regionName: resolved.regionName ?? result.data.address,
      });
      setLocationStatus('idle');
      setShowRegions(false);
    } catch {
      setAddressError('출발지를 찾지 못했어요. 지역명, 역 이름 또는 도로명 주소를 다시 입력해 주세요.');
    } finally {
      setIsGeocoding(false);
    }
  }

  function handleSkipOrigin() {
    pick();
    setLocalOrigin({ type: 'skip' });
    setShowRegions(false);
    setLocationStatus('skipped');
    setAddressError(null);
  }

  function handleResetOrigin() {
    pick();
    setLocalOrigin(null);
    setShowRegions(false);
    setLocationStatus('idle');
    setAddressError(null);
  }

  async function handleConfirm() {
    if (!requiredSelected || !selectedMood || isSubmitting || submitInFlight.current) return;
    const prefs: TravelPreferences = {
      companion: companion!,
      transport: transport!,
      visitTime: visitTime ?? null,
      purpose: purpose!,
      season,
    };
    const finalOrigin = origin ?? { type: 'skip' as const };
    submitInFlight.current = true;
    setIsSubmitting(true);
    try {
      const result = await recommendFromTags(buildRecommendationRequest({
        moodId: selectedMood.id,
        preferences: prefs,
        origin: finalOrigin,
        sessionId,
      }));
      setTravelPreferences(prefs);
      setOrigin(finalOrigin);
      setRecommendations(result.data.recommendations);
      setLastRecommendationRequestId(getRecommendationRequestId(result.data));
      router.push('/results');
    } catch {
      Alert.alert(
        '추천을 불러오지 못했어요',
        '백엔드 서버 주소와 네트워크 상태를 확인한 뒤 다시 시도해주세요.',
      );
    } finally {
      submitInFlight.current = false;
      setIsSubmitting(false);
    }
  }

  const subtitleParts = [companion, transport, visitTime, season, purpose].filter(Boolean) as string[];
  const originDone = !!(
    (locationStatus === 'granted' && origin?.type === 'current') ||
    origin?.type === 'region' ||
    origin?.type === 'address' ||
    locationStatus === 'skipped'
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header title="여행 조건" onBack={() => router.back()} />
      <StepIndicator currentStep={2} />

      {selectedMood && (
        <View style={[styles.moodBanner, { backgroundColor: colors.secondary, borderBottomColor: colors.border }]}>
          <Text style={[styles.moodBannerText, { color: colors.mutedForeground }]}>선택 감성</Text>
          <Text style={[styles.moodBannerName, { color: colors.primary }]}>{selectedMood.name}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <QuestionBlock label="누구와 떠나나요?" done={!!companion} required colors={colors}>
          <View style={styles.pillRow}>
            {COMPANIONS.map(({ value, icon }) => (
              <PillButton
                key={value}
                label={value}
                icon={icon}
                selected={companion === value}
                onPress={() => { setCompanion(value); pick(); }}
                colors={colors}
              />
            ))}
          </View>
        </QuestionBlock>

        <QuestionBlock label="어떻게 이동하나요?" done={!!transport} required colors={colors}>
          <View style={styles.pillRow}>
            {TRANSPORTS.map(({ value, icon }) => (
              <PillButton
                key={value}
                label={value}
                icon={icon}
                selected={transport === value}
                onPress={() => { setTransport(value); pick(); }}
                colors={colors}
              />
            ))}
          </View>
        </QuestionBlock>

        <QuestionBlock label="시간대도 정했다면 알려주세요" done={!!visitTime} optional colors={colors}>
          <View style={styles.pillRow}>
            {VISIT_TIMES.map(({ value, icon }) => (
              <PillButton
                key={value}
                label={value}
                icon={icon}
                selected={visitTime === value}
                onPress={() => { setVisitTime(visitTime === value ? null : value); pick(); }}
                colors={colors}
              />
            ))}
          </View>
        </QuestionBlock>

        <QuestionBlock label="어느 계절에 떠나나요?" done={!!season} optional colors={colors}>
          <View style={styles.pillRow}>
            {SEASONS.map(({ value, icon }) => (
              <PillButton
                key={value}
                label={value}
                icon={icon}
                selected={season === value}
                onPress={() => { setSeason(season === value ? null : value); pick(); }}
                colors={colors}
              />
            ))}
          </View>
        </QuestionBlock>

        <QuestionBlock label="오늘 여행의 목적은?" done={!!purpose} required colors={colors}>
          <View style={styles.pillRow}>
            {PURPOSES.map(({ value, icon }) => (
              <PillButton
                key={value}
                label={value}
                icon={icon}
                selected={purpose === value}
                onPress={() => { setPurpose(value); pick(); }}
                colors={colors}
              />
            ))}
          </View>
        </QuestionBlock>

        {/* Origin section */}
        <QuestionBlock label="어디서 출발하나요?" done={originDone} optional colors={colors}>
          <Text style={[styles.originSub, { color: colors.mutedForeground }]}>
            출발지는 1번 카드 점수에는 반영하지 않고, 설정한 경우 1번 장소까지 이동 정보와 2·3번 카드의 연계 동선을 계산해요.
          </Text>

          {locationStatus === 'granted' && origin?.type === 'current' && (
            <View style={[styles.locationSuccess, { backgroundColor: '#D1FAE5', borderColor: '#A7F3D0' }]}>
              <Feather name="check-circle" size={14} color="#065F46" />
              <Text style={styles.locationSuccessText}>현재 위치 적용됨</Text>
              <TouchableOpacity onPress={handleResetOrigin} style={styles.clearBtn}>
                <Text style={[styles.clearBtnText, { color: colors.mutedForeground }]}>변경</Text>
              </TouchableOpacity>
            </View>
          )}

          {(origin?.type === 'region' || origin?.type === 'address') && (
            <View style={[styles.locationSuccess, { backgroundColor: '#EDE9FE', borderColor: '#C4B5FD' }]}>
              <Feather name="map-pin" size={14} color="#5B21B6" />
              <Text style={[styles.locationSuccessText, { color: '#5B21B6' }]}>
                {origin.regionName ?? '선택한 출발지'} 기준 적용됨
              </Text>
              <TouchableOpacity onPress={handleResetOrigin} style={styles.clearBtn}>
                <Text style={[styles.clearBtnText, { color: colors.mutedForeground }]}>변경</Text>
              </TouchableOpacity>
            </View>
          )}

          {locationStatus === 'skipped' && (
            <View style={[styles.locationSuccess, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="compass" size={14} color={colors.mutedForeground} />
              <Text style={[styles.locationSuccessText, { color: colors.mutedForeground }]}>거리 정보 없이 추천할게요.</Text>
              <TouchableOpacity onPress={handleResetOrigin} style={styles.clearBtn}>
                <Text style={[styles.clearBtnText, { color: colors.primary }]}>다시 설정</Text>
              </TouchableOpacity>
            </View>
          )}

          {(locationStatus === 'denied' || locationStatus === 'error') && (
            <View>
              <View style={[styles.locationMsg, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                <Text style={styles.locationMsgText}>{LOCATION_FAILURE_MESSAGE}</Text>
              </View>
              <View style={styles.originOptions}>
                <TouchableOpacity
                  style={[styles.originBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                  onPress={handleCurrentLocation}
                  activeOpacity={0.75}
                >
                  <Feather name="refresh-cw" size={16} color={colors.primary} />
                  <Text style={[styles.originBtnText, { color: colors.foreground }]}>현재 위치 다시 시도</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.originBtn, { borderColor: showRegions ? colors.primary : colors.border, backgroundColor: colors.background }]}
                  onPress={() => { setShowRegions(!showRegions); setAddressError(null); pick(); }}
                  activeOpacity={0.75}
                >
                  <Feather name="search" size={16} color={showRegions ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.originBtnText, { color: showRegions ? colors.primary : colors.foreground }]}>출발 지역·주소 직접 선택</Text>
                  <Feather name={showRegions ? 'chevron-up' : 'chevron-down'} size={14} color={colors.mutedForeground} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.originBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                  onPress={handleSkipOrigin}
                  activeOpacity={0.75}
                >
                  <Feather name="arrow-right" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.originBtnText, { color: colors.foreground }]}>출발지 없이 계속</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {locationStatus === 'idle' && !origin && (
            <View style={styles.originOptions}>
              <TouchableOpacity
                style={[styles.originBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={handleCurrentLocation}
                activeOpacity={0.75}
              >
                <Feather name="navigation" size={16} color={colors.primary} />
                <Text style={[styles.originBtnText, { color: colors.foreground }]}>현재 위치 사용</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.originBtn, { borderColor: showRegions ? colors.primary : colors.border, backgroundColor: colors.background }]}
                onPress={() => { setShowRegions(!showRegions); setAddressError(null); pick(); }}
                activeOpacity={0.75}
              >
                <Feather name="search" size={16} color={showRegions ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.originBtnText, { color: showRegions ? colors.primary : colors.foreground }]}>출발 지역·주소 직접 선택</Text>
                <Feather name={showRegions ? 'chevron-up' : 'chevron-down'} size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipBtn} onPress={handleSkipOrigin} activeOpacity={0.6}>
                <Text style={[styles.skipBtnText, { color: colors.mutedForeground }]}>출발지 없이 계속</Text>
              </TouchableOpacity>
            </View>
          )}

          {locationStatus === 'loading' && (
            <View style={[styles.locationSuccess, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.locationSuccessText, { color: colors.foreground }]}>현재 위치를 확인하고 있어요…</Text>
            </View>
          )}

          {showRegions && (locationStatus === 'idle' || locationStatus === 'denied' || locationStatus === 'error') && (
            <View style={[styles.addressPanel, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
              <Text style={[styles.addressLabel, { color: colors.foreground }]}>지역명·역 이름·도로명 주소</Text>
              <View style={styles.addressRow}>
                <TextInput
                  value={addressQuery}
                  onChangeText={(value) => { setAddressQuery(value); setAddressError(null); }}
                  placeholder="예: 서울역, 수원시 영통구, 강릉역"
                  placeholderTextColor={colors.mutedForeground}
                  returnKeyType="search"
                  onSubmitEditing={handleAddressSearch}
                  style={[styles.addressInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                />
                <TouchableOpacity
                  onPress={handleAddressSearch}
                  disabled={isGeocoding}
                  style={[styles.addressSearchBtn, { backgroundColor: colors.primary, opacity: isGeocoding ? 0.65 : 1 }]}
                >
                  {isGeocoding ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Feather name="search" size={17} color="#FFFFFF" />}
                </TouchableOpacity>
              </View>
              {addressError && <Text style={styles.addressError}>{addressError}</Text>}
              <Text style={[styles.quickRegionLabel, { color: colors.mutedForeground }]}>빠른 선택</Text>
              <Text style={[styles.quickRegionHelp, { color: colors.mutedForeground }]}>시·도 대표 위치를 기준으로 설정돼요. 정확한 출발지는 위 검색을 이용해 주세요.</Text>
              <View style={styles.regionGroups}>
                {QUICK_ORIGIN_GROUPS.map((group) => (
                  <View key={group.name} style={styles.regionGroup}>
                    <Text style={[styles.regionGroupTitle, { color: colors.mutedForeground }]}>{group.name}</Text>
                    <View style={styles.regionGrid}>
                      {group.regions.map((region) => (
                        <TouchableOpacity
                          key={region.regionName}
                          style={[styles.regionPill, { borderColor: colors.border, backgroundColor: colors.background }]}
                          onPress={() => handleRegionSelect(region)}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.regionPillText, { color: colors.foreground }]}>{region.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </QuestionBlock>

        <View style={styles.spacer} />
      </ScrollView>

      <BottomCTA
        label={isSubmitting ? '추천 장소를 불러오는 중…' : requiredSelected ? '추천 카드 보기' : `${count}/3 필수 선택`}
        onPress={handleConfirm}
        disabled={!requiredSelected || isSubmitting}
        subtitle={requiredSelected ? subtitleParts.join(' · ') : undefined}
      />
    </View>
  );
}

function QuestionBlock({
  label, done, required, optional, colors, children,
}: {
  label: string;
  done: boolean;
  required?: boolean;
  optional?: boolean;
  colors: any;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.block, { borderBottomColor: colors.border }]}>
      <View style={styles.blockHeader}>
        <View style={styles.blockLabelRow}>
          <Text style={[styles.blockLabel, { color: colors.foreground }]}>{label}</Text>
          {optional && (
            <View style={[styles.optionalPill, { backgroundColor: colors.muted }]}>
              <Text style={[styles.optionalText, { color: colors.mutedForeground }]}>선택</Text>
            </View>
          )}
        </View>
        {done && (
          <View style={[styles.donePill, { backgroundColor: '#D1FAE5' }]}>
            <Text style={styles.donePillText}>선택됨</Text>
          </View>
        )}
      </View>
      {children}
    </View>
  );
}

function PillButton({
  label, icon, selected, onPress, colors, wide,
}: {
  label: string;
  icon: string;
  selected: boolean;
  onPress: () => void;
  colors: any;
  wide?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      testID={`preference-${label}`}
      style={[
        styles.pill,
        wide && styles.pillWide,
        {
          backgroundColor: selected ? colors.primary : colors.background,
          borderColor: selected ? colors.primary : colors.border,
          shadowColor: selected ? colors.primary : 'transparent',
          shadowOpacity: selected ? 0.25 : 0,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: selected ? 3 : 0,
        },
      ]}
    >
      <Text style={styles.pillIcon}>{icon}</Text>
      <Text style={[styles.pillLabel, { color: selected ? '#FFFFFF' : colors.foreground }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  moodBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  moodBannerText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  moodBannerName: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  scroll: { paddingBottom: 16 },
  block: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  blockHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  blockLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  blockLabel: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  optionalPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  optionalText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  donePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  donePillText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#065F46' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  pillWide: { flex: 1, justifyContent: 'center' },
  pillIcon: { fontSize: 18 },
  pillLabel: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },

  originSub: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19, marginBottom: 14 },
  originOptions: { gap: 8 },
  originBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  originBtnText: { fontSize: 15, fontFamily: 'Inter_500Medium', flex: 1 },
  regionGroups: { gap: 12, paddingTop: 2 },
  regionGroup: { gap: 7 },
  regionGroupTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  regionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  regionPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
  },
  regionPillText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  skipBtn: { alignItems: 'center', paddingVertical: 12 },
  skipBtnText: { fontSize: 13, fontFamily: 'Inter_400Regular', textDecorationLine: 'underline' },
  locationSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  locationSuccessText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#065F46', flex: 1 },
  clearBtn: { paddingHorizontal: 6, paddingVertical: 2 },
  clearBtnText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  locationMsg: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  locationMsgText: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19, color: '#92400E' },
  addressPanel: { marginTop: 10, padding: 14, borderWidth: 1, borderRadius: 14, gap: 10 },
  addressLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  addressRow: { flexDirection: 'row', gap: 8 },
  addressInput: { flex: 1, minHeight: 44, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, fontSize: 14, fontFamily: 'Inter_400Regular' },
  addressSearchBtn: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  addressError: { fontSize: 12, lineHeight: 18, color: '#B91C1C', fontFamily: 'Inter_400Regular' },
  quickRegionLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginTop: 2 },
  quickRegionHelp: { fontSize: 11, lineHeight: 17, fontFamily: 'Inter_400Regular', marginTop: -4 },
  spacer: { height: 12 },
});
