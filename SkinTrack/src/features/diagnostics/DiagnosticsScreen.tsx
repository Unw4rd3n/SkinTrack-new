import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fontSizes, fonts, radii, spacing } from '../../app/theme';
import { Screen } from '../ui/Screen';
import { Card } from '../ui/Card';
import { SelectRow } from '../ui/SelectRow';
import { PrimaryButton } from '../ui/PrimaryButton';
import { Reveal } from '../ui/Reveal';
import { formatShortDate, toDayKey } from '../../services/date';
import {
  getDiagnosticByDate,
  getDiagnostics,
  getLatestDiagnostic,
  getPreviousDiagnostic,
  upsertDiagnostic,
} from '../../data/repos/diagnosticsRepo';
import { trackEvent } from '../../services/analytics';

type MetricKey = 'density' | 'pigmentation' | 'vascular' | 'wrinkles' | 'photoaging';

const metrics: {
  key: MetricKey;
  label: string;
  better: 'higher' | 'lower';
}[] = [
  { key: 'density', label: 'Плотность кожи', better: 'higher' },
  { key: 'pigmentation', label: 'Пигментация', better: 'lower' },
  { key: 'vascular', label: 'Сосудистая сетка', better: 'lower' },
  { key: 'wrinkles', label: 'Глубина морщин', better: 'lower' },
  { key: 'photoaging', label: 'Уровень фотостарения', better: 'lower' },
];

export function DiagnosticsScreen() {
  const todayKey = useMemo(() => toDayKey(new Date()), []);
  const [values, setValues] = useState<Record<MetricKey, number | null>>({
    density: null,
    pigmentation: null,
    vascular: null,
    wrinkles: null,
    photoaging: null,
  });
  const [saved, setSaved] = useState(false);
  const [currentDate, setCurrentDate] = useState(todayKey);
  const [comparison, setComparison] = useState<
    { label: string; text: string }[]
  >([]);
  const [forecast, setForecast] = useState<
    { label: string; text: string }[]
  >([]);

  const updateMetric = (key: MetricKey, value: number) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const buildComparison = useCallback(async () => {
    const current = await getLatestDiagnostic();
    if (!current) {
      setComparison([]);
      return;
    }
    const previous = await getPreviousDiagnostic(current.entryDate, 30);
    if (!previous) {
      setComparison([
        {
          label: 'Недостаточно данных',
          text: 'Добавь ещё одну диагностику через 30 дней, чтобы увидеть динамику.',
        },
      ]);
      return;
    }

    const rows = metrics.map(metric => {
      const currentValue = current[metric.key] ?? null;
      const previousValue = previous[metric.key] ?? null;
      if (currentValue === null || previousValue === null) {
        return {
          label: metric.label,
          text: 'Недостаточно данных для сравнения.',
        };
      }

      const delta = currentValue - previousValue;
      if (delta === 0) {
        return {
          label: metric.label,
          text: 'За 30 дней без изменений.',
        };
      }

      const base = previousValue === 0 ? 10 : previousValue;
      const percent = Math.abs((delta / base) * 100);
      const rounded = Math.round(percent * 10) / 10;
      const improved =
        metric.better === 'higher' ? delta > 0 : delta < 0;

      const changeText = metric.better === 'higher'
        ? improved
          ? `увеличилась на ${rounded}%`
          : `снизилась на ${rounded}%`
        : improved
          ? `уменьшилась на ${rounded}%`
          : `выросла на ${rounded}%`;

      return {
        label: metric.label,
        text: `За 30 дней ${changeText}.`,
      };
    });

    setComparison(rows);
  }, []);

  const buildForecast = useCallback(async () => {
    const items = await getDiagnostics();
    if (items.length < 2) {
      setForecast([]);
      return;
    }
    const current = items[0];
    const previous = items[1];
    const deltaDays = Math.max(1, Math.round((current.entryDate - previous.entryDate) / (24 * 60 * 60 * 1000)));

    const rows = metrics.map(metric => {
      const currentValue = current[metric.key] ?? null;
      const previousValue = previous[metric.key] ?? null;
      if (currentValue === null || previousValue === null) {
        return {
          label: metric.label,
          text: 'Недостаточно данных для прогноза.',
        };
      }
      const delta = currentValue - previousValue;
      const yearlyDelta = (delta / deltaDays) * 365;
      const projected = currentValue + yearlyDelta;
      const clamped = Math.max(0, Math.min(10, Math.round(projected * 10) / 10));
      return {
        label: metric.label,
        text: `Если тенденция сохранится, через год показатель может быть около ${clamped}/10.`,
      };
    });

    setForecast(rows);
  }, []);

  const load = useCallback(async () => {
    const existing = await getDiagnosticByDate(todayKey);
    const latest = await getLatestDiagnostic();
    if (existing) {
      setValues({
        density: existing.density ?? null,
        pigmentation: existing.pigmentation ?? null,
        vascular: existing.vascular ?? null,
        wrinkles: existing.wrinkles ?? null,
        photoaging: existing.photoaging ?? null,
      });
      setCurrentDate(existing.entryDate);
    } else if (latest) {
      setValues({
        density: latest.density ?? null,
        pigmentation: latest.pigmentation ?? null,
        vascular: latest.vascular ?? null,
        wrinkles: latest.wrinkles ?? null,
        photoaging: latest.photoaging ?? null,
      });
      setCurrentDate(latest.entryDate);
    }
    await buildComparison();
    await buildForecast();
  }, [buildComparison, buildForecast, todayKey]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onSave = async () => {
    await upsertDiagnostic({
      entryDate: todayKey,
      density: values.density ?? undefined,
      pigmentation: values.pigmentation ?? undefined,
      vascular: values.vascular ?? undefined,
      wrinkles: values.wrinkles ?? undefined,
      photoaging: values.photoaging ?? undefined,
    });
    setSaved(true);
    trackEvent('save_diagnostics', {
      filled: metrics.filter(metric => values[metric.key] !== null).length,
    });
    await buildComparison();
    await buildForecast();
    setTimeout(() => setSaved(false), 2000);
  };

  const filledCount = metrics.filter(metric => values[metric.key] !== null).length;
  const percentValue = Math.round((filledCount / metrics.length) * 100);
  const dateLabel = formatShortDate(currentDate);

  return (
    <Screen scroll>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.kicker}>Диагностика</Text>
          <Text style={styles.title}>Параметры кожи</Text>
        </View>
        <View style={styles.datePill}>
          <Text style={styles.dateText}>{dateLabel}</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>
        Оцени состояние по шкале 0–10. Эти оценки помогут увидеть реальную динамику.
      </Text>
      <Text style={styles.note}>
        Это личная шкала самонаблюдения — она не заменяет консультацию специалиста.
      </Text>

      <Reveal>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Текущий срез</Text>
          <View style={styles.heroRow}>
            <Text style={styles.heroPercent}>{percentValue}%</Text>
            <View>
              <Text style={styles.heroAmount}>{filledCount}/{metrics.length}</Text>
              <Text style={styles.heroHint}>метрик заполнено</Text>
            </View>
          </View>
          <View style={styles.heroTrack}>
            <View style={[styles.heroFill, { width: `${percentValue}%` }]} />
          </View>
        </View>
      </Reveal>

      <Reveal delay={80}>
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Метрики</Text>
          {metrics.map(metric => (
            <SelectRow
              key={metric.key}
              label={metric.label}
              value={values[metric.key]}
              options={Array.from({ length: 11 }, (_, i) => i)}
              onChange={value => updateMetric(metric.key, value)}
            />
          ))}
        </Card>
      </Reveal>

      <Reveal delay={160}>
        <PrimaryButton
          label={saved ? 'Сохранено' : 'Сохранить диагностику'}
          onPress={onSave}
          icon={saved ? '✓' : '›'}
        />
      </Reveal>

      <Reveal delay={240}>
        <View style={[styles.colorCard, styles.colorCardBlueDeep]}>
          <Text style={styles.colorTitle}>Динамика за 30 дней</Text>
          {comparison.length === 0 ? (
            <Text style={styles.colorText}>
              Добавь вторую диагностику через 30 дней, чтобы увидеть изменения.
            </Text>
          ) : (
            comparison.map(item => (
              <View key={item.label} style={styles.changeRow}>
                <Text style={styles.changeLabel}>{item.label}</Text>
                <Text style={styles.changeText}>{item.text}</Text>
              </View>
            ))
          )}
        </View>
      </Reveal>

      <Reveal delay={320}>
        <View style={[styles.colorCard, styles.colorCardBlue]}>
          <Text style={styles.colorTitle}>Прогноз на год</Text>
          {forecast.length === 0 ? (
            <Text style={styles.colorText}>
              Нужны минимум две диагностики, чтобы построить прогноз.
            </Text>
          ) : (
            forecast.map(item => (
              <View key={item.label} style={styles.changeRow}>
                <Text style={styles.changeLabel}>{item.label}</Text>
                <Text style={styles.changeText}>{item.text}</Text>
              </View>
            ))
          )}
        </View>
      </Reveal>
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
    marginBottom: spacing.sm,
  },
  note: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
    marginBottom: spacing.lg,
  },
  datePill: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  heroCard: {
    backgroundColor: colors.cardBlue,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
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
    marginBottom: spacing.md,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroPercent: {
    fontFamily: fonts.heading,
    fontSize: 44,
    color: colors.text,
  },
  heroAmount: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    color: colors.text,
  },
  heroHint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
  },
  heroTrack: {
    height: 10,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(43,27,35,0.12)',
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  heroFill: {
    height: '100%',
    borderRadius: radii.lg,
    backgroundColor: colors.primaryDeep,
  },
  sectionCard: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  colorCard: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  colorCardBlue: {
    backgroundColor: colors.cardBlue,
  },
  colorCardBlueDeep: {
    backgroundColor: colors.cardBlueDeep,
  },
  colorTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  colorText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
  },
  changeRow: {
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  changeLabel: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  changeText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
    marginTop: spacing.xs,
  },
});
