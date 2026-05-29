import React from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '@/src/components/Header';
import { useColors } from '@/hooks/useColors';

export default function DataSourceScreen() {
  const router = useRouter();
  const colors = useColors();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header title="데이터 출처 안내" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <InfoBlock
          title="장소 데이터"
          colors={colors}
          items={[
            '한국관광공사 국문 관광정보 서비스',
            '한국관광공사 관광사진 정보 서비스',
            '관광지 방문 집중률 및 방문자 추이 예측 정보',
            '자체 정리한 강원 이색 장면 후보 데이터',
            '앱 내 모든 장소는 data_status: "confirmed" 기준으로 필터링됩니다.',
          ]}
        />
        <InfoBlock
          title="감성 분류"
          colors={colors}
          items={[
            '9가지 해외 감성 카테고리는 여행 트렌드 분석 기반 자체 분류입니다.',
            '키워드·무드태그·사진포인트 필드를 조합해 점수를 산출합니다.',
            '추천 알고리즘은 완전히 로컬(오프라인)에서 실행됩니다.',
          ]}
        />
        <InfoBlock
          title="지도 연동"
          colors={colors}
          items={[
            '카카오맵 링크는 장소명+도시 검색 방식으로 연결됩니다.',
            '현재 버전은 카카오맵 단일 연동입니다.',
            '검색 결과는 카카오맵 알고리즘에 따라 다를 수 있습니다.',
          ]}
        />
        <InfoBlock
          title="날씨·방문 정보"
          colors={colors}
          items={[
            '기상청 단기예보 데이터를 기반으로 계절별 추천 필터를 구성합니다.',
            '실시간 날씨·혼잡도·운영 시간은 제공하지 않습니다.',
            '방문 전 현지 확인을 권장합니다.',
          ]}
        />
        <InfoBlock
          title="데이터 업데이트"
          colors={colors}
          items={[
            '장소 정보는 앱 업데이트 시 함께 갱신됩니다.',
            '현재 데이터 기준일: 2025년 상반기',
            '방문 전 현지 확인을 권장합니다.',
          ]}
        />
        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

function InfoBlock({ title, colors, items }: { title: string; colors: any; items: string[] }) {
  return (
    <View style={[styles.block, { borderBottomColor: colors.border }]}>
      <Text style={[styles.blockTitle, { color: colors.foreground }]}>{title}</Text>
      {items.map((item, i) => (
        <View key={i} style={styles.itemRow}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.itemText, { color: colors.mutedForeground }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 40 },
  block: { paddingHorizontal: 20, paddingVertical: 20, borderBottomWidth: 1 },
  blockTitle: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 14 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  itemText: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 21 },
  spacer: { height: 32 },
});
