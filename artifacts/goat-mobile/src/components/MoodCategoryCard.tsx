import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { MoodCategory } from '@/src/types/place';
import { useColors } from '@/hooks/useColors';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface SceneTheme {
  icon: FeatherIconName;
  accent: string;
  bg: string;
  border: string;
}

const SCENE_THEME: Record<string, SceneTheme> = {
  mediterranean: { icon: 'sun',    accent: '#0369A1', bg: '#F0F9FF', border: '#BAE6FD' },
  alps:          { icon: 'triangle', accent: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
  nordic:        { icon: 'feather', accent: '#4338CA', bg: '#EEF2FF', border: '#C7D2FE' },
  japan:         { icon: 'coffee',  accent: '#B45309', bg: '#FEF3C7', border: '#FDE68A' },
  california:    { icon: 'anchor',  accent: '#0284C7', bg: '#E0F2FE', border: '#7DD3FC' },
  nightharbor:   { icon: 'moon',    accent: '#7C3AED', bg: '#F5F0FF', border: '#DDD6FE' },
  cliff:         { icon: 'layers',  accent: '#475569', bg: '#F8FAFC', border: '#CBD5E1' },
  architecture:  { icon: 'box',     accent: '#57534E', bg: '#FAFAF9', border: '#D6D3D1' },
  family:        { icon: 'smile',   accent: '#C2410C', bg: '#FFF7ED', border: '#FDBA74' },
};

const SCENE_PHRASE: Record<string, string> = {
  mediterranean: '흰 건물과 푸른 바다가 맞닿는 지중해 장면',
  alps:          '드넓은 초원 위, 바람과 별이 가득한 고원',
  nordic:        '자작나무숲 사이로 걷는 조용한 숲길',
  japan:         '레트로 카페와 골목이 이어지는 소도시 산책',
  california:    '서핑보드와 노을이 어우러지는 활기찬 해변',
  nightharbor:   '항구 불빛과 먹거리가 가득한 밤 산책',
  cliff:         '절벽 끝에서 마주하는 웅장한 바다와 협곡',
  architecture:  '미니멀 건축과 예술이 만나는 감각적인 공간',
  family:        '컬러풀한 체험과 사진 명소가 기다리는 즐거운 하루',
};

const FALLBACK_THEME: SceneTheme = {
  icon: 'map-pin',
  accent: '#7C3AED',
  bg: '#F5F3FF',
  border: '#EDE9FE',
};

interface MoodCategoryCardProps {
  mood: MoodCategory;
  selected: boolean;
  onPress: () => void;
}

export function MoodCategoryCard({ mood, selected, onPress }: MoodCategoryCardProps) {
  const colors = useColors();
  const theme = SCENE_THEME[mood.id] ?? FALLBACK_THEME;
  const scenePhrase = SCENE_PHRASE[mood.id] ?? mood.description;

  const cardBg = selected ? theme.accent : theme.bg;
  const cardBorder = selected ? theme.accent : theme.border;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      testID={`mood-card-${mood.id}`}
      style={[
        styles.card,
        {
          backgroundColor: cardBg,
          borderColor: cardBorder,
          shadowColor: selected ? theme.accent : '#000',
        },
      ]}
    >
      <View style={styles.top}>
        <View style={[
          styles.iconCircle,
          { backgroundColor: selected ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.9)' },
        ]}>
          <Feather
            name={theme.icon}
            size={18}
            color={selected ? '#FFFFFF' : theme.accent}
          />
        </View>
        {selected && (
          <View style={[styles.checkCircle, { backgroundColor: colors.accent }]}>
            <Feather name="check" size={13} color={colors.accentForeground} />
          </View>
        )}
      </View>

      <Text style={[styles.name, { color: selected ? '#FFFFFF' : colors.foreground }]}>
        {mood.name}
      </Text>

      <Text
        style={[styles.scene, { color: selected ? 'rgba(255,255,255,0.88)' : colors.foreground }]}
        numberOfLines={2}
      >
        {scenePhrase}
      </Text>

      <View style={styles.keywords}>
        {mood.keywords.slice(0, 3).map((kw) => (
          <View
            key={kw}
            style={[
              styles.kwBadge,
              { backgroundColor: selected ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.75)' },
            ]}
          >
            <Text style={[styles.kwText, { color: selected ? 'rgba(255,255,255,0.9)' : theme.accent }]}>
              #{kw}
            </Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    paddingVertical: 22,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  checkCircle: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 6 },
  scene: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 21, marginBottom: 14 },
  keywords: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  kwBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7 },
  kwText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
});
