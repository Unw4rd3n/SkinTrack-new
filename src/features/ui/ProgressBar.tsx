import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radii } from '../../app/theme';

type ProgressBarProps = {
  value: number;
};

export function ProgressBar({ value }: ProgressBarProps) {
  const width = Math.max(0, Math.min(100, value * 100));

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${width}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 10,
    borderRadius: radii.lg,
    backgroundColor: colors.secondary,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.lg,
    backgroundColor: colors.accent,
  },
});
