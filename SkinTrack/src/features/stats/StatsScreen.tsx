import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fontSizes, fonts, radii, spacing } from '../../app/theme';
import { Screen } from '../ui/Screen';
import { Card } from '../ui/Card';
import { Reveal } from '../ui/Reveal';
import { getRecentEntries } from '../../data/repos/dailyEntriesRepo';

type StatSnapshot = {
  bars: number[];
  avgSleep: number | null;
  avgDryness: number | null;
  avgWater: number | null;
};

export function StatsScreen() {
  const [snapshot, setSnapshot] = useState<StatSnapshot>({
    bars: [0.3, 0.45, 0.4, 0.5, 0.35, 0.55, 0.45],
    avgSleep: null,
    avgDryness: null,
    avgWater: null,
  });
  const [hasData, setHasData] = useState(false);

  const load = useCallback(async () => {
    const data = await getRecentEntries(7);
    if (data.length === 0) {
      setHasData(false);
      return;
    }
    setHasData(true);

    const drynessValues = data
      .map(entry => entry.dryness)
      .filter((value): value is number => value !== undefined);
    const max = Math.max(1, ...drynessValues, 1);
    const bars = data.map(entry => {
      const value = entry.dryness ?? 0;
      return value / max;
    });

    const sleepValues = data
      .map(entry => entry.sleepHours)
      .filter((value): value is number => value !== undefined);
    const avgSleep =
      sleepValues.length > 0
        ? sleepValues.reduce((sum, value) => sum + value, 0) /
          sleepValues.length
        : null;

    const avgDryness =
      drynessValues.length > 0
        ? drynessValues.reduce((sum, value) => sum + value, 0) /
          drynessValues.length
        : null;

    const waterValues = data
      .map(entry => entry.waterIntake)
      .filter((value): value is number => value !== undefined);
    const avgWater =
      waterValues.length > 0
        ? waterValues.reduce((sum, value) => sum + value, 0) /
          waterValues.length
        : null;

    setSnapshot({ bars, avgSleep, avgDryness, avgWater });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <Screen scroll>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.kicker}>Статистика</Text>
          <Text style={styles.title}>Неделя в динамике</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>Смотри на тенденции, а не на один день.</Text>

      <Reveal>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Сводка недели</Text>
          <Text style={styles.heroText}>
            Здесь ты видишь общую картину: как сон, кожа и гидратация меняются вместе.
          </Text>
        </View>
      </Reveal>

      {!hasData ? (
        <Reveal delay={120}>
          <Card>
            <Text style={styles.cardTitle}>Пока нет данных</Text>
            <Text style={styles.cardText}>
              Добавь хотя бы пару записей, чтобы увидеть графики.
            </Text>
          </Card>
        </Reveal>
      ) : (
        <>
          <Reveal delay={120}>
            <Card style={styles.kpiCard} tone="soft">
              <Text style={styles.cardTitle}>Средние значения</Text>
              <View style={styles.kpiRow}>
                <View style={styles.kpi}>
                  <Text style={styles.kpiValue}>
                    {snapshot.avgDryness ? snapshot.avgDryness.toFixed(1) : '—'}
                  </Text>
                  <Text style={styles.kpiLabel}>Сухость</Text>
                </View>
                <View style={styles.kpi}>
                  <Text style={styles.kpiValue}>
                    {snapshot.avgSleep ? snapshot.avgSleep.toFixed(1) : '—'}
                  </Text>
                  <Text style={styles.kpiLabel}>Сон</Text>
                </View>
                <View style={styles.kpi}>
                  <Text style={styles.kpiValue}>
                    {snapshot.avgWater ? snapshot.avgWater.toFixed(1) : '—'}
                  </Text>
                  <Text style={styles.kpiLabel}>Гидратация</Text>
                </View>
              </View>
            </Card>
          </Reveal>

          <Reveal delay={200}>
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Сухость · 7 дней</Text>
              <View style={styles.chart}>
                {snapshot.bars.map((value, index) => (
                  <View
                    key={`${value}-${index}`}
                    style={[styles.bar, { height: 72 * value + 12 }]}
                  />
                ))}
              </View>
            </Card>
          </Reveal>
        </>
      )}
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
  kpiCard: {
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  cardText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.muted,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  kpi: {
    alignItems: 'center',
    flex: 1,
  },
  kpiValue: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xl,
    color: colors.accent,
  },
  kpiLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: spacing.sm,
  },
  bar: {
    width: 20,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
    marginRight: spacing.xs,
  },
});
