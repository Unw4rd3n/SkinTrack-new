import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../../app/localization';
import { setLocale, setOnboardingComplete } from '../../app/store/appSlice';
import { useAppDispatch } from '../../app/store/hooks';
import { colors, fontSizes, fonts, radii, spacing } from '../../app/theme';
import { resetAllData } from '../../data/repos/appRepo';
import { Screen } from '../ui/Screen';

export function ProfileScreen() {
  const { t, locale } = useI18n();
  const dispatch = useAppDispatch();
  const [resetting, setResetting] = useState(false);

  const resetData = () => {
    Alert.alert(t('profile.resetConfirmTitle'), t('profile.resetConfirmBody'), [
      {
        text: t('profile.resetCancel'),
        style: 'cancel',
      },
      {
        text: t('profile.resetAccept'),
        style: 'destructive',
        onPress: async () => {
          setResetting(true);
          await resetAllData();
          dispatch(setOnboardingComplete(false));
          setResetting(false);
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>{t('profile.title')}</Text>
        <Text style={styles.subtitle}>{t('profile.subtitle')}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('profile.language')}</Text>
        <View style={styles.languageRow}>
          <Pressable
            style={[
              styles.languageButton,
              locale === 'ru' && styles.languageButtonActive,
            ]}
            onPress={() => dispatch(setLocale('ru'))}
          >
            <Text
              style={[
                styles.languageText,
                locale === 'ru' && styles.languageTextActive,
              ]}
            >
              {t('profile.language.ru')}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.languageButton,
              locale === 'en' && styles.languageButtonActive,
            ]}
            onPress={() => dispatch(setLocale('en'))}
          >
            <Text
              style={[
                styles.languageText,
                locale === 'en' && styles.languageTextActive,
              ]}
            >
              {t('profile.language.en')}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('profile.reset')}</Text>
        <Text style={styles.cardBody}>{t('profile.resetBody')}</Text>
        <Pressable style={styles.resetButton} onPress={resetData}>
          <Text style={styles.resetButtonText}>
            {resetting ? t('profile.resetInProgress') : t('profile.reset')}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
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
  card: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardBody: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  languageRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  languageButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  languageText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  languageTextActive: {
    fontFamily: fonts.heading,
    color: colors.primaryDeep,
  },
  resetButton: {
    minHeight: 44,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    color: colors.danger,
  },
});
