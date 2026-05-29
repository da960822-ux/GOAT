import React from 'react';
import {
  View, Text, StyleSheet, ImageBackground, TouchableOpacity,
  Platform, StatusBar,
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

      {/* Hero */}
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
          </View>
          <Text style={styles.heroTagline}>
            강원에서 찾는{'\n'}나만의 해외여행 컷
          </Text>
        </View>
      </ImageBackground>

      {/* Bottom content */}
      <View style={[styles.bottom, { paddingBottom: bottomPad + 28 }]}>
        <Text style={[styles.subcopy, { color: colors.mutedForeground }]}>
          보고 싶은 분위기만 고르면 어울리는 장소 3곳을 추천해드려요.
        </Text>

        <TouchableOpacity
          style={[styles.cta, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/mood-selection')}
          activeOpacity={0.88}
          testID="landing-cta"
        >
          <Feather name="compass" size={18} color="#FFFFFF" />
          <Text style={styles.ctaText}>감성으로 장소 찾기</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ctaSecondary, { borderColor: colors.border, backgroundColor: colors.secondary }]}
          onPress={() => router.push('/photo-mood')}
          activeOpacity={0.8}
        >
          <Feather name="camera" size={15} color={colors.primary} />
          <Text style={[styles.ctaSecondaryText, { color: colors.primary }]}>사진으로 찾기</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.serviceLink}
          onPress={() => router.push('/service')}
          activeOpacity={0.6}
        >
          <Text style={[styles.serviceLinkText, { color: colors.mutedForeground }]}>서비스 안내</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  hero: { height: 320 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(30, 8, 80, 0.58)' },
  heroContent: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  logoRow: { flexDirection: 'row' },
  logoBadge: {
    backgroundColor: '#C6E33D',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1A2E05',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
  },
  heroTagline: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    lineHeight: 42,
  },
  bottom: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 28,
    justifyContent: 'flex-start',
  },
  subcopy: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 23,
    marginBottom: 28,
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
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },
  ctaSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
    gap: 8,
  },
  ctaSecondaryText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  serviceLink: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  serviceLinkText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textDecorationLine: 'underline',
  },
});
