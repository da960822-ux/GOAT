import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BrandIcon as Feather } from '@/src/components/BrandIcon';
import { useColors } from '@/hooks/useColors';

interface CautionBoxProps {
  note: string;
}

export function CautionBox({ note }: CautionBoxProps) {
  const colors = useColors();
  if (!note || note.trim() === '') return null;

  return (
    <View style={[styles.container, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
      <Feather name="alert-circle" size={14} color="#D97706" style={styles.icon} />
      <Text style={styles.text}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginTop: 10,
  },
  icon: { marginRight: 8, marginTop: 1 },
  text: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 19,
    fontFamily: 'Inter_400Regular',
  },
});
