import React from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
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
  const { selectedMood, recommendations } = useApp();

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

  function handleCardPress(card: RecommendationCard) {
    router.push({
      pathname: '/detail/[id]',
      params: { id: card.place.place_id, role: card.role, reason: card.reason },
    });
  }

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
        <View style={[styles.moodBanner, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Text style={[styles.moodLabel, { color: colors.mutedForeground }]}>선택한 감성</Text>
          <Text style={[styles.moodName, { color: colors.primary }]}>{selectedMood.name}</Text>
          <View style={styles.moodKeywords}>
            {selectedMood.keywords.slice(0, 4).map((kw) => (
              <View key={kw} style={[styles.kwChip, { backgroundColor: colors.muted }]}>
                <Text style={[styles.kwText, { color: colors.secondaryForeground }]}>{kw}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.countRow}>
            <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.countText}>3</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>추천 장소</Text>
          </View>
          <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
            장면 최적 · 같은 장면 대안 · 날씨 맞춤으로 비교해보세요.
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
  moodBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  moodLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', marginBottom: 4, letterSpacing: 0.5, textTransform: 'uppercase' },
  moodName: { fontSize: 22, fontWeight: '800', fontFamily: 'Inter_700Bold', marginBottom: 10 },
  moodKeywords: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  kwChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  kwText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
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
