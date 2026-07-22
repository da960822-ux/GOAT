import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, View } from 'react-native';
import { BrandIcon as Feather } from '@/src/components/BrandIcon';
import { Place } from '@/src/types/place';
import { openKakaoMap } from '@/src/services/mapLink';

interface KakaoMapButtonProps {
  place: Place;
}

export function KakaoMapButton({ place }: KakaoMapButtonProps) {
  async function handlePress() {
    try {
      await openKakaoMap(place);
    } catch {
      Alert.alert('열기 실패', '카카오맵을 열 수 없습니다.\n앱이 설치되어 있지 않으면 웹으로 연결됩니다.');
    }
  }

  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={handlePress}
      activeOpacity={0.82}
      testID="kakaomap-btn"
    >
      <View style={styles.inner}>
        <Feather name="navigation" size={15} color="#3A1D00" />
        <Text style={styles.label}>카카오맵으로 길찾기</Text>
      </View>
      <Text style={styles.sub}>앱 없으면 웹으로 자동 연결</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: '#F7E600',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    color: '#3A1D00',
  },
  sub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(58,29,0,0.55)',
  },
});
