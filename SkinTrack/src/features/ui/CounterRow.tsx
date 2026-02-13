import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, fonts, spacing } from '../../app/theme';

type CounterRowProps = {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
};

export function CounterRow({
  label,
  value,
  onChange,
  min = 0,
  max = 12,
  suffix,
}: CounterRowProps) {
  const current = value ?? 0;

  return (
    <View style={styles.row}>
      <View>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {current} {suffix ?? ''}
        </Text>
      </View>
      <View style={styles.controls}>
        <Pressable
          style={styles.button}
          onPress={() => onChange(Math.max(min, current - 1))}
        >
          <Text style={styles.buttonText}>–</Text>
        </Pressable>
        <Pressable
          style={styles.button}
          onPress={() => onChange(Math.min(max, current + 1))}
        >
          <Text style={styles.buttonText}>+</Text>
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
    marginBottom: spacing.sm,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  value: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    color: colors.text,
  },
  controls: {
    flexDirection: 'row',
  },
  button: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  buttonText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    color: colors.text,
  },
});
