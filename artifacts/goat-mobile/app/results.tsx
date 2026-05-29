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
import { getRecommendations } from '@/src/services/recommendationService';
import { RecommendationCard } from '@/src/types/place';

export default function ResultsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { selectedMood, travelPreferences, recommendations, setRecommendations } = useApp();

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

  function handleEditConditions() {
    router.push('/travel-preference');
  }

  function handleReRecommend() {
    if (!selectedMood) return;
    const currentIds = recommendations.map((c) => c.place.place_id);
    const newCards = getRecommendations(selectedMood.id, travelPreferences ?? undefined, currentIds);
    if (newCards.length >= 3) {
      setRecommendations(newCards);
    } else {
      const fallback = getRecommendations(selectedMood.id, travelPreferences ?? undefined);
      setRecommendations(fallback);
    }
  }

  const conditionParts = [
    selectedMood.name.split('·')[0].trim() + ' 감성',
    travelPreferences?.companion,
    travelPreferences?.transport,
    travelPreferences?.visitTime ?? null,
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
          <View style={styles.conditionBannerTop}>
            <Text style={[styles.conditionLabel, { color: colors.mutedForeground }]}>선택한 조건</Text>
            <TouchableOpacity onPress={handleEditConditions} style={styles.editBtn}>
              <Feather name="sliders" size={12} color={colors.primary} />
              <Text style={[styles.editBtnText, { color: colors.primary }]}>조건 수정</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.conditionText, { color: colors.foreground }]} numberOfLines={2}>
            {conditionParts.join(' · ')}
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            오늘을 위한 장소를 세 곳 골랐어요
          </Text>
          <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
            가장 닮은 장면 · 비슷한 대안 · 오늘 가기 편한 곳
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
          style={[styles.reRecommendBtn, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '40' }]}
          onPress={handleReRecommend}
          activeOpacity={0.75}
        >
          <Feather name="zap" size={14} color={colors.primary} />
          <Text style={[styles.reRecommendText, { color: colors.primary }]}>이 감성으로 다시 추천</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.retryBtn, { borderColor: colors.border }]}
          onPress={() => router.replace('/mood-selection')}
        >
          <Text style={[styles.retryText, { color: colors.mutedForeground }]}>다른 감성으로 다시 찾기</Text>
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
    gap: 4,
  },
  conditionBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  conditionLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  editBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  conditionText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 20,
  },

  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 4 },
  sectionSub: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },

  reRecommendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 8,
  },
  reRecommendText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },

  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 0,
  },
  retryText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  refreshBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  spacer: { height: 20 },
});
