import React from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Header } from '@/src/components/Header';
import { useColors } from '@/hooks/useColors';

export default function DataSourceScreen() {
  const router = useRouter();
  const colors = useColors();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header title="데이터 출처 안내" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.intro, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Text style={[styles.introText, { color: colors.mutedForeground }]}>
            GOAT는 자체 정리한 강원 장소 데이터와 한국관광공사 공공 API를 함께 사용합니다.
            추천 점수는 감성 태그, 장면 태그, 여행 목적, 이동수단, 계절 정보를 중심으로 계산합니다.
          </Text>
        </View>

        <ApiBlock
          colors={colors}
          icon="database"
          number="1"
          title="자체 장소 데이터"
          source="GOAT 강원 장소 데이터셋"
          usage={[
            '61개 강원 장소 후보',
            '7개 큰 무드와 21개 세부 레퍼런스 카드',
            '감성 태그, 장면 태그, 목적 태그, 접근성, 계절 정보',
          ]}
          note="프론트는 7개 큰 무드만 보여주기보다 21개 세부 레퍼런스 카드를 함께 사용하면 추천 의도를 더 선명하게 전달할 수 있습니다."
        />

        <ApiBlock
          colors={colors}
          icon="image"
          number="2"
          title="관광사진 정보"
          source="한국관광공사 관광사진 정보 API"
          usage={[
            '추천 카드 썸네일 이미지',
            '장소 상세 화면 대표 이미지',
            '장소명 또는 감성 키워드 기반 보조 이미지 검색',
          ]}
          note="관광사진 API 결과가 없으면 자체 이미지 또는 보조 이미지로 대체될 수 있습니다."
        />

        <ApiBlock
          colors={colors}
          icon="map-pin"
          number="3"
          title="관광지 기본 정보"
          source="한국관광공사 국문 관광정보 서비스"
          usage={[
            '장소 주소, 좌표, 설명, 주차 등 상세 정보 보완',
            '카카오맵 연결에 필요한 위치 정보 확인',
          ]}
          note="공공 API 정보가 없거나 최신 운영 상태와 다를 수 있어 방문 전 공식 채널 확인을 권장합니다."
        />

        <ApiBlock
          colors={colors}
          icon="users"
          number="4"
          title="방문 집중도 참고 정보"
          source="한국관광공사 방문 추이/예측 데이터"
          usage={[
            '방문 주의 또는 혼잡 가능성 참고',
            '상세 화면의 보조 안내 문구',
          ]}
          note="실시간 혼잡도 데이터가 아니라 예측/추이 참고 데이터입니다."
        />

        <View style={[styles.block, { borderBottomColor: colors.border }]}>
          <View style={styles.blockHeader}>
            <Feather name="navigation" size={15} color={colors.primary} />
            <Text style={[styles.blockTitle, { color: colors.foreground }]}>위치 정보</Text>
          </View>
          {[
            '현재 추천 카드 점수에는 사용자 출발 위치가 직접 반영되지 않습니다.',
            '위치를 허용하지 않아도 감성 기반 추천은 정상적으로 이용할 수 있습니다.',
            '지도 앱으로 이동한 뒤 실제 경로와 이동 시간을 확인하는 흐름을 권장합니다.',
          ].map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <View style={[styles.dot, { backgroundColor: colors.mutedForeground }]} />
              <Text style={[styles.itemText, { color: colors.mutedForeground }]}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

function ApiBlock({
  colors, icon, number, title, source, usage, note,
}: {
  colors: any;
  icon: string;
  number: string;
  title: string;
  source: string;
  usage: string[];
  note: string;
}) {
  return (
    <View style={[styles.block, { borderBottomColor: colors.border }]}>
      <View style={styles.blockHeader}>
        <Feather name={icon as any} size={15} color={colors.primary} />
        <Text style={[styles.blockTitle, { color: colors.foreground }]}>
          {number}. {title}
        </Text>
      </View>
      <View style={[styles.sourcePill, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Text style={[styles.sourceText, { color: colors.mutedForeground }]}>{source}</Text>
      </View>
      {usage.map((item, i) => (
        <View key={i} style={styles.itemRow}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.itemText, { color: colors.foreground }]}>{item}</Text>
        </View>
      ))}
      <Text style={[styles.noteText, { color: colors.mutedForeground }]}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 40 },
  intro: { margin: 20, padding: 16, borderRadius: 14, borderWidth: 1 },
  introText: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  block: { paddingHorizontal: 20, paddingVertical: 20, borderBottomWidth: 1 },
  blockHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  blockTitle: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  sourcePill: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 12, alignSelf: 'flex-start' },
  sourceText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 10 },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 8 },
  itemText: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 21 },
  noteText: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 19, marginTop: 4 },
  spacer: { height: 32 },
});
