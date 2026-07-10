import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Path, Circle } from 'react-native-svg';

interface GoatLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'symbol' | 'horizontal' | 'badge' | 'stacked';
  theme?: 'dark' | 'light';
}

function FramePinSymbol({ width, height }: { width: number; height: number }) {
  const scale = width / 100;
  const h = height / scale;
  return (
    <Svg width={width} height={height} viewBox={`0 0 100 ${h}`}>
      {/* Frame body */}
      <Rect x="3" y="3" width="94" height="80" rx="16" fill="#3A2374" />
      {/* Inner frosted window */}
      <Rect x="16" y="16" width="68" height="54" rx="9" fill="white" fillOpacity="0.12" />
      {/* Lime top bar accent */}
      <Rect x="16" y="16" width="68" height="4" rx="2" fill="#C6E33D" fillOpacity="0.75" />
      {/* Corner dots */}
      <Circle cx="24" cy="24" r="3" fill="white" fillOpacity="0.28" />
      <Circle cx="76" cy="24" r="3" fill="white" fillOpacity="0.28" />
      {/* Pin neck */}
      <Path d={`M50 83 L43 104 Q50 112 57 104 Z`} fill="#3A2374" />
      {/* Lime tip */}
      <Circle cx="50" cy="106" r="6" fill="#C6E33D" />
    </Svg>
  );
}

export function GoatLogo({ size = 'md', variant = 'badge', theme = 'dark' }: GoatLogoProps) {
  const symbolSizes = { sm: 28, md: 40, lg: 56 };
  const wordSizes = { sm: 20, md: 28, lg: 38 };
  const symbolW = symbolSizes[size];
  const symbolH = Math.round(symbolW * 1.18);

  if (variant === 'symbol') {
    return <FramePinSymbol width={symbolW} height={symbolH} />;
  }

  if (variant === 'badge') {
    return (
      <View style={[
        styles.badge,
        theme === 'dark' ? styles.badgeDark : styles.badgeLight,
      ]}>
        <Text style={[
          styles.badgeText,
          { fontSize: wordSizes[size] },
          theme === 'dark' ? styles.badgeTextDark : styles.badgeTextLight,
        ]}>
          GOAT
        </Text>
        <View style={styles.badgeUnderline} />
      </View>
    );
  }

  if (variant === 'horizontal') {
    return (
      <View style={styles.horizontal}>
        <FramePinSymbol width={symbolW} height={symbolH} />
        <View style={styles.wordmarkWrap}>
          <Text style={[
            styles.wordmark,
            { fontSize: wordSizes[size] },
            { color: theme === 'dark' ? '#FFFFFF' : '#3A2374' },
          ]}>
            GOAT
          </Text>
          <View style={styles.wordmarkUnderline} />
        </View>
      </View>
    );
  }

  if (variant === 'stacked') {
    return (
      <View style={styles.stacked}>
        <FramePinSymbol width={symbolW} height={symbolH} />
        <View style={styles.wordmarkWrap}>
          <Text style={[
            styles.wordmark,
            { fontSize: wordSizes[size] },
            { color: theme === 'dark' ? '#FFFFFF' : '#3A2374' },
          ]}>
            GOAT
          </Text>
          <View style={styles.wordmarkUnderline} />
        </View>
        <Text style={[
          styles.tagline,
          { color: theme === 'dark' ? 'rgba(255,255,255,0.55)' : '#9CA3AF' },
        ]}>
          강원도 감성 여행
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: 'center',
    gap: 3,
  },
  badgeDark: { backgroundColor: '#3A2374' },
  badgeLight: { backgroundColor: '#C6E33D' },
  badgeText: {
    fontFamily: 'Inter_700Bold',
    fontWeight: '700',
    letterSpacing: 3,
  },
  badgeTextDark: { color: '#FFFFFF' },
  badgeTextLight: { color: '#1A2E05' },
  badgeUnderline: {
    width: '80%',
    height: 2,
    backgroundColor: '#C6E33D',
    borderRadius: 1,
  },
  horizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stacked: {
    alignItems: 'center',
    gap: 6,
  },
  wordmarkWrap: {
    alignItems: 'flex-start',
    gap: 3,
  },
  wordmark: {
    fontFamily: 'Inter_700Bold',
    fontWeight: '700',
    letterSpacing: 4,
  },
  wordmarkUnderline: {
    width: '100%',
    height: 3,
    backgroundColor: '#C6E33D',
    borderRadius: 2,
  },
  tagline: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    letterSpacing: 1,
    marginTop: 2,
  },
});
