import React from 'react';
import {
  View, ScrollView, StyleSheet, Text, TouchableOpacity
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Header } from '@/src/components/Header';
import { PlaceCard } from '@/src/components/PlaceCard';
import { EmptyState } from '@/src/components/EmptyState';
import { useApp } from '@/src/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { RecommendationCard } from '@/src/types/place';

export default function ResultsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { selectedMood, travelPreferences, recommendations } = useApp();

  if (!selectedMood || recommendations.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <Header title="추천 결과" onBack={() => router.back()} />
        <EmptyState
          title="감성을 먼저 선택해주세요"
          description="기분에 맞는 감성을 선택하면\n강원도 추천 장소 3곳을 보여드려요."
          actionLabel="감성 선택하러 가기"
          onAction={() => router.replace('/mood-selection')}
        />
      </View>
    );
  }

  if (recommendations.length < 3) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <Header title="추천 결과" onBack={() => router.back()} />
        <EmptyState
          title="추천 장소를 찾지 못했습니다"
          description="선택한 감성에 맞는 장소가 부족합니다.\n다른 감성으로 다시 시도해주세요."
          actionLabel="감성 다시 선택하기"
          onAction={() => router.replace('/mood-selection')}
        />
      </View>
    );
  }

  function handleCardPress(card: RecommendationCard) {
    router.push({
      pathname: '/detail/[id]',
      params: { id: card.place.place_id, role: card.role, reason: card.reason },
    });
  }

  const conditionChips = [
    { icon: 'heart', label: '선택 감성', value: selectedMood.name.split('·')[0].trim() },
    travelPreferences && { icon: 'users', label: '동행', value: travelPreferences.companion },
    travelPreferences && { icon: 'navigation', label: '이동수단', value: travelPreferences.transport },
    travelPreferences && { icon: 'clock', label: '방문 시간', value: travelPreferences.visitTime },
    travelPreferences && { icon: 'star', label: '여행 목적', value: travelPreferences.purpose },
  ].filter(Boolean) as { icon: string; label: string; value: string }[];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header
        title="추천 결과"
        onBack={() => router.back()}
        right={
          <TouchableOpacity onPress={() => router.replace('/mood-selection')} style={styles.refreshBtn}>
            <Feather name="refresh-cw" size={18} color={colors.primary} />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={[styles.conditionCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Text style={[styles.conditionTitle, { color: colors.mutedForeground }]}>선택한 조건</Text>
          <View style={styles.conditionGrid}>
            {conditionChips.map((chip) => (
              <View key={chip.label} style={[styles.conditionChip, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Feather name={chip.icon as any} size={11} color={colors.primary} />
                <View style={styles.conditionChipText}>
                  <Text style={[styles.conditionChipLabel, { color: colors.mutedForeground }]}>{chip.label}</Text>
                  <Text style={[styles.conditionChipValue, { color: colors.foreground }]} numberOfLines={1}>{chip.value}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.countRow}>
            <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.countText}>3</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>맞춤 추천 장소</Text>
          </View>
          <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
            장면 최적 · 내 상황 맞춤 · 안전한 대안으로 비교해보세요.
          </Text>
        </View>

        {recommendations.map((card) => (
          <PlaceCard
            key={card.place.place_id}
            card={card}
            onPress={() => handleCardPress(card)}
          />
        ))}

        <TouchableOpacity
          style={[styles.retryBtn, { borderColor: colors.border }]}
          onPress={() => router.replace('/mood-selection')}
        >
          <Feather name="rotate-ccw" size={15} color={colors.primary} />
          <Text style={[styles.retryText, { color: colors.primary }]}>다른 감성으로 다시 찾기</Text>
        </TouchableOpacity>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },

  conditionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  conditionTitle: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  conditionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  conditionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: '44%',
    flex: 1,
  },
  conditionChipText: { flex: 1 },
  conditionChipLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', marginBottom: 1 },
  conditionChipValue: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },

  sectionHeader: { marginBottom: 16 },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  countBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  countText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  sectionTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  sectionSub: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },

  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  retryText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  refreshBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  spacer: { height: 20 },
});
