import React from 'react';
import {
  View, ScrollView, StyleSheet, Text, TouchableOpacity
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Header } from '@/src/components/Header';
import { PlaceCard } from '@/src/components/PlaceCard';
import { EmptyState } from '@/src/components/EmptyState';
import { StepIndicator } from '@/src/components/StepIndicator';
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
          description="이런 장면을 찾고 있나요?{'\n'}감성을 고르면 3곳으로 압축해드려요."
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
          title="추천 결과가 부족해요"
          description="조건을 조금 넓혀 다시 추천해볼게요."
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

  const conditionParts = [
    selectedMood.name.split('·')[0].trim() + ' 감성',
    travelPreferences?.companion,
    travelPreferences?.transport,
    travelPreferences?.visitTime,
    travelPreferences?.purpose,
  ].filter(Boolean) as string[];

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
      <StepIndicator currentStep={3} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={[styles.conditionBanner, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Text style={[styles.conditionLabel, { color: colors.mutedForeground }]}>선택한 조건</Text>
          <Text style={[styles.conditionText, { color: colors.foreground }]} numberOfLines={2}>
            {conditionParts.join(' · ')}
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            오늘 조건에 맞춰 3곳을 골랐어요
          </Text>
          <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
            장면 최적 · 내 상황 맞춤 · 안전한 대안 순서예요
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
          <Feather name="rotate-ccw" size={14} color={colors.primary} />
          <Text style={[styles.retryText, { color: colors.primary }]}>다른 감성으로 다시 찾기</Text>
        </TouchableOpacity>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 0, paddingBottom: 32 },

  conditionBanner: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  conditionLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  conditionText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 20,
  },

  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 4 },
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
