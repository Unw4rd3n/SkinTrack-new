import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, fonts, radii, spacing } from '../../app/theme';

type StickyHeaderProps = {
  title: string;
  subtitle: string;
  dateLabel: string;
  indexLabel: string;
  indexValue: number;
};

export function StickyHeader(props: StickyHeaderProps) {
  const { title, subtitle, dateLabel, indexLabel, indexValue } = props;

  return (
    <View style={styles.wrap}>
      <View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={styles.rightCol}>
        <View style={styles.datePill}>
          <Text style={styles.dateText}>{dateLabel}</Text>
        </View>
        <View style={styles.indexPill}>
          <Text style={styles.indexLabel}>{indexLabel}</Text>
          <Text style={styles.indexValue}>{indexValue}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    zIndex: 5,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xl,
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  datePill: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  dateText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  indexPill: {
    borderRadius: radii.lg,
    backgroundColor: colors.secondary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignItems: 'flex-end',
  },
  indexLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.muted,
  },
  indexValue: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    color: colors.primaryDeep,
    marginTop: 2,
  },
});
