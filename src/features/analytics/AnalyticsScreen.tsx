import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useI18n } from '../../app/localization';
import { colors, fontSizes, fonts, radii, spacing } from '../../app/theme';
import { getRecentEntries } from '../../data/repos/dailyEntriesRepo';
import { getDiagnostics } from '../../data/repos/diagnosticsRepo';
import { getLabResults } from '../../data/repos/labsRepo';
import { getRoutineProfile } from '../../data/repos/routineRepo';
import { getLatestWellness } from '../../data/repos/wellnessRepo';
import { mockMonthlySummary, mockWeeklyTrend } from '../shared/mockData';
import { ForecastToggle } from '../ui/ForecastToggle';
import { MonthlySummary } from '../ui/MonthlySummary';
import { Screen } from '../ui/Screen';
import { WeeklyTrend } from '../ui/WeeklyTrend';
import { build30DayProgress } from '../../services/insights';
import { buildSkinSummary, SkinSummary } from '../../services/skinEngine';

type AnalyticsState = {
  weekly: number[];
  monthly: {
    title: string;
    text: string;
    direction: 'up' | 'down' | 'flat';
  }[];
  summary: SkinSummary;
  hasData: boolean;
};

const INITIAL_SUMMARY: SkinSummary = {
  index: 50,
  trend30: 0,
  risk: 'medium',
  factors: [],
  plan7: [],
  plan30: [],
  forecast: {
    withPlan: 60,
    withoutPlan: 48,
  },
};

const INITIAL_STATE: AnalyticsState = {
  weekly: mockWeeklyTrend,
  monthly: mockMonthlySummary,
  summary: INITIAL_SUMMARY,
  hasData: false,
};

function normalizeWeekly(
  entries: Awaited<ReturnType<typeof getRecentEntries>>,
) {
  const byDay = new Map(entries.map(entry => [entry.entryDate, entry]));
  const result: number[] = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const item = byDay.get(date.getTime());

    if (!item) {
      result.push(0);
      continue;
    }

    const filled = [
      item.dryness,
      item.oiliness,
      item.acneLevel,
      item.sleepHours,
      item.stress,
      item.waterIntake,
    ].filter(value => value !== undefined && value !== null).length;

    result.push(Math.round((filled / 6) * 100));
  }

  return result;
}

export function AnalyticsScreen() {
  const { t } = useI18n();
  const [state, setState] = useState<AnalyticsState>(INITIAL_STATE);

  const dayLabels = useMemo(
    () => [
      t('week.mon'),
      t('week.tue'),
      t('week.wed'),
      t('week.thu'),
      t('week.fri'),
      t('week.sat'),
      t('week.sun'),
    ],
    [t],
  );

  const load = useCallback(async () => {
    const [entries45, entries7, diagnostics, labs, wellness, routine] =
      await Promise.all([
        getRecentEntries(45),
        getRecentEntries(7),
        getDiagnostics(),
        getLabResults(),
        getLatestWellness(),
        getRoutineProfile(),
      ]);

    const summary = buildSkinSummary({
      entries: entries45,
      diagnostics,
      labs,
      latestWellness: wellness,
      routine,
    });
    const monthly = build30DayProgress({
      entries: entries45,
      diagnostics,
    });

    setState({
      weekly: entries7.length > 0 ? normalizeWeekly(entries7) : mockWeeklyTrend,
      monthly: monthly.length > 0 ? monthly : mockMonthlySummary,
      summary,
      hasData: entries45.length > 0,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const fallbackPlan7 = [
    t('analytics.plan7.fallback1'),
    t('analytics.plan7.fallback2'),
    t('analytics.plan7.fallback3'),
  ];
  const fallbackPlan30 = [
    t('analytics.plan30.fallback1'),
    t('analytics.plan30.fallback2'),
    t('analytics.plan30.fallback3'),
  ];
  const plan7 =
    state.summary.plan7.length > 0 ? state.summary.plan7 : fallbackPlan7;
  const plan30 =
    state.summary.plan30.length > 0 ? state.summary.plan30 : fallbackPlan30;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>{t('analytics.title')}</Text>
        <Text style={styles.subtitle}>{t('analytics.subtitle')}</Text>
      </View>

      <WeeklyTrend
        title={t('analytics.weekly')}
        dayLabels={dayLabels}
        values={state.weekly}
        valueLabel={value => t('analytics.week.dayFilled', { value })}
      />

      <MonthlySummary
        title={t('analytics.monthly')}
        items={state.monthly}
        emptyLabel={t('analytics.empty')}
        directionLabels={{
          up: t('analytics.month.up'),
          down: t('analytics.month.down'),
          flat: t('analytics.month.flat'),
        }}
      />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('analytics.plan7')}</Text>
        {plan7.map((item, index) => (
          <Text key={`${item}-${index}`} style={styles.rowText}>
            {index + 1}. {item}
          </Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('analytics.plan30')}</Text>
        {plan30.map((item, index) => (
          <Text key={`${item}-${index}`} style={styles.rowText}>
            {index + 1}. {item}
          </Text>
        ))}
      </View>

      <ForecastToggle
        title={t('analytics.forecast')}
        withPlanLabel={t('analytics.forecast.withPlan')}
        withoutPlanLabel={t('analytics.forecast.withoutPlan')}
        withPlanValue={Math.round(state.summary.forecast.withPlan)}
        withoutPlanValue={Math.round(state.summary.forecast.withoutPlan)}
      />

      {!state.hasData ? (
        <Text style={styles.hint}>{t('analytics.empty')}</Text>
      ) : null}
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
    marginBottom: spacing.xs,
  },
  rowText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
    lineHeight: 21,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
    marginBottom: spacing.lg,
  },
});
