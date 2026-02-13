import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fontSizes, fonts, radii, spacing } from '../../app/theme';
import { Screen } from '../ui/Screen';
import { Card } from '../ui/Card';
import { PrimaryButton } from '../ui/PrimaryButton';
import { SelectRow } from '../ui/SelectRow';
import { getEntryByDate, getRecentEntries, upsertEntry } from '../../data/repos/dailyEntriesRepo';
import { formatShortDate, toDayKey } from '../../services/date';
import { getLabResults } from '../../data/repos/labsRepo';
import { getLatestWellness } from '../../data/repos/wellnessRepo';
import { getDiagnostics } from '../../data/repos/diagnosticsRepo';
import { getRoutineProfile } from '../../data/repos/routineRepo';
import {
  build30DayProgress,
  buildActionRecommendations,
  buildInsights,
} from '../../services/insights';
import { MainStackParamList } from '../../app/navigation/types';
import { Reveal } from '../ui/Reveal';
import { buildSkinSummary, SkinSummary } from '../../services/skinEngine';
import { trackEvent } from '../../services/analytics';

type MetricKey =
  | 'dryness'
  | 'oiliness'
  | 'acne'
  | 'stress'
  | 'sleep'
  | 'water';

const metricConfig: {
  key: MetricKey;
  label: string;
  min: number;
  max: number;
  suffix?: string;
}[] = [
  { key: 'dryness', label: 'Сухость кожи', min: 0, max: 5 },
  { key: 'oiliness', label: 'Жирность кожи', min: 0, max: 5 },
  { key: 'acne', label: 'Высыпания', min: 0, max: 5 },
  { key: 'stress', label: 'Уровень стресса', min: 0, max: 5 },
  { key: 'sleep', label: 'Сон', min: 0, max: 12, suffix: 'ч' },
  { key: 'water', label: 'Вода', min: 0, max: 12, suffix: 'ст' },
];

const initialValues: Record<MetricKey, number | null> = {
  dryness: null,
  oiliness: null,
  acne: null,
  stress: null,
  sleep: null,
  water: null,
};

const weekLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const getWeekdayLabel = (date: Date) => {
  const index = (date.getDay() + 6) % 7;
  return weekLabels[index];
};

export function TrackScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [values, setValues] = useState<Record<MetricKey, number | null>>(
    initialValues,
  );
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const [insights, setInsights] = useState<{ title: string; text: string }[]>([]);
  const [progressInsights, setProgressInsights] = useState<
    { title: string; text: string; direction: 'up' | 'down' | 'flat' }[]
  >([]);
  const [actionRecommendations, setActionRecommendations] = useState<
    { title: string; text: string; priority: 'high' | 'medium' }[]
  >([]);
  const [weekStats, setWeekStats] = useState<{ label: string; percent: number }[]>([]);
  const [weekTotal, setWeekTotal] = useState(0);
  const [skinSummary, setSkinSummary] = useState<SkinSummary>({
    index: 50,
    trend30: 0,
    risk: 'medium',
    factors: [],
    plan7: [],
    plan30: [],
    forecast: { withoutPlan: 45, withPlan: 55 },
  });
  const todayKey = useMemo(() => toDayKey(new Date()), []);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusAnim = useRef(new Animated.Value(0)).current;
  const heroFloat = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const load = async () => {
      const entry = await getEntryByDate(todayKey);
      if (!entry) {
        return;
      }

      setValues({
        dryness: entry.dryness ?? null,
        oiliness: entry.oiliness ?? null,
        acne: entry.acneLevel ?? null,
        stress: entry.stress ?? null,
        sleep: entry.sleepHours ?? null,
        water: entry.waterIntake ?? null,
      });
      setNote(entry.note ?? '');
    };

    load();
  }, [todayKey]);

  const refreshSmartData = useCallback(async () => {
    const [labs, wellness, diagnostics, routine, monthEntries, weekEntries] = await Promise.all([
      getLabResults(),
      getLatestWellness(),
      getDiagnostics(),
      getRoutineProfile(),
      getRecentEntries(45),
      getRecentEntries(7),
    ]);

    setInsights(
      buildInsights({
        labs,
        wellness,
        diagnostics: diagnostics[0] ?? null,
        routine,
      }),
    );
    setProgressInsights(
      build30DayProgress({
        entries: monthEntries,
        diagnostics,
      }),
    );
    setActionRecommendations(
      buildActionRecommendations({
        labs,
        wellness,
        routine,
      }),
    );

    setSkinSummary(
      buildSkinSummary({
        entries: monthEntries,
        diagnostics,
        labs,
        latestWellness: wellness,
        routine,
      }),
    );

    setWeekTotal(weekEntries.length);
    const weekMap = new Map(weekEntries.map(entry => [entry.entryDate, entry]));
    const days: { label: string; percent: number }[] = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      const key = toDayKey(date);
      const entry = weekMap.get(key);
      const filled = entry
        ? [
            entry.dryness,
            entry.oiliness,
            entry.acneLevel,
            entry.stress,
            entry.sleepHours,
            entry.waterIntake,
          ].filter(value => value !== null && value !== undefined).length
        : 0;
      const percent = Math.round((filled / metricConfig.length) * 100);
      days.push({ label: getWeekdayLabel(date), percent });
    }
    setWeekStats(days);
  }, []);

  useEffect(() => {
    refreshSmartData();
  }, [refreshSmartData]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(heroFloat, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(heroFloat, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [heroFloat]);

  const setMetric = (key: MetricKey, value: number) => {
    setValues(current => ({ ...current, [key]: value }));
  };

  const filledCount = metricConfig.filter(metric => values[metric.key] !== null)
    .length;
  const completion = filledCount / metricConfig.length;
  const dateLabel = formatShortDate(todayKey);
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Доброе утро';
    if (hour < 18) return 'Добрый день';
    return 'Добрый вечер';
  }, []);

  const focus = useMemo(() => {
    const dryness = values.dryness ?? 0;
    const oiliness = values.oiliness ?? 0;
    const acne = values.acne ?? 0;

    if (dryness >= 4) {
      return {
        title: 'Приоритет дня: Увлажнение',
        text: 'Сделай ставку на мягкое очищение и плотное увлажнение: кожа будет спокойнее, если убрать агрессивные средства и добавить больше воды и мягкого тепла.',
        steps: ['Мягкое очищение', 'Сыворотка с увлажнением', 'Плотный крем на ночь'],
        tone: 'blue',
      } as const;
    }
    if (acne >= 3) {
      return {
        title: 'Приоритет дня: Спокойствие кожи',
        text: 'Сегодня важна деликатность: избегай активов и сильного трения, дай коже отдых и поддержи её лёгким, но стабильным увлажнением.',
        steps: ['Мягкий гель', 'Успокаивающий тоник', 'Легкий крем'],
        tone: 'green',
      } as const;
    }
    if (oiliness >= 4) {
      return {
        title: 'Приоритет дня: Баланс',
        text: 'Сохрани матовость без пересушивания: лёгкая текстура, один активный шаг и хороший SPF дадут коже ощущение свежести без перегруза.',
        steps: ['Очищение без скрипа', 'Легкий флюид', 'SPF и матирование'],
        tone: 'purple',
      } as const;
    }

    return {
      title: 'Приоритет дня: Сияние',
      text: 'Пусть сегодня будет поддерживающим: лёгкий уход, защита от солнца и минимализм в слоях дают коже ровное и естественное сияние.',
      steps: ['Мягкое очищение', 'Увлажнение', 'SPF и защита'],
      tone: 'teal',
    } as const;
  }, [values.acne, values.dryness, values.oiliness]);

  useEffect(() => {
    const animation = Animated.timing(progressAnim, {
      toValue: completion,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [completion, progressAnim]);

  useEffect(() => {
    focusAnim.setValue(0);
    const animation = Animated.timing(focusAnim, {
      toValue: 1,
      duration: 460,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [focus.title, focusAnim]);

  const onSave = async () => {
    await upsertEntry({
      entryDate: todayKey,
      dryness: values.dryness ?? undefined,
      oiliness: values.oiliness ?? undefined,
      acneLevel: values.acne ?? undefined,
      stress: values.stress ?? undefined,
      sleepHours: values.sleep ?? undefined,
      waterIntake: values.water ?? undefined,
      note: note.trim() || undefined,
    });
    setSaved(true);
    trackEvent('save_daily_entry', {
      filledCount,
      hasNote: Boolean(note.trim()),
    });
    await refreshSmartData();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => setSaved(false), 2000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const percentValue = Math.round(completion * 100);
  const heroFigureStyle = {
    transform: [
      {
        translateY: heroFloat.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -5],
        }),
      },
      {
        scale: heroFloat.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.03],
        }),
      },
    ],
  };
  const heroFillWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
  const focusCardStyle = {
    opacity: focusAnim,
    transform: [
      {
        translateY: focusAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [14, 0],
        }),
      },
      {
        scale: focusAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.98, 1],
        }),
      },
    ],
  };
  const trendLabel =
    skinSummary.trend30 === 0
      ? '0%'
      : `${skinSummary.trend30 > 0 ? '+' : ''}${skinSummary.trend30}%`;
  const riskLabel =
    skinSummary.risk === 'high'
      ? 'Высокий риск'
      : skinSummary.risk === 'medium'
      ? 'Средний риск'
      : 'Низкий риск';
  const riskColor =
    skinSummary.risk === 'high'
      ? colors.danger
      : skinSummary.risk === 'medium'
      ? colors.accent
      : colors.success;

  return (
    <Screen scroll>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.kicker}>SkinTrack</Text>
          <Text style={styles.title}>Сегодня</Text>
        </View>
        <View style={styles.datePill}>
          <Text style={styles.dateText}>{dateLabel}</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>{greeting}! Быстрый обзор состояния кожи и самочувствия.</Text>

      <Reveal>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Ритм кожи на сегодня</Text>
          <View style={styles.heroBody}>
            <Animated.View style={[styles.heroFigure, heroFigureStyle]}>
              <View style={styles.heroHairBack} />
              <View style={styles.heroHead} />
              <View style={styles.heroHairFront} />
              <View style={styles.heroNeck} />
              <View style={styles.heroShoulders} />
              <View style={styles.heroDress} />
            </Animated.View>
            <View style={styles.heroStats}>
              <Text style={styles.heroPercent}>{percentValue}%</Text>
              <Text style={styles.heroAmount}>{filledCount}/{metricConfig.length} параметров</Text>
              <Text style={styles.heroHint}>Дневной чек-ин</Text>
            </View>
          </View>
          <View style={styles.heroTrack}>
            <Animated.View style={[styles.heroFill, { width: heroFillWidth }]} />
          </View>
          <Pressable style={styles.heroButton} onPress={() => navigation.navigate('Diagnostics')}>
            <Text style={styles.heroButtonText}>Открыть skin-профиль</Text>
          </Pressable>
        </View>
      </Reveal>

      <Reveal delay={80}>
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, styles.sectionTitleCompact]}>Оценка кожи</Text>
            <Pressable onPress={() => navigation.navigate('DiaryEntry', { entryDate: todayKey })}>
              <Text style={styles.sectionLink}>Изменить</Text>
            </Pressable>
          </View>
          {metricConfig.slice(0, 3).map(metric => (
            <SelectRow
              key={metric.key}
              label={metric.label}
              value={values[metric.key]}
              options={Array.from({ length: metric.max - metric.min + 1 }, (_, i) => i + metric.min)}
              onChange={value => setMetric(metric.key, value)}
            />
          ))}
        </Card>
      </Reveal>

      <Reveal delay={140}>
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Самочувствие</Text>
          <SelectRow
            label="Уровень стресса"
            value={values.stress}
            options={[0, 1, 2, 3, 4, 5]}
            onChange={value => setMetric('stress', value)}
          />
          <SelectRow
            label="Сон за ночь"
            value={values.sleep}
            options={Array.from({ length: 13 }, (_, i) => i)}
            suffix="часов"
            onChange={value => setMetric('sleep', value)}
          />
          <SelectRow
            label="Вода"
            value={values.water}
            options={Array.from({ length: 13 }, (_, i) => i)}
            suffix="стаканов"
            onChange={value => setMetric('water', value)}
          />
        </Card>
      </Reveal>

      <Reveal delay={200}>
        <View style={[styles.colorCard, styles.colorCardBlue]}>
          <View>
            <Text style={styles.colorTitle}>Недельный ритм</Text>
            <Text style={styles.colorSubtitle}>Отмечено дней: {weekTotal}</Text>
          </View>
          <View style={styles.weekRow}>
            {weekStats.map(item => (
              <View key={item.label} style={styles.weekItem}>
                <View style={[styles.weekCircle, item.percent > 0 && styles.weekCircleActive]}>
                  <Text style={styles.weekLabel}>{item.label}</Text>
                </View>
                <Text style={styles.weekValue}>{item.percent}%</Text>
              </View>
            ))}
          </View>
        </View>
      </Reveal>

      <Reveal delay={260}>
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Индекс кожи</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreValue}>{Math.round(skinSummary.index)}</Text>
            <View style={styles.scoreMeta}>
              <Text style={styles.scoreTrend}>Тренд 30 дней: {trendLabel}</Text>
              <Text style={[styles.scoreRisk, { color: riskColor }]}>{riskLabel}</Text>
            </View>
          </View>
        </Card>
      </Reveal>

      <Reveal delay={300}>
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Ключевые факторы</Text>
          {skinSummary.factors.length === 0 ? (
            <Text style={styles.sectionText}>
              Пока мало данных для факторного анализа. Продолжай заполнять трекер.
            </Text>
          ) : (
            skinSummary.factors.map(item => (
              <View key={item.title} style={styles.changeRow}>
                <View style={styles.factorTopRow}>
                  <Text style={styles.changeLabel}>{item.title}</Text>
                  <Text style={[styles.factorImpact, item.impact < 0 ? styles.impactNegative : styles.impactPositive]}>
                    {item.impact > 0 ? `+${item.impact}` : item.impact}
                  </Text>
                </View>
                <Text style={styles.changeText}>{item.reason}</Text>
              </View>
            ))
          )}
        </Card>
      </Reveal>

      <Reveal delay={340}>
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>План на 7 дней</Text>
          {skinSummary.plan7.map((item, index) => (
            <View key={`${item}-${index}`} style={styles.planRow}>
              <Text style={styles.planIndex}>{index + 1}</Text>
              <Text style={styles.planText}>{item}</Text>
            </View>
          ))}
        </Card>
      </Reveal>

      <Reveal delay={380}>
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>План на 30 дней</Text>
          {skinSummary.plan30.map((item, index) => (
            <View key={`${item}-${index}`} style={styles.planRow}>
              <Text style={styles.planIndex}>{index + 1}</Text>
              <Text style={styles.planText}>{item}</Text>
            </View>
          ))}
        </Card>
      </Reveal>

      <Reveal delay={420}>
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Прогноз</Text>
          <View style={styles.forecastRow}>
            <View style={styles.forecastBox}>
              <Text style={styles.forecastLabel}>Если ничего не менять</Text>
              <Text style={styles.forecastValue}>{Math.round(skinSummary.forecast.withoutPlan)}</Text>
            </View>
            <View style={[styles.forecastBox, styles.forecastBoxAccent]}>
              <Text style={styles.forecastLabel}>Если следовать плану</Text>
              <Text style={styles.forecastValue}>{Math.round(skinSummary.forecast.withPlan)}</Text>
            </View>
          </View>
        </Card>
      </Reveal>

      <Reveal delay={460}>
        <Animated.View
          style={[
            styles.colorCard,
            focus.tone === 'green'
              ? styles.colorCardGreen
              : focus.tone === 'purple'
              ? styles.colorCardPurple
              : focus.tone === 'teal'
              ? styles.colorCardTeal
              : styles.colorCardBlueDeep,
            focusCardStyle,
          ]}
        >
          <Text style={styles.colorTitle}>{focus.title}</Text>
          <Text style={styles.colorSubtitle}>{focus.text}</Text>
          <View style={styles.stepRowWrap}>
            {focus.steps.map((step, index) => (
              <View key={step} style={styles.stepRow}>
                <Text style={styles.stepIndex}>{index + 1}</Text>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </Reveal>

      <Reveal delay={500}>
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Заметка</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Например: стянутость после умывания"
            placeholderTextColor={colors.muted}
            style={styles.note}
            multiline
          />
        </Card>
      </Reveal>

      <Reveal delay={560}>
        <PrimaryButton
          label={saved ? 'Сохранено' : 'Сохранить запись'}
          onPress={onSave}
          style={styles.saveButton}
          icon={saved ? '✓' : '›'}
        />
      </Reveal>

      <Reveal delay={620}>
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Изменения за 30 дней</Text>
          {progressInsights.length === 0 ? (
            <Text style={styles.sectionText}>
              Недостаточно истории для сравнения. Продолжай заполнять данные в течение месяца.
            </Text>
          ) : (
            progressInsights.map(item => (
              <View key={item.title} style={styles.changeRow}>
                <View style={styles.factorTopRow}>
                  <Text style={styles.changeLabel}>{item.title}</Text>
                  <Text
                    style={[
                      styles.progressBadge,
                      item.direction === 'up'
                        ? styles.progressBadgeUp
                        : item.direction === 'down'
                        ? styles.progressBadgeDown
                        : styles.progressBadgeFlat,
                    ]}
                  >
                    {item.direction === 'up' ? '↑' : item.direction === 'down' ? '↓' : '•'}
                  </Text>
                </View>
                <Text style={styles.changeText}>{item.text}</Text>
              </View>
            ))
          )}
        </Card>
      </Reveal>

      <Reveal delay={660}>
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Рекомендации на сегодня</Text>
          {actionRecommendations.map(item => (
            <View key={item.title} style={styles.changeRow}>
              <View style={styles.factorTopRow}>
                <Text style={styles.changeLabel}>{item.title}</Text>
                <Text
                  style={[
                    styles.priorityBadge,
                    item.priority === 'high' ? styles.priorityBadgeHigh : styles.priorityBadgeMedium,
                  ]}
                >
                  {item.priority === 'high' ? 'приоритет' : 'план'}
                </Text>
              </View>
              <Text style={styles.changeText}>{item.text}</Text>
            </View>
          ))}
        </Card>
      </Reveal>

      <Reveal delay={700}>
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Личные инсайты</Text>
          {insights.length === 0 ? (
            <Text style={styles.sectionText}>
              Добавь диагностику, самочувствие или анализы — мы сформируем подсказки.
            </Text>
          ) : (
            insights.map(item => (
              <View key={item.title} style={styles.changeRow}>
                <Text style={styles.changeLabel}>{item.title}</Text>
                <Text style={styles.changeText}>{item.text}</Text>
              </View>
            ))
          )}
        </Card>
      </Reveal>

      <Reveal delay={760}>
        <View style={styles.tileRow}>
          <Pressable style={[styles.tile, styles.tileBlue]} onPress={() => navigation.navigate('Diagnostics')}>
            <Text style={styles.tileTitle}>Skin-диагностика</Text>
            <Text style={styles.tileText}>Плотность, пигментация и динамика.</Text>
          </Pressable>
          <Pressable style={[styles.tile, styles.tilePurple]} onPress={() => navigation.navigate('Labs')}>
            <Text style={styles.tileTitle}>Анализы и гормоны</Text>
            <Text style={styles.tileText}>Ферритин, витамин D, ТТГ и др.</Text>
          </Pressable>
        </View>
        <View style={styles.tileRow}>
          <Pressable style={[styles.tile, styles.tileGreen]} onPress={() => navigation.navigate('Wellness')}>
            <Text style={styles.tileTitle}>Сон и стресс</Text>
            <Text style={styles.tileText}>Цикл, ПМС и восстановление.</Text>
          </Pressable>
          <Pressable style={[styles.tile, styles.tileTeal]} onPress={() => navigation.navigate('Routine')}>
            <Text style={styles.tileTitle}>Уход и активы</Text>
            <Text style={styles.tileText}>Ретинол, кислоты и нагрузка.</Text>
          </Pressable>
        </View>
      </Reveal>

      <Reveal delay={820}>
        <View style={styles.tileRow}>
          <Pressable style={[styles.tile, styles.tileDark, styles.tileLeft]} onPress={() => navigation.navigate('Stats')}>
            <Text style={styles.tileTitle}>Статистика</Text>
            <Text style={styles.tileText}>Сравни неделю и тренды.</Text>
          </Pressable>
          <Pressable style={[styles.tile, styles.tileDark, styles.tileRight]} onPress={() => navigation.navigate('Reminders')}>
            <Text style={styles.tileTitle}>Напоминания</Text>
            <Text style={styles.tileText}>Утро и вечер, чтобы не забывать.</Text>
          </Pressable>
        </View>
      </Reveal>

      <Reveal delay={880}>
        <Pressable style={styles.settingsLink} onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.settingsText}>Настройки</Text>
        </Pressable>
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
    fontSize: fontSizes.xl,
    color: colors.text,
    marginBottom: spacing.md,
  },
  heroBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroFigure: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heroHairBack: {
    position: 'absolute',
    top: 18,
    width: 56,
    height: 58,
    borderRadius: 28,
    backgroundColor: 'rgba(233,133,164,0.45)',
  },
  heroHead: {
    position: 'absolute',
    top: 24,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.62)',
  },
  heroHairFront: {
    position: 'absolute',
    top: 20,
    width: 46,
    height: 30,
    borderRadius: 16,
    backgroundColor: 'rgba(233,133,164,0.4)',
  },
  heroNeck: {
    position: 'absolute',
    top: 56,
    width: 12,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.62)',
  },
  heroShoulders: {
    position: 'absolute',
    top: 62,
    width: 66,
    height: 26,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  heroDress: {
    position: 'absolute',
    top: 78,
    width: 40,
    height: 26,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  heroStats: {
    alignItems: 'flex-end',
  },
  heroPercent: {
    fontFamily: fonts.heading,
    fontSize: 44,
    color: colors.text,
  },
  heroAmount: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  heroHint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
    marginTop: spacing.xs,
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
  heroButton: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  heroButtonText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    color: colors.primaryDeep,
  },
  sectionCard: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionTitleCompact: {
    marginBottom: 0,
  },
  sectionLink: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.accent,
  },
  sectionText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreValue: {
    fontFamily: fonts.heading,
    fontSize: 48,
    color: colors.primaryDeep,
  },
  scoreMeta: {
    alignItems: 'flex-end',
  },
  scoreTrend: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  scoreRisk: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    marginTop: spacing.xs,
  },
  factorTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  factorImpact: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
  },
  impactNegative: {
    color: colors.danger,
  },
  impactPositive: {
    color: colors.success,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  planIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceAlt,
    color: colors.primaryDeep,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    marginRight: spacing.sm,
    marginTop: 2,
  },
  planText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  forecastRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  forecastBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: colors.surfaceAlt,
    marginRight: spacing.sm,
  },
  forecastBoxAccent: {
    marginRight: 0,
    marginLeft: spacing.sm,
    backgroundColor: colors.secondary,
  },
  forecastLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
  },
  forecastValue: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xl,
    color: colors.primaryDeep,
    marginTop: spacing.xs,
  },
  note: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.lg,
    padding: spacing.md,
    minHeight: 90,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
  },
  saveButton: {
    marginBottom: spacing.lg,
  },
  colorCard: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  colorCardBlue: {
    backgroundColor: colors.cardBlueDeep,
  },
  colorCardBlueDeep: {
    backgroundColor: colors.cardBlue,
  },
  colorCardGreen: {
    backgroundColor: colors.cardGreen,
  },
  colorCardPurple: {
    backgroundColor: colors.cardPurple,
  },
  colorCardTeal: {
    backgroundColor: colors.cardTeal,
  },
  colorTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  colorSubtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  weekItem: {
    alignItems: 'center',
  },
  weekCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(43,27,35,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekCircleActive: {
    backgroundColor: 'rgba(43,27,35,0.16)',
  },
  weekLabel: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  weekValue: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  stepRowWrap: {
    marginTop: spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  stepIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(43,27,35,0.12)',
    color: colors.text,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    marginRight: spacing.sm,
  },
  stepText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.text,
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
  progressBadge: {
    minWidth: 24,
    textAlign: 'center',
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
    overflow: 'hidden',
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
  },
  progressBadgeUp: {
    backgroundColor: 'rgba(108,165,145,0.18)',
    color: colors.success,
  },
  progressBadgeDown: {
    backgroundColor: 'rgba(200,90,120,0.15)',
    color: colors.danger,
  },
  progressBadgeFlat: {
    backgroundColor: colors.surfaceAlt,
    color: colors.muted,
  },
  priorityBadge: {
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 8,
    overflow: 'hidden',
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  priorityBadgeHigh: {
    backgroundColor: 'rgba(200,90,120,0.15)',
    color: colors.danger,
  },
  priorityBadgeMedium: {
    backgroundColor: 'rgba(233,139,167,0.2)',
    color: colors.accent,
  },
  tileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  tile: {
    flex: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  tileLeft: {
    marginRight: spacing.sm,
  },
  tileRight: {
    marginLeft: spacing.sm,
  },
  tileBlue: {
    backgroundColor: colors.cardBlue,
  },
  tilePurple: {
    backgroundColor: colors.cardPurple,
  },
  tileGreen: {
    backgroundColor: colors.cardGreen,
  },
  tileTeal: {
    backgroundColor: colors.cardTeal,
  },
  tileDark: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  tileText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  settingsLink: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  settingsText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
  },
});
