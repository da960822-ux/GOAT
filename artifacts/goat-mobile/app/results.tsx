import React, {
  useEffect,
  useState,
} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  recommendFromTags,
} from '@workspace/api-client-react';

import { Header } from '@/src/components/Header';
import { PlaceCard } from '@/src/components/PlaceCard';
import { EmptyState } from '@/src/components/EmptyState';
import { StepIndicator } from '@/src/components/StepIndicator';
import { useApp } from '@/src/context/AppContext';
import { useColors } from '@/hooks/useColors';
import type {
  RecommendationCard,
} from '@/src/types/place';
import {
  saveRecentRecommendation,
} from '@/src/services/recentRecommendationService';

export default function ResultsScreen() {
  const router = useRouter();
  const colors = useColors();

  const {
    selectedMood,
    travelPreferences,
    recommendations,
    setRecommendations,
    origin,
  } = useApp();

  const [isRecommending, setIsRecommending] =
    useState(false);

  useEffect(() => {
    if (
      !selectedMood ||
      recommendations.length < 3
    ) {
      return;
    }

    void saveRecentRecommendation({
      mood: selectedMood,
      preferences: travelPreferences,
      recommendations: recommendations.slice(0, 3),
      origin,
    });
  }, [
    selectedMood,
    travelPreferences,
    recommendations,
    origin,
  ]);

  if (
    !selectedMood ||
    recommendations.length === 0
  ) {
    return (
      <View
        style={[
          styles.root,
          { backgroundColor: colors.background },
        ]}
      >
        <Header
          title="추천 결과"
          onBack={() => router.back()}
        />

        <EmptyState
          title="감성을 먼저 선택해주세요"
          description={
            "이런 장면을 찾고 있나요?\n감성을 고르면 3곳으로 압축해드려요."
          }
          actionLabel="감성 선택하러 가기"
          onAction={() =>
            router.replace('/mood-selection')
          }
        />
      </View>
    );
  }

  if (recommendations.length < 3) {
    return (
      <View
        style={[
          styles.root,
          { backgroundColor: colors.background },
        ]}
      >
        <Header
          title="추천 결과"
          onBack={() => router.back()}
        />

        <EmptyState
          title="추천 결과가 부족해요"
          description="조건을 조금 넓혀 다시 추천해볼게요."
          actionLabel="감성 다시 선택하기"
          onAction={() =>
            router.replace('/mood-selection')
          }
        />
      </View>
    );
  }

  function handleCardPress(
    card: RecommendationCard
  ) {
    router.push({
      pathname: '/detail/[id]',
      params: {
        id: card.place.place_id,
        role: card.role,
        reason: card.reason,
      },
    });
  }

  function handleEditConditions() {
    router.push('/travel-preference');
  }

  async function handleShare() {
    const lines = recommendations
      .slice(0, 3)
      .map((card, index) => {
        const reason =
          card.reason ||
          '선택한 여행 조건과 잘 맞는 장소예요.';

        return (
          `${index + 1}. ` +
          `${card.place.place_name} ` +
          `(${card.place.city})\n` +
          reason
        );
      });

    try {
      await Share.share({
        title: 'GOAT 강원 여행 추천',
        message: [
          'GOAT가 추천한 강원 여행지 🐐',
          '',
          `선택 감성: ${
            selectedMood?.name ?? '-'
          }`,
          travelPreferences?.companion
            ? `동행: ${travelPreferences.companion}`
            : '',
          travelPreferences?.transport
            ? `교통: ${travelPreferences.transport}`
            : '',
          '',
          ...lines,
        ]
          .filter(Boolean)
          .join('\n'),
      });
    } catch {
      Alert.alert(
        '공유할 수 없어요',
        '잠시 후 다시 시도해주세요.'
      );
    }
  }

  async function handleReRecommend() {
    if (
      !selectedMood ||
      isRecommending
    ) {
      return;
    }

    const currentIds =
      recommendations.map(
        (card) =>
          card.place.place_id
      );

    setIsRecommending(true);

    try {
      const result =
        await recommendFromTags({
          moodId: selectedMood.id,
          preferences:
            travelPreferences ?? undefined,
          origin: origin ?? undefined,
          excludeIds: currentIds,
        });

      setRecommendations(
        result.data.recommendations
      );
    } catch {
      Alert.alert(
        '다시 추천하지 못했어요',
        '잠시 후 다시 시도해주세요.'
      );
    } finally {
      setIsRecommending(false);
    }
  }

  const conditionParts = [
    selectedMood.name
      .split('·')[0]
      .trim() + ' 감성',
    travelPreferences?.companion,
    travelPreferences?.transport,
    travelPreferences?.visitTime ?? null,
    travelPreferences?.purpose,
  ].filter(Boolean) as string[];

  const showLocationChip =
    origin?.type === 'current' ||
    origin?.type === 'region';

  const locationChipLabel =
    origin?.type === 'current'
      ? '현재 위치 기준'
      : origin?.regionName
        ? `${origin.regionName} 기준`
        : null;

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.background },
      ]}
    >
      <Header
        title="추천 결과"
        onBack={() => router.back()}
        right={
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleShare}
              style={styles.refreshBtn}
              accessibilityLabel="추천 결과 공유"
            >
              <Feather
                name="share-2"
                size={18}
                color={colors.primary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                router.replace('/mood-selection')
              }
              style={styles.refreshBtn}
              accessibilityLabel="감성 다시 선택"
            >
              <Feather
                name="refresh-cw"
                size={18}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>
        }
      />

      <StepIndicator currentStep={3} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.conditionBanner,
            {
              backgroundColor:
                colors.secondary,
              borderColor:
                colors.border,
            },
          ]}
        >
          <View
            style={styles.conditionBannerTop}
          >
            <Text
              style={[
                styles.conditionLabel,
                {
                  color:
                    colors.mutedForeground,
                },
              ]}
            >
              선택한 조건
            </Text>

            <TouchableOpacity
              onPress={handleEditConditions}
              style={styles.editBtn}
            >
              <Feather
                name="sliders"
                size={12}
                color={colors.primary}
              />

              <Text
                style={[
                  styles.editBtnText,
                  { color: colors.primary },
                ]}
              >
                조건 수정
              </Text>
            </TouchableOpacity>
          </View>

          <Text
            style={[
              styles.conditionText,
              { color: colors.foreground },
            ]}
            numberOfLines={2}
          >
            {conditionParts.join(' · ')}
          </Text>

          {showLocationChip &&
            locationChipLabel && (
              <View
                style={styles.locationChipRow}
              >
                <View
                  style={[
                    styles.locationChip,
                    {
                      backgroundColor:
                        '#EDE9FE',
                      borderColor:
                        '#C4B5FD',
                    },
                  ]}
                >
                  <Feather
                    name="navigation"
                    size={11}
                    color="#5B21B6"
                  />

                  <Text
                    style={
                      styles.locationChipText
                    }
                  >
                    {locationChipLabel}
                  </Text>
                </View>
              </View>
            )}
        </View>

        <View style={styles.sectionHeader}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.foreground },
            ]}
          >
            오늘을 위한 장소를 세 곳 골랐어요
          </Text>

          <Text
            style={[
              styles.sectionSub,
              {
                color:
                  colors.mutedForeground,
              },
            ]}
          >
            가장 닮은 장면 · 비슷한 대안 ·
            오늘 가기 편한 곳
          </Text>
        </View>

        {recommendations.map((card) => (
          <PlaceCard
            key={card.place.place_id}
            card={card}
            onPress={() =>
              handleCardPress(card)
            }
          />
        ))}

        <TouchableOpacity
          style={[
            styles.reRecommendBtn,
            {
              backgroundColor:
                colors.primary + '12',
              borderColor:
                colors.primary + '40',
            },
          ]}
          onPress={handleReRecommend}
          disabled={isRecommending}
          activeOpacity={0.75}
        >
          <Feather
            name="zap"
            size={14}
            color={colors.primary}
          />

          <Text
            style={[
              styles.reRecommendText,
              { color: colors.primary },
            ]}
          >
            {isRecommending
              ? '다른 장소를 찾는 중…'
              : '이 감성으로 다시 추천'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.retryBtn,
            { borderColor: colors.border },
          ]}
          onPress={() =>
            router.replace('/mood-selection')
          }
        >
          <Text
            style={[
              styles.retryText,
              {
                color:
                  colors.mutedForeground,
              },
            ]}
          >
            다른 감성으로 다시 찾기
          </Text>
        </TouchableOpacity>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  scroll: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 32,
  },

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

  editBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },

  conditionText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 20,
  },

  locationChipRow: {
    flexDirection: 'row',
    marginTop: 6,
  },

  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
  },

  locationChipText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#5B21B6',
  },

  sectionHeader: {
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },

  sectionSub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 19,
  },

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

  reRecommendText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },

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

  retryText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },

  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  spacer: {
    height: 20,
  },
});