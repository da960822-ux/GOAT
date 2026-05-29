import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
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

export default function TravelPreferenceScreen() {
  const router = useRouter();
  const colors = useColors();
  const { selectedMood, setTravelPreferences, setRecommendations } = useApp();

  const [companion, setCompanion] = useState<Companion | null>(null);
  const [transport, setTransport] = useState<Transport | null>(null);
  const [visitTime, setVisitTime] = useState<VisitTime | null>(null);
  const [purpose, setPurpose] = useState<TravelPurpose | null>(null);

  const allSelected = companion && transport && visitTime && purpose;
  const count = [companion, transport, visitTime, purpose].filter(Boolean).length;

  function pick() {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
  }

  function handleConfirm() {
    if (!allSelected || !selectedMood) return;
    const prefs: TravelPreferences = {
      companion: companion!,
      transport: transport!,
      visitTime: visitTime!,
      purpose: purpose!,
    };
    setTravelPreferences(prefs);
    const cards = getRecommendations(selectedMood.id, prefs);
    setRecommendations(cards);
    router.push('/results');
  }

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
        <QuestionBlock label="누구와 가나요?" done={!!companion} colors={colors}>
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

        <QuestionBlock label="어떻게 이동하나요?" done={!!transport} colors={colors}>
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

        <QuestionBlock label="언제 가나요?" done={!!visitTime} colors={colors}>
          <View style={styles.pillRow}>
            {VISIT_TIMES.map(({ value, icon }) => (
              <PillButton
                key={value}
                label={value}
                icon={icon}
                selected={visitTime === value}
                onPress={() => { setVisitTime(value); pick(); }}
                colors={colors}
              />
            ))}
          </View>
        </QuestionBlock>

        <QuestionBlock label="오늘 원하는 여행은?" done={!!purpose} colors={colors}>
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

        <View style={styles.spacer} />
      </ScrollView>

      <BottomCTA
        label={allSelected ? '추천 카드 보기' : `${count}/4 선택 중`}
        onPress={handleConfirm}
        disabled={!allSelected}
        subtitle={allSelected ? `${companion} · ${transport} · ${visitTime} · ${purpose}` : undefined}
      />
    </View>
  );
}

function QuestionBlock({
  label,
  done,
  colors,
  children,
}: {
  label: string;
  done: boolean;
  colors: any;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.block, { borderBottomColor: colors.border }]}>
      <View style={styles.blockHeader}>
        <Text style={[styles.blockLabel, { color: colors.foreground }]}>{label}</Text>
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
  label,
  icon,
  selected,
  onPress,
  colors,
  wide,
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
  blockLabel: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },
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
  spacer: { height: 12 },
});
