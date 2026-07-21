import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, Platform, Image, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Header } from '@/src/components/Header';
import { TagBadge } from '@/src/components/TagBadge';
import { useApp } from '@/src/context/AppContext';
import { analyzeMoodFromImage, ImageMoodResult } from '@/src/services/imageMoodService';
import { useColors } from '@/hooks/useColors';

type AnalysisState = 'idle' | 'picked' | 'analyzing' | 'done' | 'error';

export default function PhotoMoodScreen() {
  const router = useRouter();
  const colors = useColors();
  const { setSelectedMood } = useApp();
  const [state, setState] = useState<AnalysisState>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<ImageMoodResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  async function handlePickImage() {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          '사진 접근 권한 필요',
          '갤러리에 접근하려면 사진 권한을 허용해주세요.',
          [{ text: '확인' }]
        );
        return;
      }
    }

    try {
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (pickerResult.canceled || !pickerResult.assets?.[0]?.uri) {
        return;
      }

      const uri = pickerResult.assets[0].uri;
      setImageUri(uri);
      setState('picked');
    } catch {
      setErrorMsg('사진을 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.');
      setState('error');
    }
  }

  async function handleAnalyze() {
    if (!imageUri) return;
    setState('analyzing');
    try {
      const res = await analyzeMoodFromImage(imageUri);
      setResult(res);
      setState('done');
    } catch {
      setErrorMsg('감성 분석 중 오류가 발생했습니다. 다시 시도해주세요.');
      setState('error');
    }
  }

  function handleConfirm() {
    if (!result) return;
    setSelectedMood(result.matchedMood);
    router.push('/travel-preference');
  }

  function handleReset() {
    setResult(null);
    setImageUri(null);
    setState('idle');
    setErrorMsg('');
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header title="사진으로 감성 찾기" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.hint, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
            가고 싶은 여행 사진을 선택하면 GOAT가 사진 분위기와 비슷한 강원 감성 장소를 추천해드려요.
          </Text>
        </View>

        {state === 'idle' && (
          <TouchableOpacity
            style={[styles.uploadArea, { borderColor: colors.border, backgroundColor: colors.secondary }]}
            onPress={handlePickImage}
            activeOpacity={0.7}
          >
            <View style={[styles.uploadIcon, { backgroundColor: colors.muted }]}>
              <Feather name="image" size={36} color={colors.primary} />
            </View>
            <Text style={[styles.uploadTitle, { color: colors.foreground }]}>
              사진을 눌러 갤러리 열기
            </Text>
            <Text style={[styles.uploadSub, { color: colors.mutedForeground }]}>
              해외여행 감성 사진, SNS 저장 사진 모두 OK
            </Text>
            <View style={[styles.uploadBtn, { backgroundColor: colors.primary }]}>
              <Feather name="upload" size={14} color="#FFFFFF" />
              <Text style={styles.uploadBtnText}>사진 선택하기</Text>
            </View>
          </TouchableOpacity>
        )}

        {state === 'picked' && imageUri && (
          <View style={styles.pickedContainer}>
            <Image
              source={{ uri: imageUri }}
              style={[styles.previewImage, { borderColor: colors.border }]}
              resizeMode="cover"
            />
            <View style={[styles.analyzePrompt, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="info" size={14} color={colors.mutedForeground} />
              <Text style={[styles.analyzePromptText, { color: colors.mutedForeground }]}>
                사진 감성 분석 엔진을 연결하는 중입니다. 현재는 선택한 사진을 기준으로 감성 추천 흐름을 확인할 수 있습니다.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
              onPress={handleAnalyze}
              activeOpacity={0.88}
            >
              <Text style={styles.ctaBtnText}>이 사진으로 감성 찾기</Text>
              <Text style={styles.ctaArrow}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.retryBtn, { borderColor: colors.border }]}
              onPress={handleReset}
            >
              <Feather name="rotate-ccw" size={14} color={colors.mutedForeground} />
              <Text style={[styles.retryText, { color: colors.mutedForeground }]}>다른 사진 선택</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === 'analyzing' && (
          <View style={[styles.analyzingBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            {imageUri && (
              <Image
                source={{ uri: imageUri }}
                style={[styles.analyzingThumb, { borderColor: colors.border }]}
                resizeMode="cover"
              />
            )}
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 8 }} />
            <Text style={[styles.analyzingTitle, { color: colors.foreground }]}>감성 태그 추정 중...</Text>
            <Text style={[styles.analyzingSubtitle, { color: colors.mutedForeground }]}>
              선택한 사진을 기준으로 감성 태그를 추정합니다
            </Text>
          </View>
        )}

        {state === 'done' && result && (
          <View style={styles.resultContainer}>
            {imageUri && (
              <Image
                source={{ uri: imageUri }}
                style={[styles.previewImage, { borderColor: colors.border }]}
                resizeMode="cover"
              />
            )}

            <View style={[styles.resultCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <View style={[styles.estimateBanner, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                <Feather name="info" size={12} color="#D97706" />
                <Text style={styles.estimateText}>
                  선택한 사진을 기준으로 감성 태그를 추정합니다.
                </Text>
              </View>

              <Text style={[styles.resultLabel, { color: colors.mutedForeground }]}>추정된 감성 태그</Text>
              <View style={styles.tagsRow}>
                {result.moodTags.map((tag) => (
                  <TagBadge key={tag} label={`#${tag}`} />
                ))}
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <Text style={[styles.resultLabel, { color: colors.mutedForeground }]}>추천 감성 카테고리</Text>
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

        {state === 'error' && (
          <View style={[styles.errorBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
            <Feather name="alert-circle" size={24} color="#DC2626" />
            <Text style={styles.errorTitle}>오류가 발생했습니다</Text>
            <Text style={styles.errorBody}>{errorMsg}</Text>
            <TouchableOpacity
              style={[styles.ctaBtn, { backgroundColor: colors.primary, marginTop: 8 }]}
              onPress={handleReset}
            >
              <Text style={styles.ctaBtnText}>다시 시도</Text>
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
  },
  hintText: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20, textAlign: 'center' },
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

  pickedContainer: { gap: 12 },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 4,
  },
  analyzePrompt: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  analyzePromptText: { flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },

  analyzingBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  analyzingThumb: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
  },
  analyzingTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  analyzingSubtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 19 },

  resultContainer: { gap: 12 },
  resultCard: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 12 },

  estimateBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  estimateText: { flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17, color: '#92400E' },

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

  errorBox: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: 'center', gap: 8 },
  errorTitle: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#DC2626' },
  errorBody: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19, color: '#7F1D1D', textAlign: 'center' },

  spacer: { height: 20 },
});
