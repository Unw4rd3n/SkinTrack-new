import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, fonts, radii, spacing } from '../../app/theme';

export type QuickActionItem = {
  key: string;
  label: string;
  icon: string;
  onPress: () => void;
};

type QuickActionButtonsProps = {
  title: string;
  actions: QuickActionItem[];
};

export function QuickActionButtons({
  title,
  actions,
}: QuickActionButtonsProps) {
  return (
    <View>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.grid}>
        {actions.map(action => (
          <Pressable
            key={action.key}
            onPress={action.onPress}
            style={styles.button}
          >
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>{action.icon}</Text>
            </View>
            <Text style={styles.label}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  button: {
    width: '48%',
    minHeight: 74,
    borderRadius: radii.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  icon: {
    fontSize: 14,
  },
  label: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
});
