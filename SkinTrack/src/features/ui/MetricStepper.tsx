import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, fonts, spacing } from '../../app/theme';

type MetricStepperProps = {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
};

export function MetricStepper({
  label,
  value,
  onChange,
  min = 0,
  max = 5,
  suffix,
}: MetricStepperProps) {
  const current = value ?? min;
  const displayValue = value === null ? '—' : current;

  const decrement = () => {
    const next = Math.max(min, current - 1);
    onChange(next);
  };

  const increment = () => {
    const next = Math.min(max, current + 1);
    onChange(next);
  };

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.controls}>
        <Pressable style={styles.circle} onPress={decrement}>
          <Text style={styles.circleText}>–</Text>
        </Pressable>
        <Text style={[styles.value, value === null && styles.placeholder]}>
          {displayValue}
          {value !== null && suffix ? ` ${suffix}` : ''}
        </Text>
        <Pressable style={styles.circle} onPress={increment}>
          <Text style={styles.circleText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.xs,
  },
  circleText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  value: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    color: colors.text,
    minWidth: 40,
    textAlign: 'center',
    marginHorizontal: spacing.xs,
  },
  placeholder: {
    color: colors.muted,
  },
});
