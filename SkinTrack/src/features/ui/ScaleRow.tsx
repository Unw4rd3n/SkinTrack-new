import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, fonts, spacing } from '../../app/theme';

type ScaleRowProps = {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
};

export function ScaleRow({ label, value, onChange, min = 0, max = 5 }: ScaleRowProps) {
  const items = Array.from({ length: max - min + 1 }, (_, i) => i + min);

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.scale}>
        {items.map(item => {
          const isActive = value === item;
          return (
            <Pressable
              key={item}
              onPress={() => onChange(item)}
              style={[styles.dot, isActive && styles.dotActive]}
            >
              <Text style={[styles.dotText, isActive && styles.dotTextActive]}>
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: spacing.sm,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  scale: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  dotActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  dotText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  dotTextActive: {
    color: colors.text,
  },
});
