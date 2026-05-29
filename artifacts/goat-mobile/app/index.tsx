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
          <Text style={styles.heroTagline}>
            강원에서 찾는{'\n'}나만의 해외여행 컷
          </Text>
        </View>
      </ImageBackground>

      <ScrollView
        style={styles.bottomScroll}
        contentContainerStyle={[styles.bottom, { paddingBottom: bottomPad + 24 }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Text style={[styles.headline, { color: colors.foreground }]}>
          보고 싶은 분위기만 골라주세요
        </Text>
        <Text style={[styles.subcopy, { color: colors.mutedForeground }]}>
          바다, 고원, 목장, 항구, 골목까지. 보고 싶은 장면을 고르면 어울리는 장소 3곳을 추천해드려요.
        </Text>

        <TouchableOpacity
          style={[styles.cta, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/mood-selection')}
          activeOpacity={0.88}
          testID="landing-cta"
        >
          <Feather name="compass" size={18} color="#FFFFFF" />
          <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>감성으로 장소 찾기</Text>
          <Text style={styles.ctaArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ctaSecondary, { borderColor: colors.border, backgroundColor: colors.secondary }]}
          onPress={() => router.push('/photo-mood')}
          activeOpacity={0.8}
        >
          <Feather name="camera" size={16} color={colors.primary} />
          <Text style={[styles.ctaSecondaryText, { color: colors.primary }]}>사진으로 감성 찾기</Text>
        </TouchableOpacity>

        <View style={styles.regionChips}>
          {[
            { label: '동해안', color: '#0284C7', bg: '#F0F9FF' },
            { label: '고원', color: '#15803D', bg: '#F0FDF4' },
            { label: '영서', color: '#4D7C0F', bg: '#F7FEE7' },
            { label: '북부내륙', color: '#4338CA', bg: '#EEF2FF' },
          ].map((r) => (
            <View key={r.label} style={[styles.regionChip, { backgroundColor: r.bg }]}>
              <Text style={[styles.regionChipText, { color: r.color }]}>{r.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.infoRow}>
          {[
            { icon: 'map-pin', text: '감성 명소 43곳' },
            { icon: 'log-in', text: '로그인 없이 바로 시작' },
            { icon: 'navigation', text: '카카오맵으로 이동' },
          ].map((item) => (
            <View key={item.text} style={[styles.infoChip, { borderColor: colors.border }]}>
              <Feather name={item.icon as any} size={11} color={colors.mutedForeground} />
              <Text style={[styles.infoChipText, { color: colors.mutedForeground }]}>{item.text}</Text>
            </View>
          ))}
        </View>


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
  hero: { height: 300 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(50, 10, 110, 0.60)' },
  heroContent: { padding: 24, flex: 1, justifyContent: 'space-between', paddingBottom: 28 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBadge: {
    backgroundColor: '#C6E33D',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  logoText: { fontSize: 22, fontWeight: '900', color: '#1A2E05', fontFamily: 'Inter_700Bold', letterSpacing: 1.5 },
  logoSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.9)', fontFamily: 'Inter_500Medium' },
  heroTagline: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    lineHeight: 38,
  },
  bottomScroll: { flex: 1 },
  bottom: {
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  headline: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'Inter_700Bold',
    lineHeight: 30,
    marginBottom: 8,
  },
  subcopy: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
    marginBottom: 24,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
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
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    gap: 8,
  },
  ctaSecondaryText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  regionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  regionChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  regionChipText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  infoChipText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  disclaimer: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', marginBottom: 16 },
  footerLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4, marginBottom: 8 },
  footerLink: { fontSize: 11, fontFamily: 'Inter_400Regular', paddingHorizontal: 6, paddingVertical: 2, textDecorationLine: 'underline' },
});
