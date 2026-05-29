import React from 'react';
import {
  View, Text, StyleSheet, ImageBackground, TouchableOpacity,
  Platform, StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export default function LandingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <ImageBackground
        source={require('@/assets/images/hero-landing.png')}
        style={styles.hero}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <View style={[styles.heroContent, { paddingTop: topPad + 24 }]}>
          <View style={styles.logoRow}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>GOAT</Text>
            </View>
            <Text style={styles.logoSubtitle}>강원도 감성 여행</Text>
          </View>
        </View>
      </ImageBackground>

      <View style={[styles.bottom, { paddingBottom: bottomPad + 24 }]}>
        <Text style={[styles.headline, { color: colors.foreground }]}>
          해외여행 감성,{'\n'}강원에서 30초 만에 찾기
        </Text>
        <Text style={[styles.subcopy, { color: colors.mutedForeground }]}>
          원하는 장면을 고르면 GOAT가{'\n'}강원도 안의 비슷한 분위기 장소 3곳을 추천해드려요.
        </Text>

        <View style={styles.features}>
          {[
            { icon: '✦', text: '30초 안에 결정' },
            { icon: '◎', text: '9가지 해외 감성' },
            { icon: '◈', text: '검증된 강원도 명소' },
          ].map((f) => (
            <View key={f.text} style={[styles.featureChip, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.featureIcon, { color: colors.primary }]}>{f.icon}</Text>
              <Text style={[styles.featureText, { color: colors.secondaryForeground }]}>{f.text}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.cta, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/mood-selection')}
          activeOpacity={0.88}
          testID="landing-cta"
        >
          <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>내 감성으로 장소 찾기</Text>
          <Text style={styles.ctaArrow}>→</Text>
        </TouchableOpacity>

        <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
          강원도 43개 명소 · 로그인 불필요 · 무료
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  hero: { height: 320 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(60, 20, 120, 0.55)' },
  heroContent: { padding: 24 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBadge: {
    backgroundColor: '#84CC16',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  logoText: { fontSize: 22, fontWeight: '900', color: '#1A2E05', fontFamily: 'Inter_700Bold', letterSpacing: 1.5 },
  logoSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.9)', fontFamily: 'Inter_500Medium' },
  bottom: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'Inter_700Bold',
    lineHeight: 38,
    marginBottom: 12,
  },
  subcopy: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
    marginBottom: 24,
  },
  features: { flexDirection: 'row', gap: 8, marginBottom: 28, flexWrap: 'wrap' },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  featureIcon: { fontSize: 13, fontWeight: '700' },
  featureText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 16,
    gap: 8,
  },
  ctaText: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  ctaArrow: { fontSize: 18, color: '#FFFFFF' },
  disclaimer: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center' },
});
