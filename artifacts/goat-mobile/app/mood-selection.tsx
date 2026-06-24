import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Text, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Header } from '@/src/components/Header';
import { MoodCategoryCard } from '@/src/components/MoodCategoryCard';
import { BottomCTA } from '@/src/components/BottomCTA';
import { StepIndicator } from '@/src/components/StepIndicator';
import { EmptyState } from '@/src/components/EmptyState';
import { useApp } from '@/src/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { useGetMoods } from '@workspace/api-client-react';

export default function MoodSelectionScreen() {
  const router = useRouter();
  const colors = useColors();
  const { setSelectedMood } = useApp();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useGetMoods();
  const moods = data?.data.moods ?? [];

  function handleSelect(id: string) {
    setSelectedId(id);
    if (Platform.OS !== 'web') Haptics.selectionAsync();
  }

  function handleConfirm() {
    if (!selectedId) return;
    const mood = moods.find((m) => m.id === selectedId);
    if (!mood) return;
    setSelectedMood(mood);
    router.push('/travel-preference');
  }

  const selected = moods.find((m) => m.id === selectedId);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header title="감성 선택" onBack={() => router.back()} />
      <StepIndicator currentStep={1} />
      <View style={[styles.hint, { borderBottomColor: colors.border }]}>
        <Text style={[styles.hintText, { color: colors.foreground }]}>
          오늘 어떤 장면이 끌리나요?
        </Text>
        <Text style={[styles.hintSub, { color: colors.mutedForeground }]}>
          마음에 드는 감성 하나를 골라주세요
        </Text>
      </View>
      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.stateText, { color: colors.mutedForeground }]}>감성 목록을 불러오는 중이에요</Text>
        </View>
      ) : isError ? (
        <EmptyState
          title="감성 목록을 불러오지 못했어요"
          description="백엔드 서버 주소와 실행 상태를 확인해주세요."
          actionLabel="다시 시도"
          onAction={() => refetch()}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {moods.map((mood) => (
            <MoodCategoryCard
              key={mood.id}
              mood={mood}
              selected={selectedId === mood.id}
              onPress={() => handleSelect(mood.id)}
            />
          ))}
          <View style={styles.spacer} />
        </ScrollView>
      )}
      <BottomCTA
        label={selectedId ? '이 감성으로 계속하기' : '감성을 골라주세요'}
        onPress={handleConfirm}
        disabled={!selectedId}
        subtitle={selected ? `"${selected.name}" 선택됨` : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hint: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  hintText: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 3 },
  hintSub: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  list: { paddingHorizontal: 20, paddingTop: 16 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  stateText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  spacer: { height: 12 },
});
