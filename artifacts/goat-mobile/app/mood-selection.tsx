import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Header } from '@/src/components/Header';
import { MoodCategoryCard } from '@/src/components/MoodCategoryCard';
import { BottomCTA } from '@/src/components/BottomCTA';
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
      <View style={[styles.hint, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.hintText, { color: colors.secondaryForeground }]}>
          지금 가고 싶은 분위기와 가장 비슷한 감성을 하나 골라주세요
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
        label="다음: 여행 조건 선택"
        onPress={handleConfirm}
        disabled={!selectedId}
        subtitle={selected ? `"${selected.name}" 감성 선택됨 · 다음 단계에서 조건 입력` : '감성을 선택해주세요'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hint: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  hintText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 19,
    textAlign: 'center',
  },
  list: { paddingHorizontal: 20, paddingTop: 12 },
  spacer: { height: 12 },
});
