import React, { useState } from 'react';
import {
  View, ScrollView, StyleSheet, Text, TouchableOpacity,
  Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { Header } from '@/src/components/Header';
import { BottomCTA } from '@/src/components/BottomCTA';
import { StepIndicator } from '@/src/components/StepIndicator';
import { useApp } from '@/src/context/AppContext';
import { getRecommendations } from '@/src/services/recommendationService';
import { useColors } from '@/hooks/useColors';
import {
  Companion,
  Transport,
  VisitTime,
  TravelPurpose,
  TravelPreferences,
  TravelOrigin,
} from '@/src/types/preferences';

const COMPANIONS: { value: Companion; icon: string }[] = [
  { value: '혼자', icon: '🧍' },
  { value: '연인', icon: '💑' },
  { value: '친구', icon: '👥' },
  { value: '가족', icon: '👨‍👩‍👧' },
];

const TRANSPORTS: { value: Transport; icon: string }[] = [
  { value: '자차', icon: '🚗' },
  { value: '대중교통', icon: '🚌' },
];

const VISIT_TIMES: { value: VisitTime; icon: string }[] = [
  { value: '오전', icon: '🌅' },
  { value: '오후', icon: '☀️' },
  { value: '일몰', icon: '🌇' },
  { value: '저녁', icon: '🌆' },
  { value: '밤/새벽', icon: '🌙' },
];

const PURPOSES: { value: TravelPurpose; icon: string }[] = [
  { value: '가볍게 산책', icon: '🚶' },
  { value: '사진 위주', icon: '📷' },
  { value: '액티비티', icon: '🏄' },
  { value: '조용한 휴식', icon: '🍃' },
];

const REGIONS: { name: string; lat: number; lng: number }[] = [
  { name: '서울/수도권', lat: 37.5665, lng: 126.9780 },
  { name: '춘천', lat: 37.8813, lng: 127.7300 },
  { name: '원주', lat: 37.3422, lng: 127.9202 },
  { name: '강릉', lat: 37.7519, lng: 128.8760 },
  { name: '속초', lat: 38.2070, lng: 128.5918 },
  { name: '평창', lat: 37.3706, lng: 128.3902 },
];

type LocationStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'error';

export default function TravelPreferenceScreen() {
  const router = useRouter();
  const colors = useColors();
  const { selectedMood, setTravelPreferences, setRecommendations, setOrigin } = useApp();

  const [companion, setCompanion] = useState<Companion | null>(null);
  const [transport, setTransport] = useState<Transport | null>(null);
  const [visitTime, setVisitTime] = useState<VisitTime | null>(null);
  const [purpose, setPurpose] = useState<TravelPurpose | null>(null);
  const [origin, setLocalOrigin] = useState<TravelOrigin | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [showRegions, setShowRegions] = useState(false);

  const requiredSelected = companion && transport && purpose;
  const count = [companion, transport, purpose].filter(Boolean).length;

  function pick() {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
  }

  async function handleCurrentLocation() {
    pick();
    setLocationStatus('loading');
    setShowRegions(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('denied');
        setLocalOrigin(null);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const newOrigin: TravelOrigin = {
        type: 'current',
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setLocalOrigin(newOrigin);
      setLocationStatus('granted');
    } catch {
      setLocationStatus('error');
      setLocalOrigin(null);
    }
  }

  function handleRegionSelect(region: typeof REGIONS[0]) {
    pick();
    const newOrigin: TravelOrigin = {
      type: 'region',
      latitude: region.lat,
      longitude: region.lng,
      regionName: region.name,
    };
    setLocalOrigin(newOrigin);
    setShowRegions(false);
  }

  function handleSkipOrigin() {
    pick();
    setLocalOrigin({ type: 'skip' });
    setShowRegions(false);
    setLocationStatus('idle');
  }

  function handleConfirm() {
    if (!requiredSelected || !selectedMood) return;
    const prefs: TravelPreferences = {
      companion: companion!,
      transport: transport!,
      visitTime: visitTime ?? null,
      purpose: purpose!,
    };
    const finalOrigin = origin ?? { type: 'skip' as const };
    setTravelPreferences(prefs);
    setOrigin(finalOrigin);
    const cards = getRecommendations(selectedMood.id, prefs, undefined, finalOrigin);
    setRecommendations(cards);
    router.push('/results');
  }

  const subtitleParts = [companion, transport, visitTime, purpose].filter(Boolean) as string[];
  const originDone = !!(
    (locationStatus === 'granted' && origin?.type === 'current') ||
    origin?.type === 'region'
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
                wide
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
            가까운 감성 장소를 더 잘 추천해드릴게요.
          </Text>

          {/* Status: granted */}
          {locationStatus === 'granted' && origin?.type === 'current' && (
            <View style={[styles.locationSuccess, { backgroundColor: '#D1FAE5', borderColor: '#A7F3D0' }]}>
              <Feather name="check-circle" size={14} color="#065F46" />
              <Text style={styles.locationSuccessText}>현재 위치 적용됨</Text>
              <TouchableOpacity onPress={handleSkipOrigin} style={styles.clearBtn}>
                <Text style={[styles.clearBtnText, { color: colors.mutedForeground }]}>취소</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Status: denied */}
          {locationStatus === 'denied' && (
            <View style={[styles.locationMsg, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
              <Text style={styles.locationMsgText}>
                위치 권한이 없어도 감성 추천은 계속 이용할 수 있어요.
              </Text>
            </View>
          )}

          {/* Status: error */}
          {locationStatus === 'error' && (
            <View style={[styles.locationMsg, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
              <Text style={styles.locationMsgText}>
                현재 위치를 불러오지 못했어요. 지역 선택으로 대신할 수 있어요.
              </Text>
            </View>
          )}

          {/* Region selected success */}
          {origin?.type === 'region' && (
            <View style={[styles.locationSuccess, { backgroundColor: '#EDE9FE', borderColor: '#C4B5FD' }]}>
              <Feather name="map-pin" size={14} color="#5B21B6" />
              <Text style={[styles.locationSuccessText, { color: '#5B21B6' }]}>
                {origin.regionName} 기준 적용됨
              </Text>
              <TouchableOpacity onPress={handleSkipOrigin} style={styles.clearBtn}>
                <Text style={[styles.clearBtnText, { color: colors.mutedForeground }]}>취소</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Option buttons — hide when granted or region selected */}
          {locationStatus !== 'granted' && origin?.type !== 'region' && (
            <View style={styles.originOptions}>
              <TouchableOpacity
                style={[styles.originBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={handleCurrentLocation}
                activeOpacity={0.75}
                disabled={locationStatus === 'loading'}
              >
                {locationStatus === 'loading' ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Feather name="navigation" size={16} color={colors.primary} />
                )}
                <Text style={[styles.originBtnText, { color: colors.foreground }]}>
                  {locationStatus === 'loading' ? '위치 가져오는 중…' : '현재 위치 사용'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.originBtn,
                  { borderColor: showRegions ? colors.primary : colors.border, backgroundColor: colors.background },
                ]}
                onPress={() => { setShowRegions(!showRegions); pick(); }}
                activeOpacity={0.75}
              >
                <Feather name="map-pin" size={16} color={showRegions ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.originBtnText, { color: showRegions ? colors.primary : colors.foreground }]}>
                  주요 지역 선택
                </Text>
                <Feather
                  name={showRegions ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={colors.mutedForeground}
                  style={{ marginLeft: 'auto' }}
                />
              </TouchableOpacity>

              {showRegions && (
                <View style={styles.regionGrid}>
                  {REGIONS.map((r) => (
                    <TouchableOpacity
                      key={r.name}
                      style={[styles.regionPill, { borderColor: colors.border, backgroundColor: colors.background }]}
                      onPress={() => handleRegionSelect(r)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.regionPillText, { color: colors.foreground }]}>{r.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[styles.skipBtn]}
                onPress={handleSkipOrigin}
                activeOpacity={0.6}
              >
                <Text style={[styles.skipBtnText, { color: colors.mutedForeground }]}>건너뛰기</Text>
              </TouchableOpacity>
            </View>
          )}
        </QuestionBlock>

        <View style={styles.spacer} />
      </ScrollView>

      <BottomCTA
        label={requiredSelected ? '추천 카드 보기' : `${count}/3 필수 선택`}
        onPress={handleConfirm}
        disabled={!requiredSelected}
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
  regionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 4 },
  regionPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
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
  spacer: { height: 12 },
});
