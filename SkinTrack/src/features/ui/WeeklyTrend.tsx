import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, fonts, radii, spacing } from '../../app/theme';

type WeeklyTrendProps = {
  title: string;
  dayLabels: string[];
  values: number[];
  valueLabel: (value: number) => string;
};

export function WeeklyTrend(props: WeeklyTrendProps) {
  const { title, dayLabels, values, valueLabel } = props;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.row}>
        {values.map((value, index) => (
          <View key={`${dayLabels[index]}-${index}`} style={styles.item}>
            <View style={styles.barTrack}>
              <View
                style={[styles.barFill, { height: `${Math.max(6, value)}%` }]}
              />
            </View>
            <Text style={styles.dayLabel}>{dayLabels[index]}</Text>
            <Text style={styles.valueLabel}>{valueLabel(value)}</Text>
          </View>
        ))}
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
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  item: {
    alignItems: 'center',
    width: 38,
  },
  barTrack: {
    width: 16,
    height: 76,
    borderRadius: radii.sm,
    backgroundColor: colors.secondary,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: colors.primaryDeep,
    borderRadius: radii.sm,
  },
  dayLabel: {
    marginTop: spacing.xs,
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.muted,
  },
  valueLabel: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.text,
  },
});
