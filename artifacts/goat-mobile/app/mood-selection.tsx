import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Header } from '@/src/components/Header';
import { MoodCategoryCard } from '@/src/components/MoodCategoryCard';
import { BottomCTA } from '@/src/components/BottomCTA';
import { StepIndicator } from '@/src/components/StepIndicator';
import { moodCategories } from '@/src/data/moodCategories';
import { useApp } from '@/src/context/AppContext';
import { useColors } from '@/hooks/useColors';

export default function MoodSelectionScreen() {
  const router = useRouter();
  const colors = useColors();
  const { setSelectedMood } = useApp();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function handleSelect(id: string) {
    setSelectedId(id);
    if (Platform.OS !== 'web') Haptics.selectionAsync();
  }

  function handleConfirm() {
    if (!selectedId) return;
    const mood = moodCategories.find((m) => m.id === selectedId);
    if (!mood) return;
    setSelectedMood(mood);
    router.push('/travel-preference');
  }

  const selected = moodCategories.find((m) => m.id === selectedId);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header title="감성 선택" onBack={() => router.back()} />
      <StepIndicator currentStep={1} />
      <View style={[styles.hint, { borderBottomColor: colors.border }]}>
        <Text style={[styles.hintText, { color: colors.foreground }]}>
          이런 장면을 찾고 있나요?
        </Text>
        <Text style={[styles.hintSub, { color: colors.mutedForeground }]}>
          가장 끌리는 감성 하나를 골라주세요
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {moodCategories.map((mood) => (
          <MoodCategoryCard
            key={mood.id}
            mood={mood}
            selected={selectedId === mood.id}
            onPress={() => handleSelect(mood.id)}
          />
        ))}
        <View style={styles.spacer} />
      </ScrollView>
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
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  hintText: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 2 },
  hintSub: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  list: { paddingHorizontal: 20, paddingTop: 14 },
  spacer: { height: 12 },
});
