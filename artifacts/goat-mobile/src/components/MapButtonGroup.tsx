import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Place } from '@/src/types/place';
import { openKakaoMap, openNaverMap, openTmap } from '@/src/services/mapLink';
import { useColors } from '@/hooks/useColors';

interface MapButtonGroupProps {
  place: Place;
}

const MAP_BUTTONS = [
  { label: '카카오맵', handler: openKakaoMap, color: '#F7E600', textColor: '#3A1D00' },
  { label: '네이버지도', handler: openNaverMap, color: '#03C75A', textColor: '#FFFFFF' },
  { label: '티맵', handler: openTmap, color: '#E8002D', textColor: '#FFFFFF' },
];

export function MapButtonGroup({ place }: MapButtonGroupProps) {
  const colors = useColors();

  async function handlePress(handler: (p: Place) => Promise<void>) {
    try {
      await handler(place);
    } catch {
      Alert.alert('열기 실패', '지도 앱을 열 수 없습니다. 앱이 설치되어 있는지 확인해주세요.');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>길찾기</Text>
      <View style={styles.buttons}>
        {MAP_BUTTONS.map((btn) => (
          <TouchableOpacity
            key={btn.label}
            style={[styles.btn, { backgroundColor: btn.color }]}
            onPress={() => handlePress(btn.handler)}
            testID={`map-btn-${btn.label}`}
            activeOpacity={0.8}
          >
            <Text style={[styles.btnText, { color: btn.textColor }]}>{btn.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 14 },
  label: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginBottom: 8,
  },
  buttons: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
});
