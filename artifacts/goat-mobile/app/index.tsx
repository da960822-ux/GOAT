import React from 'react';
import {
  View, Text, StyleSheet, ImageBackground, TouchableOpacity,
  Platform, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { GoatLogo } from '@/src/components/GoatLogo';

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
            <GoatLogo variant="badge" size="md" theme="dark" />
          </View>
          <View style={styles.heroTextBlock}>
            <Text style={styles.heroTagline}>
              해외여행 같은 장면을{'\n'}강원도에서 찾아보세요
            </Text>
            <Text style={styles.heroSub}>오늘 끌리는 감성 하나면 충분해요</Text>
          </View>
        </View>
      </ImageBackground>

      <View style={[styles.bottom, { paddingBottom: bottomPad + 28 }]}>
        <Text style={[styles.subcopy, { color: colors.mutedForeground }]}>
          7개 큰 무드에서 시작해, 그 장면을 가장 닮은{'\n'}강원 명소 3곳을 조용히 골라드려요.
        </Text>

        <TouchableOpacity
          style={[styles.cta, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/mood-selection')}
          activeOpacity={0.88}
          testID="landing-cta"
        >
          <Text style={styles.ctaText}>오늘의 감성 찾기</Text>
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
  root: { flex: 1, backgroundColor: '#FAFAF9' },
  hero: { height: 340 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20, 6, 58, 0.52)' },
  heroContent: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 36,
    justifyContent: 'space-between',
  },
  logoRow: { flexDirection: 'row' },
  heroTextBlock: { gap: 10 },
  heroTagline: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    lineHeight: 42,
    letterSpacing: 0.2,
  },
  heroSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.72)',
    fontFamily: 'Inter_400Regular',
    lineHeight: 21,
  },
  bottom: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 32,
    justifyContent: 'flex-start',
  },
  subcopy: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 24,
    marginBottom: 32,
  },
  cta: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 20,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
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
