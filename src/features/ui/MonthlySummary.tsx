import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, fonts, radii, spacing } from '../../app/theme';

type MonthlySummaryItem = {
  title: string;
  text: string;
  direction: 'up' | 'down' | 'flat';
};

type MonthlySummaryProps = {
  title: string;
  items: MonthlySummaryItem[];
  emptyLabel: string;
  directionLabels: {
    up: string;
    down: string;
    flat: string;
  };
};

export function MonthlySummary(props: MonthlySummaryProps) {
  const { title, items, emptyLabel, directionLabels } = props;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {items.length === 0 ? (
        <Text style={styles.empty}>{emptyLabel}</Text>
      ) : (
        items.map((item, index) => (
          <View key={`${item.title}-${index}`} style={styles.item}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text
                style={[
                  styles.pill,
                  item.direction === 'up'
                    ? styles.pillUp
                    : item.direction === 'down'
                    ? styles.pillDown
                    : styles.pillFlat,
                ]}
              >
                {directionLabels[item.direction]}
              </Text>
            </View>
            <Text style={styles.itemText}>{item.text}</Text>
          </View>
        ))
      )}
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
  empty: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
  },
  item: {
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  itemTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  itemText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
    lineHeight: 20,
  },
  pill: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
  },
  pillUp: {
    backgroundColor: '#E4F6ED',
    color: '#3D8A67',
  },
  pillDown: {
    backgroundColor: '#FCE5ED',
    color: colors.danger,
  },
  pillFlat: {
    backgroundColor: colors.secondary,
    color: colors.muted,
  },
});
