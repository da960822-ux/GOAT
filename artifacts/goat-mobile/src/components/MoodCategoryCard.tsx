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
  mediterranean: {
    icon: 'sun',
    accent: '#0369A1',
    bg: '#F0F9FF',
    border: '#BAE6FD',
  },
  alps: {
    icon: 'triangle',
    accent: '#15803D',
    bg: '#F0FDF4',
    border: '#BBF7D0',
  },
  nordic: {
    icon: 'feather',
    accent: '#4338CA',
    bg: '#EEF2FF',
    border: '#C7D2FE',
  },
  japan: {
    icon: 'coffee',
    accent: '#B45309',
    bg: '#FEF3C7',
    border: '#FDE68A',
  },
  california: {
    icon: 'anchor',
    accent: '#0284C7',
    bg: '#E0F2FE',
    border: '#7DD3FC',
  },
  nightharbor: {
    icon: 'moon',
    accent: '#7C3AED',
    bg: '#F5F0FF',
    border: '#DDD6FE',
  },
  cliff: {
    icon: 'layers',
    accent: '#475569',
    bg: '#F8FAFC',
    border: '#CBD5E1',
  },
  architecture: {
    icon: 'box',
    accent: '#57534E',
    bg: '#FAFAF9',
    border: '#D6D3D1',
  },
  family: {
    icon: 'smile',
    accent: '#C2410C',
    bg: '#FFF7ED',
    border: '#FDBA74',
  },
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
          { backgroundColor: selected ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.85)' },
        ]}>
          <Feather
            name={theme.icon}
            size={20}
            color={selected ? '#FFFFFF' : theme.accent}
          />
        </View>
        {selected && (
          <View style={[styles.checkCircle, { backgroundColor: colors.accent }]}>
            <Feather name="check" size={14} color={colors.accentForeground} />
          </View>
        )}
      </View>

      <Text style={[styles.name, { color: selected ? '#FFFFFF' : colors.foreground }]}>
        {mood.name}
      </Text>
      <Text
        style={[styles.desc, { color: selected ? 'rgba(255,255,255,0.82)' : colors.mutedForeground }]}
        numberOfLines={1}
      >
        {mood.description}
      </Text>

      <View style={styles.keywords}>
        {mood.keywords.slice(0, 3).map((kw) => (
          <View
            key={kw}
            style={[
              styles.kwBadge,
              { backgroundColor: selected ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.7)' },
            ]}
          >
            <Text style={[styles.kwText, { color: selected ? '#FFFFFF' : theme.accent }]}>{kw}</Text>
          </View>
        ))}
      </View>

      <Text
        style={[styles.places, { color: selected ? 'rgba(255,255,255,0.65)' : colors.mutedForeground }]}
        numberOfLines={1}
      >
        예: {mood.placeNames.slice(0, 2).join(', ')}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  checkCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 3 },
  desc: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19, marginBottom: 10 },
  keywords: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 8 },
  kwBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6 },
  kwText: { fontSize: 12, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  places: { fontSize: 12, fontFamily: 'Inter_400Regular' },
});
