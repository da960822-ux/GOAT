import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { MoodCategory } from '@/src/types/place';
import { useColors } from '@/hooks/useColors';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

const MOOD_ICONS: Record<string, FeatherIconName> = {
  mediterranean: 'sun',
  alps: 'wind',
  nordic: 'feather',
  japan: 'coffee',
  california: 'anchor',
  nightharbor: 'moon',
  cliff: 'triangle',
  architecture: 'box',
  family: 'smile',
};

interface MoodCategoryCardProps {
  mood: MoodCategory;
  selected: boolean;
  onPress: () => void;
}

export function MoodCategoryCard({ mood, selected, onPress }: MoodCategoryCardProps) {
  const colors = useColors();
  const iconName: FeatherIconName = MOOD_ICONS[mood.id] ?? 'map-pin';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      testID={`mood-card-${mood.id}`}
      style={[
        styles.card,
        {
          backgroundColor: selected ? colors.primary : colors.card,
          borderColor: selected ? colors.primary : colors.border,
          shadowColor: selected ? colors.primary : '#000',
        },
      ]}
    >
      <View style={styles.top}>
        <View style={[styles.iconCircle, { backgroundColor: selected ? 'rgba(255,255,255,0.2)' : colors.secondary }]}>
          <Feather name={iconName as any} size={20} color={selected ? '#FFFFFF' : colors.primary} />
        </View>
        {selected && (
          <View style={[styles.checkCircle, { backgroundColor: colors.accent }]}>
            <Feather name="check" size={14} color={colors.accentForeground} />
          </View>
        )}
      </View>

      <Text style={[styles.name, { color: selected ? '#FFFFFF' : colors.foreground }]}>{mood.name}</Text>
      <Text style={[styles.desc, { color: selected ? 'rgba(255,255,255,0.8)' : colors.mutedForeground }]} numberOfLines={2}>
        {mood.description}
      </Text>

      <View style={styles.keywords}>
        {mood.keywords.slice(0, 4).map((kw) => (
          <View key={kw} style={[styles.kwBadge, { backgroundColor: selected ? 'rgba(255,255,255,0.18)' : colors.muted }]}>
            <Text style={[styles.kwText, { color: selected ? '#FFFFFF' : colors.secondaryForeground }]}>{kw}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.places, { color: selected ? 'rgba(255,255,255,0.65)' : colors.mutedForeground }]} numberOfLines={1}>
        {mood.placeNames.slice(0, 3).join(' · ')}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  checkCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 4 },
  desc: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19, marginBottom: 12 },
  keywords: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  kwBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 5, marginBottom: 4 },
  kwText: { fontSize: 11, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  places: { fontSize: 11, fontFamily: 'Inter_400Regular' },
});
