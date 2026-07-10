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
            GOAT는 한국관광공사(KTO) 공공 API와 자체 데이터를 결합해 강원도 감성 장소를 추천합니다.
            모든 API는 공공데이터포털(data.go.kr) 기반이며, 개인정보는 수집하지 않습니다.
          </Text>
        </View>

        <ApiBlock
          colors={colors}
          icon="image"
          number="1"
          title="관광사진 정보"
          source="한국관광공사_관광사진 정보_GW"
          usage={[
            '결과 카드 썸네일 이미지',
            '장소 상세 화면 대표 이미지',
            '사진 검색 키워드로 감성·장면 참고',
          ]}
          note="장소명으로 먼저 검색하고, 결과가 없으면 감성/무드태그로 대체합니다."
        />

        <ApiBlock
          colors={colors}
          icon="map-pin"
          number="2"
          title="관광지 기본 정보"
          source="한국관광공사_국문 관광정보 서비스_GW"
          usage={[
            '장소 상세 화면: 주소, 이용 시간, 주차 정보',
            '장소 소개(개요) 텍스트',
            '카카오맵 연결 시 좌표 기반 정확한 위치 제공',
          ]}
          note="강원도(areaCode=32) 기준으로 검색합니다. 정보가 없으면 기존 자체 데이터를 사용합니다."
        />

        <ApiBlock
          colors={colors}
          icon="users"
          number="3"
          title="방문 집중 참고 정보"
          source="한국관광공사_관광지 집중률 방문자 추이 예측 정보"
          usage={[
            '결과 카드: 방문 여유 / 보통 / 방문 집중 예상 칩',
            '장소 상세 화면: 방문 팁 한 줄 메모',
          ]}
          note="실시간 혼잡도가 아닌 예측 추이 데이터입니다. 정보가 없으면 칩은 표시되지 않습니다."
        />

        <ApiBlock
          colors={colors}
          icon="layers"
          number="4"
          title="지역 관광 후보 보완"
          source="한국관광공사_기초지자체 중심 관광지 정보"
          usage={[
            '강원 시·군 단위 관광지 후보 보완',
            '지역 키워드 및 관련 장소 맥락 파악',
          ]}
          note="주로 내부 데이터 보완 용도로 사용합니다. 직접 UI에 표시되지는 않습니다."
        />

        <ApiBlock
          colors={colors}
          icon="award"
          number="5"
          title="보조 사진 · 무드 참고"
          source="한국관광공사_관광공모전(사진) 수상작 정보"
          usage={[
            '관광사진 정보 API에서 이미지를 못 찾은 경우 보조 대체 이미지',
            '감성 및 장면 무드 참고 데이터',
          ]}
          note="수상작 사진은 정확한 장소 사진이 아닐 수 있습니다. 장소명 또는 무드 키워드 일치 시에만 사용합니다."
        />

        <View style={[styles.block, { borderBottomColor: colors.border }]}>
          <View style={styles.blockHeader}>
            <Feather name="navigation" size={15} color={colors.primary} />
            <Text style={[styles.blockTitle, { color: colors.foreground }]}>위치 정보</Text>
          </View>
          {[
            '사용자가 직접 "현재 위치 사용"을 탭할 때만 위치를 가져옵니다.',
            '위치는 추천 흐름에 한 번만 사용되며 지속적으로 추적하지 않습니다.',
            '위치를 허용하지 않아도 감성 기반 추천은 정상적으로 이용할 수 있습니다.',
          ].map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <View style={[styles.dot, { backgroundColor: colors.mutedForeground }]} />
              <Text style={[styles.itemText, { color: colors.mutedForeground }]}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.block, { borderBottomColor: colors.border }]}>
          <View style={styles.blockHeader}>
            <Feather name="database" size={15} color={colors.primary} />
            <Text style={[styles.blockTitle, { color: colors.foreground }]}>자체 데이터</Text>
          </View>
          {[
            '강원 이색 장면 후보 43곳 — 자체 정리 기준 (2025년 상반기)',
            '9가지 해외 감성 카테고리 — 여행 트렌드 분석 기반 자체 분류',
            '추천 알고리즘은 완전히 기기 내(오프라인)에서 실행됩니다.',
            '데이터 기준일: 2025년 상반기 · 앱 업데이트 시 함께 갱신됩니다.',
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
