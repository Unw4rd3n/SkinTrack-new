import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, fonts, radii, spacing } from '../../app/theme';
import { Screen } from '../ui/Screen';
import { Card } from '../ui/Card';
import { resetAllData } from '../../data/repos/appRepo';
import { useAppDispatch } from '../../app/store/hooks';
import { setOnboardingComplete } from '../../app/store/appSlice';

export function SettingsScreen() {
  const [resetting, setResetting] = useState(false);
  const dispatch = useAppDispatch();

  const confirmDelete = () => {
    Alert.alert(
      'Удалить все данные?',
      'Это действие нельзя отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            setResetting(true);
            await resetAllData();
            dispatch(setOnboardingComplete(false));
            setResetting(false);
          },
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <Screen scroll>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.kicker}>Настройки</Text>
          <Text style={styles.title}>Профиль и данные</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>Управление данными и личными настройками.</Text>

      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Твоя приватность</Text>
        <Text style={styles.heroText}>
          Все данные хранятся локально, ты полностью контролируешь доступ к приложению.
        </Text>
      </View>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Удалить все данные</Text>
        <Text style={styles.cardText}>
          Полная очистка дневника и настроек без возможности восстановления.
        </Text>
        <Pressable style={styles.dangerButton} onPress={confirmDelete}>
          <Text style={styles.dangerButtonText}>
            {resetting ? 'Удаляем...' : 'Удалить данные'}
          </Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
  },
  kicker: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xxl,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.muted,
    marginBottom: spacing.lg,
  },
  heroCard: {
    backgroundColor: colors.cardBlueDeep,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.primaryDeep,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },
  heroTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  heroText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.muted,
    marginBottom: spacing.md,
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    color: colors.danger,
  },
});
