import React, { useState } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { BrandIcon as Feather } from '@/src/components/BrandIcon';
import { Header } from '@/src/components/Header';
import { useColors } from '@/hooks/useColors';
import { fonts, radius, spacing } from '@/src/theme/editorial';
import { MotionPressable } from '@/src/components/MotionPressable';

export default function DataSourceScreen() {
  const router = useRouter();
  const colors = useColors();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header title="데이터 출처 안내" onBack={() => router.back()} />
      <Animated.ScrollView entering={FadeInDown.duration(320)} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.intro, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Text style={[styles.introText, { color: colors.mutedForeground }]}>
            GOAT는 자체 정리한 강원 장소 데이터와 한국관광공사·Google Maps·기상청 데이터를 구분해 사용합니다.
            추천은 장면 특징 관계를 우선하며, 사용자가 요청한 이동 방법과 오늘 조건만 가능한 범위에서 보정합니다.
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
            '현재 공개된 큰 무드와 세부 장면',
            '감성 태그, 장면 태그, 목적 태그, 접근성, 계절 정보',
          ]}
          note="현재 고를 수 있는 장면만 보여드려요. 장면을 하나 고르면 바로 세 곳을 추천해요."
        />

        <ApiBlock
          colors={colors}
          icon="image"
          number="2"
          title="관광사진 정보"
          source="출처: ⓒ한국관광공사"
          usage={[
            '추천 카드 썸네일 이미지',
            '장소 상세 화면 대표 이미지',
            '장소명 또는 감성 키워드 기반 보조 이미지 검색',
          ]}
          note="사진별 실제 제공처를 이미지 가까이에 표시합니다. 출처가 불명확한 이미지는 사용하지 않습니다."
        />

        <ApiBlock
          colors={colors}
          icon="map-pin"
          number="3"
          title="Google Places 사진"
          source="Google Maps"
          usage={[
            '한국관광공사 사진이 없거나 품질 기준에 미달한 장소의 보조 사진',
            '사진 작성자와 Google Maps 원본 링크를 상세·갤러리에서 제공',
          ]}
          note="Google 사진은 서버에서 요청 시 조회하며 photo resource와 이미지 URL을 영구 저장하지 않습니다."
        />

        <ApiBlock
          colors={colors}
          icon="map-pin"
          number="4"
          title="관광지 기본 정보"
          source="관광정보 출처: ⓒ한국관광공사"
          usage={[
            '장소 주소, 좌표, 설명, 주차 등 상세 정보 보완',
            '카카오맵 연결에 필요한 위치 정보 확인',
          ]}
          note="한국관광공사 응답을 실제 사용한 정보에만 이 출처를 표시합니다. GOAT의 mood·photo point·scene tag에는 적용하지 않습니다."
        />

        <ApiBlock
          colors={colors}
          icon="sun"
          number="5"
          title="날씨 정보"
          source="날씨정보 출처: 기상청"
          usage={[
            '오늘 조건을 요청했을 때 장소별 단기예보 비교',
            '날씨가 실제 추천에 반영된 경우에만 상세 화면에 출처 표시',
          ]}
          note="예보 조회 실패나 미반영 상태를 날씨 데이터가 없는 장소로 오해하지 않도록 별도 상태로 처리합니다."
        />

        <ApiBlock
          colors={colors}
          icon="users"
          number="6"
          title="방문 집중도 참고 정보"
          source="관광정보 출처: ⓒ한국관광공사"
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
            'GOAT는 기기의 현재 위치 권한을 요청하지 않습니다.',
            '사용자가 출발지를 직접 입력하거나 건너뛰어도 장면 추천을 이용할 수 있습니다.',
            '지도 앱으로 이동한 뒤 실제 경로와 이동 시간을 확인하는 흐름을 권장합니다.',
          ].map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <View style={[styles.dot, { backgroundColor: colors.mutedForeground }]} />
              <Text style={[styles.itemText, { color: colors.mutedForeground }]}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.spacer} />
      </Animated.ScrollView>
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
  const [expanded, setExpanded] = useState(true);
  return (
    <View style={[styles.block, { borderBottomColor: colors.border }]}>
      <MotionPressable
        accessibilityRole="button"
        accessibilityLabel={`${number}. ${title} 펼치기`}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((value) => !value)}
        style={styles.blockHeader}
      >
        <Feather name={icon as any} size={15} color={colors.primary} />
        <Text style={[styles.blockTitle, { color: colors.foreground, flex: 1 }]}>
          {number}. {title}
        </Text>
        <Feather name="arrow-right" size={15} color={colors.mutedForeground} style={{ transform: [{ rotate: expanded ? '-90deg' : '90deg' }] }} />
      </MotionPressable>
      {expanded ? <Animated.View entering={FadeInDown.duration(180)}>
        <View style={styles.sourceLine}>
          <Text style={[styles.sourceText, { color: colors.mutedForeground }]}>{source}</Text>
        </View>
        {usage.map((item, i) => (
          <View key={i} style={styles.itemRow}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.itemText, { color: colors.foreground }]}>{item}</Text>
          </View>
        ))}
        <Text style={[styles.noteText, { color: colors.mutedForeground }]}>{note}</Text>
      </Animated.View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 40 },
  intro: { marginHorizontal: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.md, padding: 18, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  introText: { fontSize: 15, fontFamily: fonts.body, lineHeight: 24 },
  block: { paddingHorizontal: spacing.lg, paddingVertical: 26, borderBottomWidth: StyleSheet.hairlineWidth },
  blockHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  blockTitle: { fontSize: 20, lineHeight: 28, fontFamily: fonts.serif },
  sourceLine: { marginBottom: 12 },
  sourceText: { fontSize: 12, lineHeight: 18, fontFamily: fonts.medium },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 10 },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 8 },
  itemText: { flex: 1, fontSize: 15, fontFamily: fonts.body, lineHeight: 24 },
  noteText: { fontSize: 13, fontFamily: fonts.body, lineHeight: 21, marginTop: 6 },
  spacer: { height: 32 },
});
