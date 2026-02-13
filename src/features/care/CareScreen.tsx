import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useI18n } from '../../app/localization';
import { colors, fontSizes, fonts, radii, spacing } from '../../app/theme';
import {
  getRoutineProfile,
  upsertRoutineProfile,
} from '../../data/repos/routineRepo';
import { trackEvent } from '../../services/analytics';
import { Screen } from '../ui/Screen';
import { useCarePlan } from './useCarePlan';

const dayLabels = [
  'week.mon',
  'week.tue',
  'week.wed',
  'week.thu',
  'week.fri',
  'week.sat',
  'week.sun',
] as const;

export function CareScreen() {
  const { t } = useI18n();
  const [saved, setSaved] = useState(false);
  const {
    resolved,
    setRetinolStrength,
    setRetinolFrequency,
    setAcidFrequency,
    setSensitivity,
    hydrate,
  } = useCarePlan();

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const profile = await getRoutineProfile();
        if (!profile) {
          return;
        }

        hydrate({
          retinolStrength: Math.max(
            1,
            Math.min(3, profile.retinolStrength ?? 1),
          ),
          retinolFrequency: Math.max(
            1,
            Math.min(3, profile.retinolFrequency ?? 1),
          ),
          acidFrequency: Math.max(0, Math.min(2, profile.acidFrequency ?? 0)),
          sensitivity: Math.max(1, Math.min(3, profile.sensitivity ?? 2)) as
            | 1
            | 2
            | 3,
        });
      };

      load();
    }, [hydrate]),
  );

  const retinolHint = useMemo(() => {
    if (resolved.values.retinolStrength === 1) {
      return t('care.retinol.lowHint');
    }
    if (resolved.values.retinolStrength === 2) {
      return t('care.retinol.mediumHint');
    }
    return t('care.retinol.highHint');
  }, [resolved.values.retinolStrength, t]);

  const sensitivityHint = useMemo(() => {
    if (resolved.values.sensitivity === 1) {
      return t('care.sensitivity.lowHint');
    }
    if (resolved.values.sensitivity === 2) {
      return t('care.sensitivity.mediumHint');
    }
    return t('care.sensitivity.highHint');
  }, [resolved.values.sensitivity, t]);

  const save = async () => {
    await upsertRoutineProfile({
      retinolStrength: resolved.values.retinolStrength,
      retinolFrequency: resolved.values.retinolFrequency,
      acidFrequency: resolved.values.acidFrequency,
      sensitivity: resolved.values.sensitivity,
    });

    trackEvent('care_profile_saved', {
      ...resolved.values,
      warnings: resolved.warnings.length,
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>{t('care.title')}</Text>
        <Text style={styles.subtitle}>{t('care.subtitle')}</Text>
      </View>

      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>{t('care.rule.title')}</Text>
        <Text style={styles.bannerText}>{t('care.rule.body')}</Text>
      </View>

      {resolved.warnings.map(item => (
        <View key={item} style={styles.warningBanner}>
          <Text style={styles.warningText}>{t(item)}</Text>
        </View>
      ))}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('care.retinol')}</Text>
        <Text style={styles.label}>{t('care.retinol.strength')}</Text>
        <View style={styles.pillRow}>
          {[1, 2, 3].map(value => {
            const selected = resolved.values.retinolStrength === value;
            const text =
              value === 1
                ? t('care.retinol.low')
                : value === 2
                ? t('care.retinol.medium')
                : t('care.retinol.high');
            return (
              <Pressable
                key={value}
                style={[styles.pill, selected && styles.pillActive]}
                onPress={() => setRetinolStrength(value)}
              >
                <Text
                  style={[styles.pillText, selected && styles.pillTextActive]}
                >
                  {text}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.helper}>{retinolHint}</Text>

        <Text style={styles.label}>{t('care.retinol.frequency')}</Text>
        <View style={styles.pillRow}>
          {[1, 2, 3].map(value => {
            const selected = resolved.values.retinolFrequency === value;
            return (
              <Pressable
                key={`retinol-${value}`}
                style={[styles.pill, selected && styles.pillActive]}
                onPress={() => setRetinolFrequency(value)}
              >
                <Text
                  style={[styles.pillText, selected && styles.pillTextActive]}
                >
                  {t('care.frequency.perWeek', { value })}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('care.acids')}</Text>
        <Text style={styles.label}>{t('care.acids.frequency')}</Text>
        <View style={styles.pillRow}>
          {[0, 1, 2].map(value => {
            const selected = resolved.values.acidFrequency === value;
            return (
              <Pressable
                key={`acid-${value}`}
                style={[styles.pill, selected && styles.pillActive]}
                onPress={() => setAcidFrequency(value)}
              >
                <Text
                  style={[styles.pillText, selected && styles.pillTextActive]}
                >
                  {t('care.frequency.perWeek', { value })}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('care.sensitivity')}</Text>
        <View style={styles.pillRow}>
          {(
            [
              { value: 1, label: t('care.sensitivity.low'), emoji: '🙂' },
              { value: 2, label: t('care.sensitivity.medium'), emoji: '😐' },
              { value: 3, label: t('care.sensitivity.high'), emoji: '😣' },
            ] as const
          ).map(item => {
            const selected = resolved.values.sensitivity === item.value;
            return (
              <Pressable
                key={`sens-${item.value}`}
                style={[styles.pill, selected && styles.pillActive]}
                onPress={() => setSensitivity(item.value)}
              >
                <Text style={styles.emoji}>{item.emoji}</Text>
                <Text
                  style={[styles.pillText, selected && styles.pillTextActive]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.helper}>{sensitivityHint}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('care.weekPlan')}</Text>
        {resolved.weekPlan.map(item => {
          const label =
            item.type === 'retinol'
              ? t('care.day.retinol')
              : item.type === 'acid'
              ? t('care.day.acid')
              : t('care.day.recovery');
          return (
            <View key={item.dayIndex} style={styles.weekRow}>
              <Text style={styles.weekDay}>{t(dayLabels[item.dayIndex])}</Text>
              <Text style={styles.weekType}>{label}</Text>
            </View>
          );
        })}
      </View>

      <Pressable style={styles.saveButton} onPress={save}>
        <Text style={styles.saveButtonText}>
          {saved ? t('care.saved') : t('common.save')}
        </Text>
      </Pressable>
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
  banner: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  bannerTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    color: colors.text,
    marginBottom: 4,
  },
  bannerText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
  },
  warningBanner: {
    borderRadius: radii.lg,
    backgroundColor: '#FFF1F5',
    borderWidth: 1,
    borderColor: '#F1B8CC',
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  warningText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.danger,
  },
  card: {
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  pill: {
    minHeight: 38,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    flexDirection: 'row',
    gap: 4,
  },
  pillActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  pillText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  pillTextActive: {
    fontFamily: fonts.heading,
    color: colors.primaryDeep,
  },
  emoji: {
    fontSize: 14,
  },
  helper: {
    marginTop: spacing.xs,
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.muted,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
  },
  weekDay: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  weekType: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
  },
  saveButton: {
    minHeight: 48,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDeep,
    marginBottom: spacing.xl,
  },
  saveButtonText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    color: colors.surface,
  },
});
