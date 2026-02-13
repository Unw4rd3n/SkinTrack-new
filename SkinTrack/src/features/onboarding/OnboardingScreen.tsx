import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, fonts, radii, spacing } from '../../app/theme';
import { useAppDispatch } from '../../app/store/hooks';
import { setOnboardingComplete } from '../../app/store/appSlice';
import { upsertProfile } from '../../data/repos/profileRepo';
import {
  ensureDefaultReminderPreferences,
  ensureDefaultReminders,
  getReminderPreferences,
  getReminders,
} from '../../data/repos/remindersRepo';
import { requestNotificationPermissions, rescheduleDailyReminders } from '../../services/notifications';
import { Screen } from '../ui/Screen';
import { Card } from '../ui/Card';
import { PrimaryButton } from '../ui/PrimaryButton';

const skinTypes = ['Нормальная', 'Сухая', 'Комбинированная', 'Жирная'];
const goals = ['Увлажнение', 'Ровный тон', 'Снижение высыпаний'];

export function OnboardingScreen() {
  const dispatch = useAppDispatch();
  const [skinType, setSkinType] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async () => {
    try {
      setError(null);
      await upsertProfile({ skinType, goals: goal });
      await ensureDefaultReminders();
      await ensureDefaultReminderPreferences();
      const reminders = await getReminders();
      const enabledReminders = reminders
        .filter(reminder => reminder.enabled)
        .map(reminder => ({
          time: reminder.time,
          messageType: (reminder.messageType as 'compliment' | 'care' | 'mixed') ?? 'mixed',
        }));
      const preferences = await getReminderPreferences();
      await requestNotificationPermissions();
      if (enabledReminders.length > 0) {
        await rescheduleDailyReminders(enabledReminders, {
          quietStart: preferences?.quietStart ?? undefined,
          quietEnd: preferences?.quietEnd ?? undefined,
        });
      }
      dispatch(setOnboardingComplete(true));
    } catch (err) {
      console.warn('Onboarding error', err);
      setError('Не удалось завершить онбординг. Попробуй еще раз.');
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.kicker}>SkinTrack</Text>
      <Text style={styles.title}>Персональный уход</Text>
      <Text style={styles.subtitle}>
        В спокойном ритме фиксируй состояние кожи, чтобы видеть динамику и делать уход более точным.
      </Text>

      <Card style={styles.heroCard} tone="soft">
        <Text style={styles.heroTitle}>Что ты получишь</Text>
        <View style={styles.heroList}>
          <Text style={styles.heroItem}>• Умный фокус дня с мягкими подсказками</Text>
          <Text style={styles.heroItem}>• Красивый дневник и серия дней</Text>
          <Text style={styles.heroItem}>• Напоминания, которые поддерживают</Text>
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Твой профиль</Text>
        <Text style={styles.sectionHint}>Выбери тип кожи, чтобы подсказки были точнее.</Text>
        <View style={styles.chips}>
          {skinTypes.map(item => (
            <Pressable
              key={item}
              onPress={() => setSkinType(item)}
              style={[
                styles.chip,
                skinType === item && styles.chipActive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  skinType === item && styles.chipTextActive,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card style={styles.section} tone="soft">
        <Text style={styles.sectionTitle}>Главная цель</Text>
        <Text style={styles.sectionHint}>Мы будем подбирать ритуал под неё.</Text>
        <View style={styles.chips}>
          {goals.map(item => (
            <Pressable
              key={item}
              onPress={() => setGoal(item)}
              style={[styles.chip, goal === item && styles.chipActive]}
            >
              <Text
                style={[
                  styles.chipText,
                  goal === item && styles.chipTextActive,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <PrimaryButton label="Начать" onPress={onFinish} style={styles.primaryButton} icon="→" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xxl,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.muted,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  heroCard: {
    marginBottom: spacing.lg,
  },
  heroTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  heroList: {
    marginLeft: spacing.xs,
  },
  heroItem: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionHint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceAlt,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  chipTextActive: {
    color: colors.surface,
  },
  primaryButton: {
    marginTop: spacing.lg,
  },
  error: {
    marginTop: spacing.sm,
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.danger,
  },
});
