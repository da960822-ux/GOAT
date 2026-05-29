import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Header } from '@/src/components/Header';
import { BottomCTA } from '@/src/components/BottomCTA';
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

const COMPANIONS: Companion[] = ['혼자', '연인', '친구', '가족'];
const TRANSPORTS: Transport[] = ['자차', '대중교통'];
const VISIT_TIMES: VisitTime[] = ['오전', '오후', '일몰', '저녁', '밤/새벽'];
const PURPOSES: TravelPurpose[] = ['가볍게 산책', '사진 위주', '액티비티', '조용한 휴식'];

const COMPANION_ICONS: Record<Companion, string> = {
  '혼자': '🧍',
  '연인': '💑',
  '친구': '👥',
  '가족': '👨‍👩‍👧',
};

const TIME_ICONS: Record<VisitTime, string> = {
  '오전': '🌅',
  '오후': '☀️',
  '일몰': '🌇',
  '저녁': '🌆',
  '밤/새벽': '🌙',
};

const PURPOSE_ICONS: Record<TravelPurpose, string> = {
  '가볍게 산책': '🚶',
  '사진 위주': '📷',
  '액티비티': '🏄',
  '조용한 휴식': '🍃',
};

export default function TravelPreferenceScreen() {
  const router = useRouter();
  const colors = useColors();
  const { selectedMood, setTravelPreferences, setRecommendations } = useApp();

  const [companion, setCompanion] = useState<Companion | null>(null);
  const [transport, setTransport] = useState<Transport | null>(null);
  const [visitTime, setVisitTime] = useState<VisitTime | null>(null);
  const [purpose, setPurpose] = useState<TravelPurpose | null>(null);

  const allSelected = companion && transport && visitTime && purpose;

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

  const subtitle = allSelected
    ? `${companion} · ${transport} · ${visitTime} · ${purpose}`
    : `${[companion, transport, visitTime, purpose].filter(Boolean).length}/4 선택됨`;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header title="여행 조건 선택" onBack={() => router.back()} />

      {selectedMood && (
        <View style={[styles.moodPill, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.moodPillText, { color: colors.primary }]}>
            선택 감성: {selectedMood.name}
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <QuestionBlock
          step={1}
          label="누구와 가나요?"
          colors={colors}
        >
          <View style={styles.chipRow}>
            {COMPANIONS.map((c) => (
              <ChipButton
                key={c}
                label={c}
                icon={COMPANION_ICONS[c]}
                selected={companion === c}
                onPress={() => { setCompanion(c); pick(); }}
                colors={colors}
              />
            ))}
          </View>
        </QuestionBlock>

        <QuestionBlock step={2} label="어떻게 이동하나요?" colors={colors}>
          <View style={styles.chipRow}>
            {TRANSPORTS.map((t) => (
              <ChipButton
                key={t}
                label={t}
                icon={t === '자차' ? '🚗' : '🚌'}
                selected={transport === t}
                onPress={() => { setTransport(t); pick(); }}
                colors={colors}
                wide
              />
            ))}
          </View>
        </QuestionBlock>

        <QuestionBlock step={3} label="언제 가나요?" colors={colors}>
          <View style={styles.chipRow}>
            {VISIT_TIMES.map((vt) => (
              <ChipButton
                key={vt}
                label={vt}
                icon={TIME_ICONS[vt]}
                selected={visitTime === vt}
                onPress={() => { setVisitTime(vt); pick(); }}
                colors={colors}
              />
            ))}
          </View>
        </QuestionBlock>

        <QuestionBlock step={4} label="오늘 원하는 여행은?" colors={colors}>
          <View style={styles.chipRow}>
            {PURPOSES.map((p) => (
              <ChipButton
                key={p}
                label={p}
                icon={PURPOSE_ICONS[p]}
                selected={purpose === p}
                onPress={() => { setPurpose(p); pick(); }}
                colors={colors}
              />
            ))}
          </View>
        </QuestionBlock>

        <View style={styles.spacer} />
      </ScrollView>

      <BottomCTA
        label="맞춤 추천 보기"
        onPress={handleConfirm}
        disabled={!allSelected}
        subtitle={subtitle}
      />
    </View>
  );
}

function QuestionBlock({
  step,
  label,
  colors,
  children,
}: {
  step: number;
  label: string;
  colors: any;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.block, { borderBottomColor: colors.border }]}>
      <View style={styles.blockHeader}>
        <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.stepNum}>{step}</Text>
        </View>
        <Text style={[styles.blockLabel, { color: colors.foreground }]}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

function ChipButton({
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
        styles.chip,
        wide && styles.chipWide,
        {
          backgroundColor: selected ? colors.primary : colors.secondary,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <Text style={styles.chipIcon}>{icon}</Text>
      <Text
        style={[
          styles.chipLabel,
          { color: selected ? '#FFFFFF' : colors.foreground },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  moodPill: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 2,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  moodPillText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  scroll: { paddingBottom: 16 },
  block: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  blockHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  blockLabel: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  chipWide: { flex: 1, justifyContent: 'center' },
  chipIcon: { fontSize: 16 },
  chipLabel: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  spacer: { height: 12 },
});
