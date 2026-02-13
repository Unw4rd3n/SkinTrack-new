import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, fonts, radii, spacing } from '../../app/theme';

type DailyPriorityCardProps = {
  title: string;
  summary: string;
  steps: string[];
};

export function DailyPriorityCard(props: DailyPriorityCardProps) {
  const { title, summary, steps } = props;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.summary}>{summary}</Text>
      <View style={styles.stepsWrap}>
        {steps.map((step, index) => (
          <View key={`${step}-${index}`} style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{index + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBlue,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    color: colors.text,
  },
  summary: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.muted,
    marginTop: spacing.xs,
    lineHeight: 22,
  },
  stepsWrap: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    marginRight: spacing.sm,
  },
  stepBadgeText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    color: colors.primaryDeep,
  },
  stepText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.text,
    flex: 1,
  },
});
