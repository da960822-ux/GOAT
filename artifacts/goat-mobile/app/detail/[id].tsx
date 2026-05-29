import React from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Header } from '@/src/components/Header';
import { TagBadge } from '@/src/components/TagBadge';
import { CautionBox } from '@/src/components/CautionBox';
import { MapButtonGroup } from '@/src/components/MapButtonGroup';
import { DataEvidenceSection } from '@/src/components/DataEvidenceSection';
import { RecommendationRoleBadge } from '@/src/components/RecommendationRoleBadge';
import { EmptyState } from '@/src/components/EmptyState';
import { getPlaceById, getAlternatives } from '@/src/services/recommendationService';
import { useColors } from '@/hooks/useColors';
import { Place, RecommendationRole } from '@/src/types/place';

export default function DetailScreen() {
  const router = useRouter();
  const { id, role, reason } = useLocalSearchParams<{ id: string; role?: string; reason?: string }>();
  const colors = useColors();

  const place = getPlaceById(id ?? '');
  const alternatives = place ? getAlternatives(place.place_id, 3) : [];

  if (!place) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <Header title="장소 상세" onBack={() => router.back()} />
        <EmptyState title="장소를 찾을 수 없습니다" description="다시 검색해주세요." />
      </View>
    );
  }

  const typedRole = role as RecommendationRole | undefined;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header title={place.place_name} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: colors.secondary }]}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primary }]}>
            <Feather name="map-pin" size={32} color="#FFFFFF" />
          </View>
          <Text style={[styles.placeName, { color: colors.foreground }]}>{place.place_name}</Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {place.city} · {place.region_group} · {place.place_type}
          </Text>
          {typedRole && (
            <View style={styles.roleWrap}>
              <RecommendationRoleBadge role={typedRole} />
            </View>
          )}
        </View>

        {reason ? (
          <View style={[styles.reasonSection, { borderBottomColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Feather name="zap" size={14} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>추천 이유</Text>
            </View>
            <View style={[styles.reasonBox, { backgroundColor: colors.overlay }]}>
              <Text style={[styles.reasonText, { color: colors.primary }]}>{reason}</Text>
            </View>
          </View>
        ) : null}

        <Section title="주요 무드" icon="sun" colors={colors}>
          <Text style={[styles.bodyText, { color: colors.foreground }]}>{place.primary_mood}</Text>
        </Section>

        <Section title="분위기 태그" icon="tag" colors={colors}>
          <View style={styles.tags}>
            {place.mood_tags.map((tag) => <TagBadge key={tag} label={`#${tag}`} />)}
          </View>
        </Section>

        <Section title="포토 포인트" icon="camera" colors={colors}>
          <Text style={[styles.bodyText, { color: colors.foreground }]}>{place.photo_point}</Text>
        </Section>

        <Section title="방문 정보" icon="info" colors={colors}>
          <InfoItem label="베스트 시간" value={place.best_time} colors={colors} />
          <InfoItem label="베스트 계절" value={place.best_season} colors={colors} />
          <InfoItem label="접근성" value={place.accessibility} colors={colors} />
        </Section>

        <Section title="추천 용도" icon="star" colors={colors}>
          <Text style={[styles.bodyText, { color: colors.foreground }]}>{place.recommendation_use}</Text>
        </Section>

        <Section title="데이터 근거" icon="bar-chart-2" colors={colors}>
          <DataEvidenceSection place={place} />
        </Section>

        <Section title="유의사항" icon="alert-circle" colors={colors}>
          <CautionBox note={place.note} />
        </Section>

        <Section title="길찾기" icon="navigation" colors={colors}>
          <MapButtonGroup place={place} />
        </Section>

        {alternatives.length > 0 && (
          <Section title="같은 감성 대안" icon="compass" colors={colors}>
            <Text style={[styles.altHint, { color: colors.mutedForeground }]}>
              같은 분위기의 다른 장소들
            </Text>
            {alternatives.map((alt) => (
              <AlternativeCard
                key={alt.place_id}
                place={alt}
                colors={colors}
                onPress={() =>
                  router.replace({ pathname: '/detail/[id]', params: { id: alt.place_id } })
                }
              />
            ))}
          </Section>
        )}

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

function Section({ title, icon, colors, children }: { title: string; icon: string; colors: any; children: React.ReactNode }) {
  return (
    <View style={[styles.section, { borderBottomColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <Feather name={icon as any} size={14} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function InfoItem({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.infoItem}>
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

function AlternativeCard({ place, colors, onPress }: { place: Place; colors: any; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.altCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.8}
    >
      <View style={styles.altContent}>
        <Text style={[styles.altName, { color: colors.foreground }]}>{place.place_name}</Text>
        <Text style={[styles.altMeta, { color: colors.mutedForeground }]}>{place.city} · {place.place_type}</Text>
        <View style={styles.altTags}>
          {place.mood_tags.slice(0, 3).map((tag) => (
            <View key={tag} style={[styles.altTag, { backgroundColor: colors.muted }]}>
              <Text style={[styles.altTagText, { color: colors.mutedForeground }]}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 40 },
  hero: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  heroIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  placeName: { fontSize: 24, fontWeight: '800', fontFamily: 'Inter_700Bold', textAlign: 'center', marginBottom: 6 },
  meta: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', marginBottom: 12 },
  roleWrap: { marginTop: 4 },
  reasonSection: { paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1 },
  reasonBox: { borderRadius: 10, padding: 12 },
  reasonText: { fontSize: 14, fontFamily: 'Inter_500Medium', lineHeight: 21 },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold', letterSpacing: 0.2 },
  bodyText: { fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  tags: { flexDirection: 'row', flexWrap: 'wrap' },
  infoItem: { flexDirection: 'row', marginBottom: 8 },
  infoLabel: { width: 90, fontSize: 13, fontFamily: 'Inter_500Medium' },
  infoValue: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  altHint: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 12 },
  altCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  altContent: { flex: 1 },
  altName: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginBottom: 3 },
  altMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 6 },
  altTags: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  altTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  altTagText: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  spacer: { height: 32 },
});
