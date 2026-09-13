import React, { useState } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '@/src/components/Header';
import { useColors } from '@/hooks/useColors';
import { fonts, radius, spacing } from '@/src/theme/editorial';
import { BrandIcon } from '@/src/components/BrandIcon';
import { MotionPressable } from '@/src/components/MotionPressable';

export default function PrivacyScreen() {
  const router = useRouter();
  const colors = useColors();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header title="개인정보 처리방침" onBack={() => router.back()} />
      <Animated.ScrollView entering={FadeInDown.duration(320)} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View accessibilityRole="text" style={[styles.notice, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
            시행일: 2025년 1월 1일{'\n'}최종 수정일: 2026년 9월 13일
          </Text>
        </View>

        {SECTIONS.map((sec) => <Disclosure key={sec.title} title={sec.title} body={sec.body} colors={colors} />)}
        <View style={styles.spacer} />
      </Animated.ScrollView>
    </View>
  );
}

function Disclosure({ title, body, colors }: { title: string; body: string; colors: any }) {
  const [expanded, setExpanded] = useState(true);
  return <View style={[styles.section, { borderBottomColor: colors.border }]}>
    <MotionPressable accessibilityRole="button" accessibilityLabel={`${title} 펼치기`} accessibilityState={{ expanded }} onPress={() => setExpanded((value) => !value)} style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      <BrandIcon name="arrow-right" size={15} color={colors.mutedForeground} style={{ transform: [{ rotate: expanded ? '-90deg' : '90deg' }] }} />
    </MotionPressable>
    {expanded ? <Animated.View entering={FadeInDown.duration(180)}><Text style={[styles.body, { color: colors.mutedForeground }]}>{body}</Text></Animated.View> : null}
  </View>;
}

const SECTIONS = [
  {
    title: '수집하는 개인정보',
    body: '장면 추천과 내 장면 기기 저장은 로그인 없이 사용할 수 있습니다. 선택 로그인을 이용하면 OAuth 제공자가 전달한 계정 식별자, 표시 이름, 이메일과 로그인 시각을 계정 기능 제공을 위해 서버에서 처리합니다. 로그인하지 않은 내 장면과 메모는 현재 기기에만 저장됩니다.',
  },
  {
    title: '위치정보 수집',
    body: 'GOAT는 기기의 현재 위치를 요청하거나 수집하지 않습니다. 출발지는 지역·주소를 직접 입력하거나 건너뛸 수 있습니다. 입력한 출발지의 주소 검색과 이동시간 계산에는 카카오 API가 사용될 수 있습니다. GOAT는 로그인 추천 기록에 정확한 출발 좌표와 입력 원문을 저장하지 않습니다.\n\n지도 앱 연동 시 외부 앱(카카오맵)으로 이동하며, 해당 앱의 개인정보 처리방침이 적용됩니다.',
  },
  {
    title: '장소 이미지',
    body: '결과 화면과 장소 상세에 표시되는 사진은 한국관광공사 공공 API, Google Places 또는 사용 근거가 확인된 GOAT 보유 이미지에서 제공됩니다. 사진마다 실제 출처를 구분해 표시하며, Google Places 사진은 요청 시 조회하고 이미지 URL을 영구 저장하지 않습니다.',
  },
  {
    title: '공공 API 연동',
    body: '앱 서버는 한국관광공사 공공데이터 API로 관광사진과 장소 정보를, 기상청 API로 요청한 오늘 조건의 날씨를 조회할 수 있습니다. 주소 검색과 이동시간 계산에는 카카오 API가 사용될 수 있습니다. 장소명·지역·입력한 출발지 등 요청 처리에 필요한 정보가 해당 제공자에게 전송될 수 있지만 API 키는 클라이언트 앱에 포함하지 않습니다.',
  },
  {
    title: '분석 및 추적',
    body: '앱에는 광고 추적이나 별도 사용자 행동 분석 도구를 연결하지 않았습니다. 장면 선택과 조건은 추천 결과 생성을 위해 GOAT 서버에서 처리되며, 서버에는 오류 대응과 보안을 위한 최소 요청 로그가 남을 수 있습니다.',
  },
  {
    title: '제3자 서비스',
    body: '지도 버튼 클릭 시 카카오맵 앱이 실행됩니다. 주소 검색과 이동시간 계산에는 카카오 API를 사용하며, 한국관광공사 공공 API는 관광정보와 사진 확인에 사용합니다. 각 서비스에는 해당 제공자의 개인정보 처리방침과 이용약관이 적용됩니다.',
  },
  {
    title: '보유기간과 파기',
    body: '선택 로그인으로 처리한 계정 정보와 서버 추천 기록은 계정 삭제 요청 처리가 끝날 때까지 보유합니다. 관계 법령에 별도 보존 의무가 있는 경우에는 해당 기간 동안 분리 보관한 뒤 지체 없이 파기합니다. 기기에 저장한 장면과 메모는 앱에서 직접 삭제하거나 앱 데이터를 삭제하면 제거됩니다.',
  },
  {
    title: '이용자의 선택과 권리',
    body: '로그인은 선택 사항이며 동의하지 않아도 장면 추천과 기기 저장을 이용할 수 있습니다. 개인정보 열람·정정·삭제 또는 계정 삭제는 contact@goattravel.app으로 요청할 수 있습니다. 요청자의 계정을 확인한 뒤 처리 결과를 안내합니다.',
  },
  {
    title: '문의',
    body: '개인정보 처리방침, 개인정보 열람·정정·삭제 및 계정 삭제 요청은 contact@goattravel.app으로 연락해 주세요. 출시 전에 원스토어 판매자 정보와 동일한 운영자명·전화번호·웹사이트를 공개 정책 페이지에 게시합니다.',
  },
];

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 40 },
  notice: { marginHorizontal: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.md, padding: 18, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  noticeText: { fontSize: 13, fontFamily: fonts.body, lineHeight: 21 },
  section: { paddingHorizontal: spacing.lg, paddingVertical: 26, borderBottomWidth: StyleSheet.hairlineWidth },
  sectionHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { flex: 1, fontSize: 20, lineHeight: 28, fontFamily: fonts.serif },
  body: { fontSize: 15, fontFamily: fonts.body, lineHeight: 24 },
  spacer: { height: 32 },
});
