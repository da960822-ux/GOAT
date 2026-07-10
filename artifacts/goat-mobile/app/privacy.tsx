import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Header } from '@/src/components/Header';
import { useColors } from '@/hooks/useColors';

export default function PrivacyScreen() {
  const router = useRouter();
  const colors = useColors();

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.background },
      ]}
    >
      <Header
        title="개인정보 처리방침"
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.notice,
            {
              backgroundColor: colors.secondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.noticeText,
              { color: colors.mutedForeground },
            ]}
          >
            시행일: 2025년 1월 1일{'\n'}
            최종 수정일: 2026년 5월 29일
          </Text>
        </View>

        {SECTIONS.map((section) => (
          <View
            key={section.title}
            style={[
              styles.section,
              { borderBottomColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.foreground },
              ]}
            >
              {section.title}
            </Text>

            <Text
              style={[
                styles.body,
                { color: colors.mutedForeground },
              ]}
            >
              {section.body}
            </Text>
          </View>
        ))}

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const SECTIONS = [
  {
    title: '수집하는 개인정보',
    body:
      'GOAT 앱은 어떠한 개인정보도 수집하지 않습니다. ' +
      '회원가입, 로그인 기능이 없으며, 앱 사용 중 입력되는 모든 선택 정보' +
      '(감성 선택, 여행 조건 등)는 기기 내에서만 처리됩니다.',
  },
  {
    title: '위치정보 수집',
    body:
      '현재 위치는 가까운 감성 장소 추천을 위해 사용되며, ' +
      '사용자가 직접 "현재 위치 사용"을 탭하여 권한을 허용한 경우에만 한 번 가져옵니다. ' +
      '위치는 지속적으로 추적하지 않으며, 추천 흐름이 끝나면 기기 메모리에서 즉시 삭제됩니다.\n\n' +
      '위치 권한을 허용하지 않아도 감성 기반 추천은 정상적으로 이용할 수 있습니다.\n\n' +
      '지도 앱 연동 시 외부 앱(카카오맵)으로 이동하며, 해당 앱의 개인정보 처리방침이 적용됩니다.',
  },
  {
    title: '사진 및 이미지',
    body:
      '결과 화면과 장소 상세에 표시되는 사진은 한국관광공사 공공 API에서 제공하는 이미지이며, ' +
      '사용자의 개인 이미지와 무관합니다.',
  },
  {
    title: '공공 API 연동',
    body:
      '앱은 한국관광공사(KTO) 공공데이터 API를 사용해 관광사진, 장소 정보, ' +
      '방문 추이 예측 데이터를 조회합니다. 이 과정에서 장소명 등 검색 키워드가 API에 전송되지만, ' +
      '사용자를 특정할 수 있는 정보는 포함되지 않습니다. API 키는 앱 외부에 노출되지 않습니다.',
  },
  {
    title: '분석 및 추적',
    body:
      '앱 내 어떠한 분석 도구, 광고 추적, 사용자 행동 수집 코드도 포함되어 있지 않습니다. ' +
      '모든 추천 알고리즘은 사용자 기기에서만 실행됩니다.',
  },
  {
    title: '제3자 서비스',
    body:
      '지도 버튼 클릭 시 카카오맵 앱이 실행됩니다. 해당 서비스의 개인정보 처리방침은 카카오 정책을 따릅니다. ' +
      '한국관광공사 공공 API는 공공데이터포털(data.go.kr) 이용 약관을 따릅니다.',
  },
  {
    title: '문의',
    body:
      '개인정보 처리방침 관련 문의는 contact@goattravel.app 으로 연락해 주세요. ' +
      '현재 MVP 단계의 임시 문의 채널입니다.',
  },
];

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  scroll: {
    paddingBottom: 40,
  },

  notice: {
    margin: 20,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },

  noticeText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },

  section: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginBottom: 10,
  },

  body: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
  },

  spacer: {
    height: 32,
  },
});