import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { TranslationKey, useI18n } from '../../app/localization';
import { colors, fontSizes, fonts, radii, spacing } from '../../app/theme';
import {
  getEntryByDate,
  getRecentEntries,
  incrementWaterForDate,
} from '../../data/repos/dailyEntriesRepo';
import { getDiagnostics } from '../../data/repos/diagnosticsRepo';
import { getLabResults } from '../../data/repos/labsRepo';
import { getRoutineProfile } from '../../data/repos/routineRepo';
import { getLatestWellness } from '../../data/repos/wellnessRepo';
import { formatShortDate, toDayKey } from '../../services/date';
import { buildSkinSummary } from '../../services/skinEngine';
import { buildTodaySnapshot, TodaySnapshot } from '../../services/todayEngine';
import { DailyPriorityCard } from '../ui/DailyPriorityCard';
import { QuickActionButtons } from '../ui/QuickActionButtons';
import { Screen } from '../ui/Screen';
import { StickyHeader } from '../ui/StickyHeader';

const INITIAL_SNAPSHOT: TodaySnapshot = {
  filledCount: 0,
  totalCount: 6,
  skinIndex: 50,
  priority: 'balance',
};

const PRIORITY_KEYS: Record<
  TodaySnapshot['priority'],
  {
    title: TranslationKey;
    summary: TranslationKey;
    steps: [TranslationKey, TranslationKey, TranslationKey];
  }
> = {
  balance: {
    title: 'today.priority.balance.title',
    summary: 'today.priority.balance.summary',
    steps: [
      'today.priority.balance.step1',
      'today.priority.balance.step2',
      'today.priority.balance.step3',
    ],
  },
  hydration: {
    title: 'today.priority.hydration.title',
    summary: 'today.priority.hydration.summary',
    steps: [
      'today.priority.hydration.step1',
      'today.priority.hydration.step2',
      'today.priority.hydration.step3',
    ],
  },
  calm: {
    title: 'today.priority.calm.title',
    summary: 'today.priority.calm.summary',
    steps: [
      'today.priority.calm.step1',
      'today.priority.calm.step2',
      'today.priority.calm.step3',
    ],
  },
  sleep: {
    title: 'today.priority.sleep.title',
    summary: 'today.priority.sleep.summary',
    steps: [
      'today.priority.sleep.step1',
      'today.priority.sleep.step2',
      'today.priority.sleep.step3',
    ],
  },
};

export function TodayScreen() {
  const { t } = useI18n();
  const navigation = useNavigation<any>();
  const [snapshot, setSnapshot] = useState<TodaySnapshot>(INITIAL_SNAPSHOT);
  const [waterCount, setWaterCount] = useState(0);

  const todayKey = useMemo(() => toDayKey(new Date()), []);

  const load = useCallback(async () => {
    const [entry, entries, diagnostics, labs, wellness, routine] =
      await Promise.all([
        getEntryByDate(todayKey),
        getRecentEntries(45),
        getDiagnostics(),
        getLabResults(),
        getLatestWellness(),
        getRoutineProfile(),
      ]);

    const summary = buildSkinSummary({
      entries,
      diagnostics,
      labs,
      latestWellness: wellness,
      routine,
    });

    setSnapshot(buildTodaySnapshot(entry, summary));
    setWaterCount(entry?.waterIntake ?? 0);
  }, [todayKey]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const priority = PRIORITY_KEYS[snapshot.priority];
  const completion = Math.round(
    (snapshot.filledCount / snapshot.totalCount) * 100,
  );

  const onAddWater = async () => {
    const next = await incrementWaterForDate(todayKey, 1, 12);
    setWaterCount(next);
    await load();
  };

  const onRemoveWater = async () => {
    const next = await incrementWaterForDate(todayKey, -1, 12);
    setWaterCount(next);
    await load();
  };

  return (
    <Screen scroll>
      <StickyHeader
        title={t('today.title')}
        subtitle={t('today.subtitle')}
        dateLabel={formatShortDate(todayKey)}
        indexLabel={t('today.skinIndex')}
        indexValue={snapshot.skinIndex}
      />

      <View style={styles.progressCard}>
        <Text style={styles.progressTitle}>{t('today.checkinProgress')}</Text>
        <Text style={styles.progressValue}>
          {snapshot.filledCount}/{snapshot.totalCount}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${completion}%` }]} />
        </View>
        {snapshot.filledCount === 0 ? (
          <Text style={styles.progressHint}>{t('today.noCheckin')}</Text>
        ) : null}
      </View>

      <View style={styles.waterCard}>
        <Pressable
          style={[
            styles.waterActionButton,
            waterCount <= 0 && styles.waterActionDisabled,
          ]}
          onPress={onRemoveWater}
          disabled={waterCount <= 0}
        >
          <Text style={styles.waterActionText}>{t('today.water.minus')}</Text>
        </Pressable>

        <View style={styles.waterCenter}>
          <Text style={styles.waterTitle}>{t('today.water.title')}</Text>
          <Text style={styles.waterValue}>
            {t('today.water.goal', { value: waterCount })}
          </Text>
        </View>

        <Pressable
          style={[
            styles.waterActionButton,
            waterCount >= 12 && styles.waterActionDisabled,
          ]}
          onPress={onAddWater}
          disabled={waterCount >= 12}
        >
          <Text style={styles.waterActionText}>{t('today.water.plus')}</Text>
        </Pressable>
      </View>

      <DailyPriorityCard
        title={t(priority.title)}
        summary={t(priority.summary)}
        steps={priority.steps.map(stepKey => t(stepKey))}
      />

      <QuickActionButtons
        title={t('today.quickActions')}
        actions={[
          {
            key: 'checkin',
            icon: '✓',
            label: t('today.cta.checkin'),
            onPress: () => navigation.navigate('CheckIn'),
          },
          {
            key: 'analytics',
            icon: '↗',
            label: t('today.cta.analytics'),
            onPress: () => navigation.navigate('Analytics'),
          },
          {
            key: 'care',
            icon: '✦',
            label: t('today.cta.care'),
            onPress: () => navigation.navigate('Care'),
          },
          {
            key: 'profile',
            icon: '⚙',
            label: t('today.cta.profile'),
            onPress: () => navigation.navigate('Profile'),
          },
          {
            key: 'diary',
            icon: '✎',
            label: t('today.cta.diary'),
            onPress: () => navigation.navigate('Diary'),
          },
          {
            key: 'calendar',
            icon: '◷',
            label: t('today.cta.calendar'),
            onPress: () => navigation.navigate('DiaryCalendar'),
          },
        ]}
      />

      <View style={styles.cycleCard}>
        <View style={styles.cycleCardTextWrap}>
          <Text style={styles.cycleCardTitle}>{t('today.cycle.title')}</Text>
          <Text style={styles.cycleCardSubtitle}>
            {t('today.cycle.subtitle')}
          </Text>
        </View>
        <Pressable
          style={styles.cycleButton}
          onPress={() => navigation.navigate('Wellness')}
        >
          <Text style={styles.cycleButtonText}>{t('today.cycle.open')}</Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.inlineCheckin}
        onPress={() => navigation.navigate('CheckIn')}
      >
        <Text style={styles.inlineCheckinText}>{t('today.cta.checkin')}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  progressTitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
  },
  progressValue: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xl,
    color: colors.text,
    marginTop: spacing.xs,
  },
  progressTrack: {
    marginTop: spacing.sm,
    height: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.secondary,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primaryDeep,
  },
  progressHint: {
    marginTop: spacing.sm,
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
  },
  waterCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  waterCenter: {
    flex: 1,
    alignItems: 'center',
  },
  waterTitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
  },
  waterValue: {
    marginTop: spacing.xs,
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    color: colors.text,
  },
  waterActionButton: {
    width: 58,
    height: 40,
    borderRadius: radii.lg,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterActionDisabled: {
    opacity: 0.4,
  },
  waterActionText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    color: colors.primaryDeep,
  },
  cycleCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  cycleCardTextWrap: {
    marginBottom: spacing.sm,
  },
  cycleCardTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  cycleCardSubtitle: {
    marginTop: spacing.xs,
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
  },
  cycleButton: {
    minHeight: 42,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleButtonText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    color: colors.primaryDeep,
  },
  inlineCheckin: {
    marginTop: spacing.sm,
    minHeight: 46,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDeep,
  },
  inlineCheckinText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    color: colors.surface,
  },
});
