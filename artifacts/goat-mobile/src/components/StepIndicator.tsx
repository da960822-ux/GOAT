import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BrandIcon as Feather } from '@/src/components/BrandIcon';
import { useColors } from '@/hooks/useColors';

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
}

const STEPS = [
  { n: 1, label: '감성 선택' },
  { n: 2, label: '여행 조건' },
  { n: 3, label: '추천 완료' },
];

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const colors = useColors();

  return (
    <View style={styles.root}>
      {STEPS.map((step, i) => {
        const done = step.n < currentStep;
        const active = step.n === currentStep;
        const future = step.n > currentStep;

        return (
          <React.Fragment key={step.n}>
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.dot,
                  done && { backgroundColor: colors.accent, borderColor: colors.accent },
                  active && { backgroundColor: colors.primary, borderColor: colors.primary },
                  future && { backgroundColor: 'transparent', borderColor: colors.border },
                ]}
              >
                {done ? (
                  <Feather name="check" size={11} color={colors.accentForeground} />
                ) : (
                  <Text style={[styles.dotNum, { color: active ? '#FFF' : colors.mutedForeground }]}>
                    {step.n}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.label,
                  { color: active ? colors.foreground : future ? colors.mutedForeground : colors.mutedForeground },
                  active && styles.labelActive,
                ]}
              >
                {step.label}
              </Text>
            </View>
            {i < STEPS.length - 1 && (
              <View style={[styles.line, { backgroundColor: done ? colors.accent : colors.border }]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  stepItem: { alignItems: 'center', gap: 4 },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotNum: { fontSize: 11, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  label: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  labelActive: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  line: { flex: 1, height: 2, marginHorizontal: 4, marginBottom: 14, borderRadius: 2 },
});
