import React, { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useGetMoods } from '@workspace/api-client-react';

import { Header } from '@/src/components/Header';
import { MoodCategoryCard } from '@/src/components/MoodCategoryCard';
import { BottomCTA } from '@/src/components/BottomCTA';
import { StepIndicator } from '@/src/components/StepIndicator';
import { EmptyState } from '@/src/components/EmptyState';
import { useApp } from '@/src/context/AppContext';
import { useColors } from '@/hooks/useColors';

export default function MoodSelectionScreen() {
  const router = useRouter();
  const colors = useColors();

  const { setSelectedMood } = useApp();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useGetMoods();

  /**
   * API 응답이 다음 두 형태 중 어느 것으로 와도 안전하게 처리합니다.
   *
   * 1. { data: { moods: [...] } }
   * 2. { moods: [...] }
   *
   * 응답이 아직 없거나 moods가 배열이 아니면 빈 배열을 사용합니다.
   */
  const moods = useMemo(() => {
    const response = data as any;

    const nestedMoods = response?.data?.moods;
    const directMoods = response?.moods;

    if (Array.isArray(nestedMoods)) {
      return nestedMoods;
    }

    if (Array.isArray(directMoods)) {
      return directMoods;
    }

    return [];
  }, [data]);

  function handleSelect(id: string) {
    setSelectedId(id);

    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync();
    }
  }

  function handleConfirm() {
    if (!selectedId) {
      return;
    }

    const selectedMood = moods.find(
      (mood: any) => mood?.id === selectedId
    );

    if (!selectedMood) {
      return;
    }

    setSelectedMood(selectedMood);
    router.push('/travel-preference');
  }

  const selectedMood = moods.find(
    (mood: any) => mood?.id === selectedId
  );

  const hasNoMoods =
    !isLoading &&
    !isError &&
    moods.length === 0;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <Header
        title="감성 선택"
        onBack={() => router.back()}
      />

      <StepIndicator currentStep={1} />

      <View
        style={[
          styles.hint,
          {
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.hintText,
            {
              color: colors.foreground,
            },
          ]}
        >
          오늘 어떤 장면이 끌리나요?
        </Text>

        <Text
          style={[
            styles.hintSub,
            {
              color: colors.mutedForeground,
            },
          ]}
        >
          마음에 드는 감성 하나를 골라주세요
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />

          <Text
            style={[
              styles.stateText,
              {
                color: colors.mutedForeground,
              },
            ]}
          >
            감성 목록을 불러오는 중이에요
          </Text>
        </View>
      ) : isError ? (
        <EmptyState
          title="감성 목록을 불러오지 못했어요"
          description={
            '백엔드 서버가 실행 중인지 확인한 뒤 다시 시도해주세요.'
          }
          actionLabel="다시 시도"
          onAction={() => {
            void refetch();
          }}
        />
      ) : hasNoMoods ? (
        <EmptyState
          title="표시할 감성이 없어요"
          description={
            '감성 데이터가 아직 준비되지 않았어요. 잠시 후 다시 시도해주세요.'
          }
          actionLabel="다시 불러오기"
          onAction={() => {
            void refetch();
          }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {moods.map((mood: any) => {
            if (!mood?.id) {
              return null;
            }

            return (
              <MoodCategoryCard
                key={mood.id}
                mood={mood}
                selected={selectedId === mood.id}
                onPress={() => handleSelect(mood.id)}
              />
            );
          })}

          <View style={styles.spacer} />
        </ScrollView>
      )}

      {!isLoading && !isError && moods.length > 0 ? (
        <BottomCTA
          label={
            selectedId
              ? '이 감성으로 계속하기'
              : '감성을 골라주세요'
          }
          onPress={handleConfirm}
          disabled={!selectedId}
          subtitle={
            selectedMood?.name
              ? `"${selectedMood.name}" 선택됨`
              : undefined
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  hint: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },

  hintText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginBottom: 3,
  },

  hintSub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 19,
  },

  list: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
  },

  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  stateText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },

  spacer: {
    height: 12,
  },
});