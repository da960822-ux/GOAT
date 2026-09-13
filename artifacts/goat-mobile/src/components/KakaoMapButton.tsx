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
      Alert.alert('열기 실패', '카카오맵을 열 수 없어요. 앱이 없어도 웹에서 확인할 수 있어요.');
    }
  }

  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${place.place_name} 카카오맵으로 길찾기`}
      activeOpacity={0.82}
      testID="kakaomap-btn"
    >
      <View style={styles.inner}>
        <Feather name="navigation" size={15} color="#3A1D00" />
        <Text style={styles.label}>카카오맵으로 길찾기</Text>
      </View>
      <Text style={styles.sub}>앱이 없어도 웹에서 열려요</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 48,
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
    fontFamily: 'PretendardSemiBold',
    color: '#3A1D00',
  },
  sub: {
    fontSize: 11,
    fontFamily: 'PretendardRegular',
    color: 'rgba(58,29,0,0.55)',
  },
});
