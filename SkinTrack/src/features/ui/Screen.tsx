import React from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, spacing } from '../../app/theme';

type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
};

export function Screen({ children, scroll }: ScreenProps) {
  const { width } = useWindowDimensions();
  const horizontalPadding =
    width < 360 ? spacing.md : width < 420 ? spacing.lg : spacing.xl;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.blobTop} pointerEvents="none" />
      <View style={styles.blobBottom} pointerEvents="none" />
      {scroll ? (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: horizontalPadding },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.container}>{children}</View>
        </ScrollView>
      ) : (
        <View
          style={[styles.content, { paddingHorizontal: horizontalPadding }]}
        >
          <View style={styles.container}>{children}</View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingVertical: spacing.lg,
  },
  scrollContent: {
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxxl + 72,
  },
  container: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  blobTop: {
    position: 'absolute',
    top: -180,
    right: -120,
    width: 320,
    height: 320,
    borderRadius: radii.xxl,
    backgroundColor: colors.accentSoft,
    opacity: 0.5,
  },
  blobBottom: {
    position: 'absolute',
    bottom: -190,
    left: -140,
    width: 340,
    height: 340,
    borderRadius: radii.xxl,
    backgroundColor: colors.secondary,
    opacity: 0.5,
  },
});
