import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { Mood } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface SceneTheme {
  icon: FeatherIconName;
  accent: string;
  bg: string;
  border: string;
}

const SCENE_THEME: Record<string, SceneTheme> = {
  'sea-coast': { icon: 'navigation', accent: '#0369A1', bg: '#F0F9FF', border: '#BAE6FD' },
  'japan-alley': { icon: 'map', accent: '#B45309', bg: '#FEF3C7', border: '#FDE68A' },
  'alps-ranch': { icon: 'triangle', accent: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
  'forest-garden-rest': { icon: 'feather', accent: '#047857', bg: '#ECFDF5', border: '#A7F3D0' },
  'retro-market-harbor': { icon: 'anchor', accent: '#7C3AED', bg: '#F5F0FF', border: '#DDD6FE' },
  'architecture-exhibit-landmark': { icon: 'layers', accent: '#475569', bg: '#F8FAFC', border: '#CBD5E1' },
  'resort-cafe-exotic': { icon: 'coffee', accent: '#A16207', bg: '#FFFBEB', border: '#FDE68A' },
};

const FALLBACK_THEME: SceneTheme = {
  icon: 'map-pin',
  accent: '#7C3AED',
  bg: '#F5F3FF',
  border: '#EDE9FE',
};

interface MoodCategoryCardProps {
  mood: Mood;
  selected: boolean;
  onPress: () => void;
}

export function MoodCategoryCard({ mood, selected, onPress }: MoodCategoryCardProps) {
  const colors = useColors();
  const theme = SCENE_THEME[mood.id] ?? FALLBACK_THEME;
  const scenePhrase = mood.description;

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
