import React from 'react';
import {
  View, Text, StyleSheet, ImageBackground, TouchableOpacity,
  Platform, StatusBar, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
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

      <ScrollView
        style={styles.bottomScroll}
        contentContainerStyle={[styles.bottom, { paddingBottom: bottomPad + 24 }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
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

        <TouchableOpacity
          style={[styles.ctaSecondary, { borderColor: colors.border, backgroundColor: colors.secondary }]}
          onPress={() => router.push('/photo-mood')}
          activeOpacity={0.8}
        >
          <Feather name="camera" size={16} color={colors.primary} />
          <Text style={[styles.ctaSecondaryText, { color: colors.primary }]}>사진으로 감성 찾기</Text>
          <View style={[styles.betaPill, { backgroundColor: colors.muted }]}>
            <Text style={[styles.betaPillText, { color: colors.mutedForeground }]}>BETA</Text>
          </View>
        </TouchableOpacity>

        <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
          강원 감성 명소 43곳 · 로그인 없이 바로 시작
        </Text>

        <View style={styles.footerLinks}>
          {[
            { label: 'GOAT 소개', path: '/about' },
            { label: '이용 안내', path: '/guide' },
            { label: '데이터 출처', path: '/data-source' },
            { label: '개인정보처리방침', path: '/privacy' },
            { label: '문의하기', path: '/contact' },
          ].map((item) => (
            <TouchableOpacity key={item.path} onPress={() => router.push(item.path as any)}>
              <Text style={[styles.footerLink, { color: colors.mutedForeground }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  hero: { height: 280 },
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
  bottomScroll: { flex: 1 },
  bottom: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  headline: {
    fontSize: 26,
    fontWeight: '800',
    fontFamily: 'Inter_700Bold',
    lineHeight: 36,
    marginBottom: 10,
  },
  subcopy: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 21,
    marginBottom: 20,
  },
  features: { flexDirection: 'row', gap: 8, marginBottom: 22, flexWrap: 'wrap' },
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
    paddingVertical: 17,
    borderRadius: 16,
    marginBottom: 10,
    gap: 8,
  },
  ctaText: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  ctaArrow: { fontSize: 18, color: '#FFFFFF' },
  ctaSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  ctaSecondaryText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  betaPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  betaPillText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  disclaimer: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', marginBottom: 16 },
  footerLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4, marginBottom: 8 },
  footerLink: { fontSize: 11, fontFamily: 'Inter_400Regular', paddingHorizontal: 6, paddingVertical: 2, textDecorationLine: 'underline' },
});
