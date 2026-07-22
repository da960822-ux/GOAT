import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { BrandIcon as Feather } from '@/src/components/BrandIcon';
import { Header } from '@/src/components/Header';
import { useColors } from '@/hooks/useColors';

const LINKS = [
  { label: 'GOAT 소개', icon: 'info' as const, path: '/about' },
  { label: '이용 안내', icon: 'book-open' as const, path: '/guide' },
  { label: '데이터 출처', icon: 'database' as const, path: '/data-source' },
  { label: '개인정보처리방침', icon: 'shield' as const, path: '/privacy' },
  { label: '문의하기', icon: 'mail' as const, path: '/contact' },
];

export default function ServiceScreen() {
  const router = useRouter();
  const colors = useColors();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header title="서비스 안내" onBack={() => router.back()} />

      <View style={styles.list}>
        {LINKS.map((item, i) => (
          <TouchableOpacity
            key={item.path}
            style={[
              styles.row,
              { borderBottomColor: colors.border },
              i === 0 && { borderTopWidth: 1, borderTopColor: colors.border },
            ]}
            onPress={() => router.push(item.path as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
              <Feather name={item.icon} size={16} color={colors.primary} />
            </View>
            <Text style={[styles.label, { color: colors.foreground }]}>{item.label}</Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { marginTop: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
    borderBottomWidth: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, fontSize: 15, fontFamily: 'Inter_500Medium' },
});
