import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Header } from '@/src/components/Header';
import { TagBadge } from '@/src/components/TagBadge';
import { useApp } from '@/src/context/AppContext';
import { analyzeMoodFromImage, ImageMoodResult } from '@/src/services/imageMoodService';
import { useColors } from '@/hooks/useColors';

type AnalysisState = 'idle' | 'analyzing' | 'done';

export default function PhotoMoodScreen() {
  const router = useRouter();
  const colors = useColors();
  const { setSelectedMood } = useApp();
  const [state, setState] = useState<AnalysisState>('idle');
  const [result, setResult] = useState<ImageMoodResult | null>(null);

  async function handleAnalyze() {
    setState('analyzing');
    try {
      const res = await analyzeMoodFromImage('mock');
      setResult(res);
      setState('done');
    } catch {
      setState('idle');
    }
  }

  function handleConfirm() {
    if (!result) return;
    setSelectedMood(result.matchedMood);
    router.push('/travel-preference');
  }

  function handleReset() {
    setResult(null);
    setState('idle');
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header title="사진으로 감성 찾기" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.hint, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
            가고 싶은 여행 사진을 올리면{'\n'}GOAT가 감성을 분석해 장소를 추천해드려요.
          </Text>
          <View style={[styles.betaBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.betaText}>BETA · 현재 목업 모드</Text>
          </View>
        </View>

        {state === 'idle' && (
          <TouchableOpacity
            style={[styles.uploadArea, { borderColor: colors.border, backgroundColor: colors.secondary }]}
            onPress={handleAnalyze}
            activeOpacity={0.7}
          >
            <View style={[styles.uploadIcon, { backgroundColor: colors.muted }]}>
              <Feather name="image" size={36} color={colors.primary} />
            </View>
            <Text style={[styles.uploadTitle, { color: colors.foreground }]}>
              사진을 눌러 감성 분석 시작
            </Text>
            <Text style={[styles.uploadSub, { color: colors.mutedForeground }]}>
              해외여행 감성 사진, SNS 저장 사진 모두 OK{'\n'}지금은 목업으로 작동합니다
            </Text>
            <View style={[styles.uploadBtn, { backgroundColor: colors.primary }]}>
              <Feather name="upload" size={14} color="#FFFFFF" />
              <Text style={styles.uploadBtnText}>사진 선택하기</Text>
            </View>
          </TouchableOpacity>
        )}

        {state === 'analyzing' && (
          <View style={[styles.analyzingBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.analyzingTitle, { color: colors.foreground }]}>감성 분석 중...</Text>
            <Text style={[styles.analyzingSubtitle, { color: colors.mutedForeground }]}>
              사진에서 강원도 감성 태그를 추출하고 있어요
            </Text>
            <View style={styles.analyzingSteps}>
              {['색감 분석', '장면 감지', '감성 매칭'].map((step, i) => (
                <View key={step} style={[styles.stepChip, { backgroundColor: colors.muted }]}>
                  <ActivityIndicator size="small" color={colors.primary} style={{ transform: [{ scale: 0.6 }] }} />
                  <Text style={[styles.stepChipText, { color: colors.mutedForeground }]}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {state === 'done' && result && (
          <View style={styles.resultContainer}>
            <View style={[styles.resultCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <View style={styles.confidenceRow}>
                <View style={[styles.confBadge, { backgroundColor: '#D1FAE5' }]}>
                  <Feather name="check-circle" size={12} color="#065F46" />
                  <Text style={styles.confText}>감성 분석 완료 · {result.confidence}% 매칭</Text>
                </View>
              </View>

              <Text style={[styles.resultLabel, { color: colors.mutedForeground }]}>추출된 감성 태그</Text>
              <View style={styles.tagsRow}>
                {result.extractedTags.map((tag) => (
                  <TagBadge key={tag} label={`#${tag}`} />
                ))}
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <Text style={[styles.resultLabel, { color: colors.mutedForeground }]}>매칭된 감성 카테고리</Text>
              <View style={[styles.moodMatchBox, { backgroundColor: colors.background, borderColor: colors.primary }]}>
                <View style={[styles.moodMatchIcon, { backgroundColor: colors.primary }]}>
                  <Feather name="compass" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.moodMatchText}>
                  <Text style={[styles.moodMatchName, { color: colors.foreground }]}>{result.matchedMood.name}</Text>
                  <Text style={[styles.moodMatchDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                    {result.matchedMood.description}
                  </Text>
                </View>
              </View>

              <View style={styles.moodKeywords}>
                {result.matchedMood.keywords.slice(0, 4).map((kw) => (
                  <View key={kw} style={[styles.kwChip, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.kwText, { color: colors.secondaryForeground }]}>{kw}</Text>
                  </View>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
              onPress={handleConfirm}
              activeOpacity={0.88}
            >
              <Text style={styles.ctaBtnText}>이 감성으로 추천받기</Text>
              <Text style={styles.ctaArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.retryBtn, { borderColor: colors.border }]}
              onPress={handleReset}
            >
              <Feather name="rotate-ccw" size={14} color={colors.mutedForeground} />
              <Text style={[styles.retryText, { color: colors.mutedForeground }]}>다른 사진으로 다시 시도</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  hint: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    alignItems: 'center',
    gap: 8,
  },
  hintText: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20, textAlign: 'center' },
  betaBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  betaText: { fontSize: 11, color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },
  uploadArea: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 20,
    padding: 36,
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  uploadIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  uploadTitle: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold', textAlign: 'center' },
  uploadSub: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 19 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12, marginTop: 4 },
  uploadBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  analyzingBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 36,
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  analyzingTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold', marginTop: 8 },
  analyzingSubtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 19 },
  analyzingSteps: { flexDirection: 'row', gap: 8, marginTop: 4 },
  stepChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  stepChipText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  resultContainer: { gap: 12 },
  resultCard: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 12 },
  confidenceRow: { flexDirection: 'row' },
  confBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  confText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#065F46' },
  resultLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', letterSpacing: 0.4, textTransform: 'uppercase' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  divider: { height: 1, marginVertical: 4 },
  moodMatchBox: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: 14, padding: 14 },
  moodMatchIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  moodMatchText: { flex: 1 },
  moodMatchName: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 3 },
  moodMatchDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17 },
  moodKeywords: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  kwChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  kwText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 17, borderRadius: 16, gap: 8 },
  ctaBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  ctaArrow: { color: '#FFFFFF', fontSize: 18 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, gap: 7 },
  retryText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  spacer: { height: 20 },
});
