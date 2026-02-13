import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, fonts, radii, spacing } from '../../app/theme';

type ForecastToggleProps = {
  title: string;
  withPlanLabel: string;
  withoutPlanLabel: string;
  withPlanValue: number;
  withoutPlanValue: number;
};

export function ForecastToggle(props: ForecastToggleProps) {
  const {
    title,
    withPlanLabel,
    withoutPlanLabel,
    withPlanValue,
    withoutPlanValue,
  } = props;
  const [mode, setMode] = useState<'withPlan' | 'withoutPlan'>('withPlan');

  const activeValue = useMemo(
    () => (mode === 'withPlan' ? withPlanValue : withoutPlanValue),
    [mode, withPlanValue, withoutPlanValue],
  );

  const delta = Math.round(withPlanValue - withoutPlanValue);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.toggleRow}>
        <Pressable
          style={[
            styles.toggleItem,
            mode === 'withPlan' && styles.toggleItemActive,
          ]}
          onPress={() => setMode('withPlan')}
        >
          <Text
            style={[
              styles.toggleText,
              mode === 'withPlan' && styles.toggleTextActive,
            ]}
          >
            {withPlanLabel}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.toggleItem,
            mode === 'withoutPlan' && styles.toggleItemActive,
          ]}
          onPress={() => setMode('withoutPlan')}
        >
          <Text
            style={[
              styles.toggleText,
              mode === 'withoutPlan' && styles.toggleTextActive,
            ]}
          >
            {withoutPlanLabel}
          </Text>
        </Pressable>
      </View>
      <View style={styles.valueWrap}>
        <Text style={styles.value}>{activeValue}</Text>
        <Text style={styles.delta}>{delta >= 0 ? `+${delta}` : delta}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
  },
  toggleItem: {
    flex: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  toggleItemActive: {
    backgroundColor: colors.surface,
  },
  toggleText: {
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.muted,
  },
  toggleTextActive: {
    color: colors.text,
    fontFamily: fonts.heading,
  },
  valueWrap: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  value: {
    fontFamily: fonts.heading,
    fontSize: 42,
    color: colors.primaryDeep,
  },
  delta: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    color: colors.text,
  },
});
