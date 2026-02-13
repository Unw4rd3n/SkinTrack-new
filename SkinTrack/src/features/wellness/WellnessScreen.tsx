import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fontSizes, fonts, radii, spacing } from '../../app/theme';
import { Screen } from '../ui/Screen';
import { Card } from '../ui/Card';
import { SelectRow } from '../ui/SelectRow';
import { PrimaryButton } from '../ui/PrimaryButton';
import { Reveal } from '../ui/Reveal';
import { formatShortDate, toDayKey } from '../../services/date';
import {
  getWellnessEntryByDate,
  upsertWellness,
} from '../../data/repos/wellnessRepo';
import {
  getAllCycleEvents,
  setPeriodRange,
  togglePregnancyDay,
  togglePeriodDay,
} from '../../data/repos/cycleRepo';
import {
  getCycleProfile,
  upsertCycleProfile,
} from '../../data/repos/cycleProfileRepo';
import { trackEvent } from '../../services/analytics';

const DAY = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const DEFAULT_LUTEAL_PHASE_DAYS = 17;
const FORECAST_CYCLE_COUNT = 8;
const SLEEP_TRACK_SEGMENTS = Array.from({ length: 24 }, (_, index) => index);
const SLEEP_GRADIENT_SEGMENTS = Array.from({ length: 40 }, (_, index) => index);
const LEVEL_OPTIONS = [1, 2, 3, 4, 5];
const SLEEP_QUALITY_OPTIONS = [
  { value: 1, label: 'Очень плохо' },
  { value: 2, label: 'Плохо' },
  { value: 3, label: 'Нормально' },
  { value: 4, label: 'Хорошо' },
  { value: 5, label: 'Отлично' },
];

function addDaysToDayKey(dayKey: number, days: number) {
  const date = new Date(dayKey);
  date.setDate(date.getDate() + days);
  return toDayKey(date);
}

function diffInDays(fromDayKey: number, toDayKeyValue: number) {
  const from = new Date(fromDayKey);
  const to = new Date(toDayKeyValue);
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toUtc - fromUtc) / DAY);
}

function sleepZoneForHours(hours: number | null) {
  if (hours === null) {
    return null;
  }
  if (hours <= 6) {
    return {
      label: '0-6: дефицит сна',
      color: '#E1002A',
      background: '#FFD7E0',
    };
  }
  if (hours <= 9) {
    return { label: '7-9: оптимум', color: '#4C947A', background: '#D9F1E7' };
  }
  return { label: '10-24: избыток', color: '#9B7400', background: '#FFF3B8' };
}

function sleepQualityPalette(value: number) {
  if (value <= 2) {
    return {
      main: '#E1002A',
      soft: '#FFD7E0',
    };
  }
  if (value <= 4) {
    return {
      main: '#FFD60A',
      soft: '#FFF7CC',
    };
  }
  return {
    main: '#2E9D63',
    soft: '#D6F6E3',
  };
}

function sleepQualitySelectedTextColor(value: number) {
  if (value <= 4 && value >= 3) {
    return '#2B1B23';
  }
  return '#FFFFFF';
}

function hexToRgb(hex: string) {
  const safe = hex.replace('#', '');
  const normalized =
    safe.length === 3
      ? safe
          .split('')
          .map(char => `${char}${char}`)
          .join('')
      : safe;
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (value: number) =>
    Math.round(value).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixHex(startHex: string, endHex: string, ratio: number) {
  const start = hexToRgb(startHex);
  const end = hexToRgb(endHex);
  const t = Math.max(0, Math.min(1, ratio));
  return rgbToHex(
    start.r + (end.r - start.r) * t,
    start.g + (end.g - start.g) * t,
    start.b + (end.b - start.b) * t,
  );
}

type CalendarMarkMode = 'period' | 'pregnancy';

type CycleEventItem = {
  entryDate: number;
  isPeriod: boolean;
  isPregnancy?: boolean;
};

type CycleForecast = {
  periodSet: Set<number>;
  fertileSet: Set<number>;
  ovulationSet: Set<number>;
  nextPeriodStart: number | null;
  cycleLength: number | null;
  periodLength: number | null;
  currentCycleDay: number | null;
};

function startOfMonth(date: Date) {
  const value = new Date(date);
  value.setDate(1);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfMonth(date: Date) {
  const value = new Date(date);
  value.setMonth(value.getMonth() + 1, 0);
  value.setHours(0, 0, 0, 0);
  return value;
}

function monthLabel(date: Date) {
  try {
    return new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(date);
  } catch {
    return `${date.getMonth() + 1}`;
  }
}

function buildCalendarDays(monthDate: Date) {
  const start = startOfMonth(monthDate);
  const offset = (start.getDay() + 6) % 7;
  const gridStart = addDaysToDayKey(start.getTime(), -offset);
  return Array.from({ length: 42 }, (_, index) => {
    const timestamp = addDaysToDayKey(gridStart, index);
    const date = new Date(timestamp);
    return {
      key: toDayKey(date),
      day: date.getDate(),
      inMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
}

function startOfDayDate(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function getPeriodRuns(periodDays: number[]) {
  const sorted = [...periodDays].sort((a, b) => a - b);
  const runs: number[][] = [];

  for (const day of sorted) {
    const lastRun = runs[runs.length - 1];
    if (!lastRun || diffInDays(lastRun[lastRun.length - 1], day) > 1) {
      runs.push([day]);
      continue;
    }
    lastRun.push(day);
  }

  return runs;
}

function averageRounded(
  values: number[],
  fallback: number,
  min: number,
  max: number,
) {
  if (values.length === 0) {
    return fallback;
  }
  const avg = Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
  return Math.max(min, Math.min(max, avg));
}

function buildCycleForecast(
  periodDays: number[],
  todayKey: number,
  configuredCycleLength?: number | null,
  configuredPeriodLength?: number | null,
  forecastUntilKey?: number | null,
): CycleForecast {
  const runs = getPeriodRuns(periodDays);
  if (runs.length === 0) {
    return {
      periodSet: new Set(),
      fertileSet: new Set(),
      ovulationSet: new Set(),
      nextPeriodStart: null,
      cycleLength: configuredCycleLength ?? null,
      periodLength: configuredPeriodLength ?? null,
      currentCycleDay: null,
    };
  }

  const starts = runs.map(run => run[0]);
  const lengths = runs.map(run => run.length);
  const pastRuns = runs.filter(run => run[0] <= todayKey);
  const anchorRun =
    pastRuns.length > 0 ? pastRuns[pastRuns.length - 1] : runs[runs.length - 1];
  const diffs: number[] = [];
  for (let i = 1; i < starts.length; i += 1) {
    diffs.push(diffInDays(starts[i - 1], starts[i]));
  }

  const cycleLength =
    configuredCycleLength ?? averageRounded(diffs.slice(-6), 28, 21, 60);
  const periodLength =
    configuredPeriodLength ?? averageRounded(lengths.slice(-6), 5, 3, 12);
  const latestStart = anchorRun[0];
  const latestRun = anchorRun;
  const latestRunEnd = latestRun[latestRun.length - 1];

  const nextPeriodStart = addDaysToDayKey(latestStart, cycleLength);
  const predictedPeriod = new Set<number>();
  const fertileSet = new Set<number>();
  const ovulationSet = new Set<number>();
  let cyclesToGenerate = FORECAST_CYCLE_COUNT;
  if (
    forecastUntilKey !== null &&
    forecastUntilKey !== undefined &&
    forecastUntilKey > nextPeriodStart
  ) {
    const daysAhead = diffInDays(nextPeriodStart, forecastUntilKey);
    cyclesToGenerate = Math.max(
      FORECAST_CYCLE_COUNT,
      Math.ceil(daysAhead / Math.max(1, cycleLength)) + 2,
    );
  }

  for (let cycleOffset = 0; cycleOffset < cyclesToGenerate; cycleOffset += 1) {
    const start = addDaysToDayKey(nextPeriodStart, cycleOffset * cycleLength);
    for (let i = 0; i < periodLength; i += 1) {
      predictedPeriod.add(addDaysToDayKey(start, i));
    }
    const rawOvulation = addDaysToDayKey(start, -DEFAULT_LUTEAL_PHASE_DAYS);
    const previousCycleStart = addDaysToDayKey(start, -cycleLength);
    const previousCyclePeriodEnd =
      cycleOffset === 0
        ? latestRunEnd
        : addDaysToDayKey(previousCycleStart, periodLength - 1);
    const ovulation = Math.max(
      rawOvulation,
      addDaysToDayKey(previousCyclePeriodEnd, 1),
    );
    ovulationSet.add(ovulation);
    for (let i = -5; i <= 1; i += 1) {
      fertileSet.add(addDaysToDayKey(ovulation, i));
    }
  }

  const latestPastStart =
    pastRuns.length > 0 ? pastRuns[pastRuns.length - 1][0] : null;
  const currentCycleDay =
    latestPastStart !== null
      ? Math.max(1, diffInDays(latestPastStart, todayKey) + 1)
      : null;

  return {
    periodSet: predictedPeriod,
    fertileSet,
    ovulationSet,
    nextPeriodStart,
    cycleLength,
    periodLength,
    currentCycleDay,
  };
}

export function WellnessScreen() {
  const todayKey = useMemo(() => toDayKey(new Date()), []);
  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [stressLevel, setStressLevel] = useState<number | null>(null);
  const [irritability, setIrritability] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [cycleDay, setCycleDay] = useState<number | null>(null);
  const [strengthSession, setStrengthSession] = useState<number | null>(null);
  const [proteinScore, setProteinScore] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [displayMonth, setDisplayMonth] = useState<Date>(() =>
    startOfMonth(new Date()),
  );
  const [cycleEvents, setCycleEvents] = useState<CycleEventItem[]>([]);
  const [periodDays, setPeriodDays] = useState<number[]>([]);
  const [rangeStart, setRangeStart] = useState<number | null>(null);
  const [markMode, setMarkMode] = useState<CalendarMarkMode>('period');
  const [cycleProfile, setCycleProfile] = useState<{
    cycleLength: number;
    periodLength: number;
  } | null>(null);
  const [setupMode, setSetupMode] = useState(false);
  const [draftCycleLength, setDraftCycleLength] = useState<number | null>(null);
  const [draftPeriodLength, setDraftPeriodLength] = useState<number | null>(
    null,
  );
  const [draftPeriodStart, setDraftPeriodStart] = useState<Date | null>(null);
  const [periodStartPickerVisible, setPeriodStartPickerVisible] =
    useState(false);
  const [periodStartPickerValue, setPeriodStartPickerValue] = useState<Date>(
    startOfDayDate(new Date()),
  );
  const [sleepTrackWidth, setSleepTrackWidth] = useState(1);
  const cycleLengthOptions = useMemo(
    () => Array.from({ length: 40 }, (_, index) => index + 21),
    [],
  );
  const periodLengthOptions = useMemo(
    () => Array.from({ length: 11 }, (_, index) => index + 2),
    [],
  );
  const dateLabel = formatShortDate(todayKey);

  const load = useCallback(async () => {
    const [entry, events, profile] = await Promise.all([
      getWellnessEntryByDate(todayKey),
      getAllCycleEvents(),
      getCycleProfile(),
    ]);
    if (entry) {
      setSleepHours(entry.sleepHours ?? null);
      setSleepQuality(entry.sleepQuality ?? null);
      setStressLevel(entry.stressLevel ?? null);
      setIrritability(entry.irritability ?? null);
      setEnergy(entry.energy ?? null);
      setCycleDay(entry.cycleDay ?? null);
      setStrengthSession(
        entry.strengthSession === null || entry.strengthSession === undefined
          ? null
          : entry.strengthSession > 0
          ? 1
          : 0,
      );
      setProteinScore(entry.proteinScore ?? null);
    }

    const normalizedEvents: CycleEventItem[] = events.map(item => ({
      entryDate: item.entryDate,
      isPeriod: item.isPeriod,
      isPregnancy: Boolean(item.isPregnancy),
    }));
    const days = normalizedEvents
      .filter(item => item.isPeriod)
      .map(item => item.entryDate);
    const runs = getPeriodRuns(days);
    const latestPeriodStart = runs.length > 0 ? runs[runs.length - 1][0] : null;

    setCycleEvents(normalizedEvents);
    setPeriodDays(days);
    if (profile) {
      setCycleProfile({
        cycleLength: profile.cycleLength,
        periodLength: profile.periodLength,
      });
      setSetupMode(false);
      setDraftCycleLength(profile.cycleLength);
      setDraftPeriodLength(profile.periodLength);
      const initialStart = latestPeriodStart ?? todayKey;
      const initialDate = new Date(initialStart);
      setDraftPeriodStart(initialDate);
      setPeriodStartPickerValue(initialDate);
    } else {
      setCycleProfile(null);
      setSetupMode(true);
      setDraftCycleLength(null);
      setDraftPeriodLength(null);
      const initialStart = latestPeriodStart ?? todayKey;
      const initialDate = new Date(initialStart);
      setDraftPeriodStart(initialDate);
      setPeriodStartPickerValue(initialDate);
    }
    const forecast = buildCycleForecast(
      days,
      todayKey,
      profile?.cycleLength ?? null,
      profile?.periodLength ?? null,
    );
    setCycleDay(forecast.currentCycleDay);
  }, [todayKey]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onSave = async () => {
    await upsertWellness({
      entryDate: todayKey,
      sleepHours: sleepHours ?? undefined,
      sleepQuality: sleepQuality ?? undefined,
      stressLevel: stressLevel ?? undefined,
      irritability: irritability ?? undefined,
      energy: energy ?? undefined,
      cycleDay: cycleDay ?? undefined,
      strengthSession: strengthSession ?? undefined,
      proteinScore: proteinScore ?? undefined,
    });
    trackEvent('save_wellness_entry', {
      filled: [
        sleepHours,
        sleepQuality,
        stressLevel,
        irritability,
        energy,
        cycleDay,
        strengthSession,
        proteinScore,
      ].filter(value => value !== null).length,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const filledCount = [
    sleepHours,
    sleepQuality,
    stressLevel,
    irritability,
    energy,
    cycleDay,
    strengthSession,
    proteinScore,
  ].filter(value => value !== null).length;
  const percentValue = Math.round((filledCount / 8) * 100);
  const sleepZone = useMemo(() => sleepZoneForHours(sleepHours), [sleepHours]);
  const sleepGradientColors = useMemo(
    () =>
      SLEEP_GRADIENT_SEGMENTS.map((_, index) =>
        mixHex(
          colors.primaryDeep,
          '#FFFFFF',
          index / (SLEEP_GRADIENT_SEGMENTS.length - 1),
        ),
      ),
    [],
  );
  const sleepQualityLabel = useMemo(
    () =>
      SLEEP_QUALITY_OPTIONS.find(option => option.value === sleepQuality)
        ?.label ?? 'Выбери оценку',
    [sleepQuality],
  );
  const cycleSet = useMemo(() => new Set(periodDays), [periodDays]);
  const pregnancySet = useMemo(
    () =>
      new Set(
        cycleEvents
          .filter(item => Boolean(item.isPregnancy))
          .map(item => item.entryDate),
      ),
    [cycleEvents],
  );
  const forecastUntilKey = useMemo(
    () => addDaysToDayKey(endOfMonth(displayMonth).getTime(), 120),
    [displayMonth],
  );
  const cycleForecast = useMemo(
    () =>
      buildCycleForecast(
        periodDays,
        todayKey,
        cycleProfile?.cycleLength ?? null,
        cycleProfile?.periodLength ?? null,
        forecastUntilKey,
      ),
    [
      periodDays,
      todayKey,
      cycleProfile?.cycleLength,
      cycleProfile?.periodLength,
      forecastUntilKey,
    ],
  );
  const calendarDays = useMemo(
    () => buildCalendarDays(displayMonth),
    [displayMonth],
  );
  const hasCycleProfile = cycleProfile !== null;
  const isCalendarReady = hasCycleProfile && !setupMode;

  const goMonth = (offset: number) => {
    setDisplayMonth(current => {
      const next = new Date(current);
      next.setMonth(next.getMonth() + offset);
      return startOfMonth(next);
    });
  };

  const reloadCycleState = async (
    profileOverride: {
      cycleLength: number;
      periodLength: number;
    } | null = cycleProfile,
  ) => {
    const events = await getAllCycleEvents();
    const normalizedEvents: CycleEventItem[] = events.map(item => ({
      entryDate: item.entryDate,
      isPeriod: item.isPeriod,
      isPregnancy: Boolean(item.isPregnancy),
    }));
    const days = normalizedEvents
      .filter(item => item.isPeriod)
      .map(item => item.entryDate);
    setCycleEvents(normalizedEvents);
    setPeriodDays(days);
    const forecast = buildCycleForecast(
      days,
      todayKey,
      profileOverride?.cycleLength ?? null,
      profileOverride?.periodLength ?? null,
    );
    setCycleDay(forecast.currentCycleDay);
  };

  const onSelectRangeDay = async (dayKey: number) => {
    if (!hasCycleProfile) {
      setSetupMode(true);
      return;
    }
    if (markMode === 'pregnancy') {
      await togglePregnancyDay(dayKey);
      setRangeStart(null);
      await reloadCycleState();
      trackEvent('pregnancy_day_toggled', { dayKey });
      return;
    }
    if (rangeStart === null) {
      setRangeStart(dayKey);
      trackEvent('period_range_start_selected', { dayKey });
      return;
    }

    await setPeriodRange(rangeStart, dayKey, true);
    setRangeStart(null);
    await reloadCycleState();
    trackEvent('period_range_applied', {
      startDay: Math.min(rangeStart, dayKey),
      endDay: Math.max(rangeStart, dayKey),
    });
  };

  const onClearSingleDay = async (dayKey: number) => {
    if (!hasCycleProfile) {
      setSetupMode(true);
      return;
    }
    if (markMode === 'pregnancy') {
      await togglePregnancyDay(dayKey);
      await reloadCycleState();
      trackEvent('pregnancy_day_toggled', { dayKey, longPress: true });
      return;
    }
    await togglePeriodDay(dayKey);
    setRangeStart(null);
    await reloadCycleState();
    trackEvent('period_day_toggled', { dayKey });
  };

  const cancelRange = () => {
    setRangeStart(null);
  };

  const selectMarkMode = (mode: CalendarMarkMode) => {
    setMarkMode(mode);
    setRangeStart(null);
  };

  const openPeriodStartPicker = () => {
    const value = startOfDayDate(draftPeriodStart ?? new Date());
    setPeriodStartPickerValue(value);
    setPeriodStartPickerVisible(true);
  };

  const closePeriodStartPicker = () => {
    setPeriodStartPickerVisible(false);
  };

  const confirmPeriodStartPicker = () => {
    setDraftPeriodStart(startOfDayDate(periodStartPickerValue));
    setPeriodStartPickerVisible(false);
  };

  const onSaveCycleProfile = async () => {
    const isFirstSetup = !hasCycleProfile;
    if (
      draftCycleLength === null ||
      draftPeriodLength === null ||
      draftPeriodStart === null
    ) {
      Alert.alert(
        'Заполни параметры',
        'Укажи длину цикла, длительность и дату начала менструации.',
      );
      return;
    }
    if (draftPeriodLength > draftCycleLength) {
      Alert.alert(
        'Проверь параметры',
        'Длительность менструации не может быть больше длины цикла.',
      );
      return;
    }

    const nextProfile = {
      cycleLength: draftCycleLength,
      periodLength: draftPeriodLength,
    };
    await upsertCycleProfile(nextProfile);
    const startKey = toDayKey(draftPeriodStart);
    const latestRunStart = getPeriodRuns(periodDays).slice(-1)[0]?.[0] ?? null;
    if (isFirstSetup || latestRunStart !== startKey) {
      const endKey = addDaysToDayKey(startKey, draftPeriodLength - 1);
      await setPeriodRange(startKey, endKey, true);
    }
    setCycleProfile(nextProfile);
    setSetupMode(false);
    setRangeStart(null);
    trackEvent('cycle_profile_saved', nextProfile);
    await reloadCycleState(nextProfile);
  };

  const openCycleSetup = () => {
    if (cycleProfile) {
      setDraftCycleLength(cycleProfile.cycleLength);
      setDraftPeriodLength(cycleProfile.periodLength);
      const latestStart =
        getPeriodRuns(periodDays).slice(-1)[0]?.[0] ?? todayKey;
      const latestStartDate = new Date(latestStart);
      setDraftPeriodStart(latestStartDate);
      setPeriodStartPickerValue(latestStartDate);
    }
    setSetupMode(true);
  };

  const cancelCycleSetup = () => {
    if (!cycleProfile) {
      return;
    }
    setDraftCycleLength(cycleProfile.cycleLength);
    setDraftPeriodLength(cycleProfile.periodLength);
    const latestStart = getPeriodRuns(periodDays).slice(-1)[0]?.[0] ?? todayKey;
    const latestStartDate = new Date(latestStart);
    setDraftPeriodStart(latestStartDate);
    setPeriodStartPickerValue(latestStartDate);
    setSetupMode(false);
  };

  const nextPeriodText = cycleForecast.nextPeriodStart
    ? formatShortDate(cycleForecast.nextPeriodStart)
    : '—';
  const cycleStatsText =
    cycleForecast.cycleLength !== null && cycleForecast.periodLength !== null
      ? `Прогноз на основе истории: цикл ${cycleForecast.cycleLength} дней, длительность ${cycleForecast.periodLength} дней. При изменении цикла или даты начала календарь автоматически сдвигается.`
      : 'Сначала задай длину цикла и длительность менструации, затем отмечай даты периода.';
  const updateSleepByTrackPosition = (x: number) => {
    const safeWidth = Math.max(1, sleepTrackWidth);
    const clamped = Math.max(0, Math.min(safeWidth, x));
    const nextHours = Math.round((clamped / safeWidth) * 24);
    setSleepHours(nextHours);
  };
  const showCalendarOnly = true;

  return (
    <Screen scroll>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.kicker}>Самочувствие</Text>
          <Text style={styles.title}>Цикл и стресс</Text>
        </View>
        <View style={styles.datePill}>
          <Text style={styles.dateText}>{dateLabel}</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>
        Отмечай только даты цикла — календарь сам обновит прогноз.
      </Text>

      {!showCalendarOnly ? (
        <>
          <Reveal>
            <View style={styles.heroCard}>
              <Text style={styles.heroTitle}>Сводка дня</Text>
              <View style={styles.heroRow}>
                <Text style={styles.heroPercent}>{percentValue}%</Text>
                <View>
                  <Text style={styles.heroAmount}>{filledCount}/8</Text>
                  <Text style={styles.heroHint}>показателей заполнено</Text>
                </View>
              </View>
              <View style={styles.heroTrack}>
                <View
                  style={[styles.heroFill, { width: `${percentValue}%` }]}
                />
              </View>
            </View>
          </Reveal>

          <Reveal delay={80}>
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Сон</Text>
              <View style={styles.sleepRangeCard}>
                <View style={styles.sleepRangeHeader}>
                  <Text style={styles.sleepRangeLabel}>Сколько часов</Text>
                  <Text style={styles.sleepRangeValue}>
                    {sleepHours === null ? '—' : `${sleepHours} ч`}
                  </Text>
                </View>

                <View style={styles.sleepTrackWrap}>
                  <View
                    style={styles.sleepTrackBase}
                    onLayout={event =>
                      setSleepTrackWidth(event.nativeEvent.layout.width)
                    }
                  >
                    {sleepGradientColors.map((color, index) => (
                      <View
                        key={`sleep-gradient-${index}`}
                        style={[
                          styles.sleepGradientSegment,
                          { backgroundColor: color },
                        ]}
                      />
                    ))}
                  </View>
                  <View style={styles.sleepTrackGrid}>
                    {SLEEP_TRACK_SEGMENTS.map(segment => (
                      <View
                        key={segment}
                        style={[
                          styles.sleepTrackDivider,
                          (segment === 6 || segment === 9) &&
                            styles.sleepTrackDividerMajor,
                        ]}
                      />
                    ))}
                  </View>
                  <View
                    style={styles.sleepTrackTouchLayer}
                    onStartShouldSetResponder={() => true}
                    onMoveShouldSetResponder={() => true}
                    onResponderGrant={event =>
                      updateSleepByTrackPosition(event.nativeEvent.locationX)
                    }
                    onResponderMove={event =>
                      updateSleepByTrackPosition(event.nativeEvent.locationX)
                    }
                    onResponderRelease={event =>
                      updateSleepByTrackPosition(event.nativeEvent.locationX)
                    }
                  >
                    {SLEEP_TRACK_SEGMENTS.map(segment => (
                      <View key={segment} style={styles.sleepTrackTouchStep} />
                    ))}
                  </View>
                  {sleepHours !== null ? (
                    <View
                      style={[
                        styles.sleepTrackThumb,
                        { left: `${(sleepHours / 24) * 100}%` },
                      ]}
                    />
                  ) : null}
                </View>

                <View style={styles.sleepTicksTrack}>
                  <Text style={[styles.sleepTickText, styles.sleepTickStart]}>
                    0
                  </Text>
                  <Text style={[styles.sleepTickText, styles.sleepTickAt6]}>
                    6
                  </Text>
                  <Text style={[styles.sleepTickText, styles.sleepTickAt9]}>
                    9
                  </Text>
                  <Text style={[styles.sleepTickText, styles.sleepTickEnd]}>
                    24
                  </Text>
                </View>
                <Text style={styles.sleepDragHint}>
                  Проведи пальцем по полоске
                </Text>

                <View style={styles.sleepLegendRow}>
                  <View style={styles.sleepLegendItem}>
                    <View
                      style={[styles.sleepLegendDot, styles.sleepTrackRed]}
                    />
                    <Text style={styles.sleepLegendText}>0-6</Text>
                  </View>
                  <View style={styles.sleepLegendItem}>
                    <View
                      style={[styles.sleepLegendDot, styles.sleepTrackGreen]}
                    />
                    <Text style={styles.sleepLegendText}>7-9</Text>
                  </View>
                  <View style={styles.sleepLegendItem}>
                    <View
                      style={[styles.sleepLegendDot, styles.sleepTrackYellow]}
                    />
                    <Text style={styles.sleepLegendText}>10-24</Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.sleepZoneBadge,
                    sleepZone
                      ? { backgroundColor: sleepZone.background }
                      : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.sleepZoneBadgeText,
                      sleepZone ? { color: sleepZone.color } : null,
                    ]}
                  >
                    {sleepZone?.label ?? 'Выбери часы сна на шкале'}
                  </Text>
                </View>
              </View>

              <View style={styles.sleepQualityCard}>
                <Text style={styles.sleepQualityLabel}>Качество сна</Text>
                <View style={styles.sleepQualityRow}>
                  {SLEEP_QUALITY_OPTIONS.map(option => {
                    const selected = sleepQuality === option.value;
                    const palette = sleepQualityPalette(option.value);
                    return (
                      <Pressable
                        key={option.value}
                        style={[
                          styles.sleepQualityOption,
                          { borderColor: palette.main },
                          selected
                            ? {
                                borderColor: palette.main,
                                backgroundColor: palette.main,
                              }
                            : null,
                          selected && styles.sleepQualityOptionActive,
                        ]}
                        onPress={() => setSleepQuality(option.value)}
                      >
                        <View
                          style={[
                            styles.sleepQualityStripe,
                            {
                              backgroundColor: selected
                                ? palette.main
                                : palette.soft,
                            },
                          ]}
                        />
                        <Text
                          style={[
                            styles.sleepQualityValue,
                            { color: palette.main },
                            selected && {
                              color: sleepQualitySelectedTextColor(
                                option.value,
                              ),
                            },
                          ]}
                        >
                          {option.value}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.sleepQualityHint}>{sleepQualityLabel}</Text>
              </View>
            </Card>
          </Reveal>

          <Reveal delay={160}>
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Стресс и энергия</Text>
              <View style={styles.levelCard}>
                <Text style={styles.levelLabel}>Уровень стресса</Text>
                <View style={styles.levelRow}>
                  {LEVEL_OPTIONS.map(option => {
                    const selected = stressLevel === option;
                    const palette = sleepQualityPalette(option);
                    return (
                      <Pressable
                        key={`stress-${option}`}
                        style={[
                          styles.levelOption,
                          { borderColor: palette.main },
                          selected
                            ? {
                                borderColor: palette.main,
                                backgroundColor: palette.main,
                              }
                            : null,
                        ]}
                        onPress={() => setStressLevel(option)}
                      >
                        <Text
                          style={[
                            styles.levelValue,
                            { color: palette.main },
                            selected && {
                              color: sleepQualitySelectedTextColor(option),
                            },
                          ]}
                        >
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.levelCard}>
                <Text style={styles.levelLabel}>Раздражительность</Text>
                <View style={styles.levelRow}>
                  {LEVEL_OPTIONS.map(option => {
                    const selected = irritability === option;
                    const palette = sleepQualityPalette(option);
                    return (
                      <Pressable
                        key={`irritability-${option}`}
                        style={[
                          styles.levelOption,
                          { borderColor: palette.main },
                          selected
                            ? {
                                borderColor: palette.main,
                                backgroundColor: palette.main,
                              }
                            : null,
                        ]}
                        onPress={() => setIrritability(option)}
                      >
                        <Text
                          style={[
                            styles.levelValue,
                            { color: palette.main },
                            selected && {
                              color: sleepQualitySelectedTextColor(option),
                            },
                          ]}
                        >
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.levelCard}>
                <Text style={styles.levelLabel}>Энергия</Text>
                <View style={styles.levelRow}>
                  {LEVEL_OPTIONS.map(option => {
                    const selected = energy === option;
                    const palette = sleepQualityPalette(option);
                    return (
                      <Pressable
                        key={`energy-${option}`}
                        style={[
                          styles.levelOption,
                          { borderColor: palette.main },
                          selected
                            ? {
                                borderColor: palette.main,
                                backgroundColor: palette.main,
                              }
                            : null,
                        ]}
                        onPress={() => setEnergy(option)}
                      >
                        <Text
                          style={[
                            styles.levelValue,
                            { color: palette.main },
                            selected && {
                              color: sleepQualitySelectedTextColor(option),
                            },
                          ]}
                        >
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </Card>
          </Reveal>
        </>
      ) : null}

      <Reveal delay={240}>
        <Card style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Цикл и ПМС</Text>
            {hasCycleProfile && !setupMode ? (
              <Pressable onPress={openCycleSetup} style={styles.sectionAction}>
                <Text style={styles.sectionActionText}>Изменить параметры</Text>
              </Pressable>
            ) : null}
          </View>

          {setupMode ? (
            <View style={styles.setupCard}>
              <Text style={styles.setupTitle}>Перед началом настрой цикл</Text>
              <Text style={styles.setupHint}>
                Это нужно только один раз. Прогноз будет считаться по твоим
                параметрам, а не по стандартным значениям.
              </Text>
              <Pressable
                style={styles.setupDateRow}
                onPress={openPeriodStartPicker}
              >
                <Text style={styles.setupDateLabel}>
                  Предположительное начало менструации
                </Text>
                <Text style={styles.setupDateValue}>
                  {draftPeriodStart
                    ? formatShortDate(toDayKey(draftPeriodStart))
                    : 'Выбрать дату'}
                </Text>
              </Pressable>
              <SelectRow
                label="Средняя длина цикла"
                value={draftCycleLength}
                options={cycleLengthOptions}
                suffix="дней"
                pickerMode="wheel"
                onChange={setDraftCycleLength}
              />
              <SelectRow
                label="Длительность менструации"
                value={draftPeriodLength}
                options={periodLengthOptions}
                suffix="дней"
                pickerMode="wheel"
                onChange={setDraftPeriodLength}
              />
              <PrimaryButton
                label="Сохранить и открыть календарь"
                onPress={onSaveCycleProfile}
              />
              {hasCycleProfile ? (
                <Pressable
                  onPress={cancelCycleSetup}
                  style={styles.setupSecondaryButton}
                >
                  <Text style={styles.setupSecondaryText}>Отмена</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {!isCalendarReady ? (
            <Text style={styles.smallHint}>
              Календарь откроется после сохранения параметров цикла.
            </Text>
          ) : null}

          {isCalendarReady ? (
            <>
              <View style={styles.cycleMetaWrap}>
                <View style={styles.cycleMetaPill}>
                  <Text style={styles.cycleMetaLabel}>День цикла</Text>
                  <Text style={styles.cycleMetaValue}>{cycleDay ?? '—'}</Text>
                </View>
                <View style={styles.cycleMetaPill}>
                  <Text style={styles.cycleMetaLabel}>
                    Следующая менструация
                  </Text>
                  <Text style={styles.cycleMetaValue}>{nextPeriodText}</Text>
                </View>
              </View>

              <View style={styles.calendarHeader}>
                <Pressable
                  style={styles.monthNavButton}
                  onPress={() => goMonth(-1)}
                >
                  <Text style={styles.monthNavText}>‹</Text>
                </Pressable>
                <Text style={styles.monthTitle}>
                  {monthLabel(displayMonth)} {displayMonth.getFullYear()}
                </Text>
                <Pressable
                  style={styles.monthNavButton}
                  onPress={() => goMonth(1)}
                >
                  <Text style={styles.monthNavText}>›</Text>
                </Pressable>
              </View>

              <View style={styles.rangeHintRow}>
                <View style={styles.modeTabs}>
                  <Pressable
                    style={[
                      styles.modeTab,
                      markMode === 'period' && styles.modeTabActive,
                    ]}
                    onPress={() => selectMarkMode('period')}
                  >
                    <Text
                      style={[
                        styles.modeTabText,
                        markMode === 'period' && styles.modeTabTextActive,
                      ]}
                    >
                      Менструация
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.modeTab,
                      markMode === 'pregnancy' && styles.modeTabActive,
                    ]}
                    onPress={() => selectMarkMode('pregnancy')}
                  >
                    <Text
                      style={[
                        styles.modeTabText,
                        markMode === 'pregnancy' && styles.modeTabTextActive,
                      ]}
                    >
                      Беременность
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.rangeHintRow}>
                <Text style={styles.rangeHint}>
                  {markMode === 'pregnancy'
                    ? 'Режим беременности: тап по дню — отметить или убрать.'
                    : rangeStart === null
                    ? 'Выбор периода: 1 тап — начало, 2 тап — конец.'
                    : `Начало выбрано: ${formatShortDate(
                        rangeStart,
                      )}. Выбери день окончания.`}
                </Text>
                {markMode === 'period' && rangeStart !== null ? (
                  <Pressable onPress={cancelRange} style={styles.rangeCancel}>
                    <Text style={styles.rangeCancelText}>Сбросить</Text>
                  </Pressable>
                ) : null}
              </View>
              <Text style={styles.smallHint}>
                {markMode === 'pregnancy'
                  ? 'Отметка беременности не влияет на расчёт цикла, но сохраняется в календаре.'
                  : 'Долгий тап по дню — убрать/вернуть один день вручную.'}
              </Text>

              <View style={styles.weekRow}>
                {WEEKDAYS.map(day => (
                  <Text key={day} style={styles.weekDay}>
                    {day}
                  </Text>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {calendarDays.map(day => {
                  const isToday = day.key === todayKey;
                  const isPeriod = cycleSet.has(day.key);
                  const isPregnancy = pregnancySet.has(day.key) && !isPeriod;
                  const isPredicted =
                    cycleForecast.periodSet.has(day.key) &&
                    !isPeriod &&
                    !isPregnancy;
                  const isFertile = cycleForecast.fertileSet.has(day.key);
                  const isOvulation = cycleForecast.ovulationSet.has(day.key);
                  return (
                    <Pressable
                      key={day.key}
                      style={styles.dayWrap}
                      disabled={!day.inMonth}
                      onPress={() => onSelectRangeDay(day.key)}
                      onLongPress={() => onClearSingleDay(day.key)}
                    >
                      <View
                        style={[
                          styles.dayPill,
                          !day.inMonth && styles.dayPillMuted,
                          isPeriod && styles.dayPillPeriod,
                          isPregnancy && styles.dayPillPregnancy,
                          isPredicted && styles.dayPillPredicted,
                          rangeStart === day.key && styles.dayPillRangeStart,
                          isToday && styles.dayPillToday,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            !day.inMonth && styles.dayTextMuted,
                            (isPeriod || isPredicted || isPregnancy) &&
                              styles.dayTextOnAccent,
                          ]}
                        >
                          {day.day}
                        </Text>
                      </View>
                      {isOvulation ? (
                        <View style={styles.ovulationDot} />
                      ) : null}
                      {!isOvulation && isFertile ? (
                        <View style={styles.fertileDot} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.legendWrap}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendSwatch, styles.legendPeriod]} />
                  <Text style={styles.legendText}>Менструация</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendSwatch, styles.legendPredicted]} />
                  <Text style={styles.legendText}>Прогноз</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={styles.legendDot} />
                  <Text style={styles.legendText}>Фертильное окно</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={styles.legendOvulation} />
                  <Text style={styles.legendText}>Овуляция</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={styles.legendPregnancy} />
                  <Text style={styles.legendText}>Беременность</Text>
                </View>
              </View>

              <Text style={styles.smallHint}>{cycleStatsText}</Text>
              <Text style={styles.smallHint}>
                Овуляция рассчитывается ориентировочно (модель приложения,
                лютеиновая фаза ~17 дней).
              </Text>
              <Text style={styles.smallHint}>
                Это ориентировочный календарь и не метод контрацепции.
              </Text>
            </>
          ) : null}
        </Card>
      </Reveal>

      {!showCalendarOnly ? (
        <>
          <Reveal delay={320}>
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Привычки</Text>
              <View style={styles.habitCard}>
                <Text style={styles.habitLabel}>Белок сегодня (г)</Text>
                <TextInput
                  value={proteinScore === null ? '' : String(proteinScore)}
                  onChangeText={text => {
                    const digits = text.replace(/[^\d]/g, '').slice(0, 4);
                    if (digits.length === 0) {
                      setProteinScore(null);
                      return;
                    }
                    setProteinScore(Number(digits));
                  }}
                  placeholder="Например, 90"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  style={styles.habitInput}
                />
              </View>

              <View style={styles.habitCard}>
                <Text style={styles.habitLabel}>Силовая тренировка</Text>
                <View style={styles.trainingRow}>
                  <Pressable
                    style={[
                      styles.trainingOption,
                      strengthSession === 1 && styles.trainingOptionActive,
                    ]}
                    onPress={() => setStrengthSession(1)}
                  >
                    <Text
                      style={[
                        styles.trainingOptionText,
                        strengthSession === 1 &&
                          styles.trainingOptionTextActive,
                      ]}
                    >
                      Была
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.trainingOption,
                      strengthSession === 0 && styles.trainingOptionActive,
                      styles.trainingOptionLast,
                    ]}
                    onPress={() => setStrengthSession(0)}
                  >
                    <Text
                      style={[
                        styles.trainingOptionText,
                        strengthSession === 0 &&
                          styles.trainingOptionTextActive,
                      ]}
                    >
                      Не было
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Card>
          </Reveal>

          <Reveal delay={380}>
            <PrimaryButton
              label={saved ? 'Сохранено' : 'Сохранить'}
              onPress={onSave}
              icon={saved ? '✓' : '›'}
            />
          </Reveal>
        </>
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal
          visible={periodStartPickerVisible}
          transparent
          animationType="slide"
          onRequestClose={closePeriodStartPicker}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Pressable onPress={closePeriodStartPicker}>
                  <Text style={styles.modalAction}>Отмена</Text>
                </Pressable>
                <Text style={styles.modalTitle}>Дата начала</Text>
                <Pressable onPress={confirmPeriodStartPicker}>
                  <Text style={styles.modalAction}>Готово</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={periodStartPickerValue}
                mode="date"
                display="spinner"
                onChange={(_, date) => {
                  if (date) {
                    setPeriodStartPickerValue(startOfDayDate(date));
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      ) : null}

      {Platform.OS !== 'ios' && periodStartPickerVisible ? (
        <DateTimePicker
          value={periodStartPickerValue}
          mode="date"
          display="default"
          onChange={(_, date) => {
            if (date) {
              const normalized = startOfDayDate(date);
              setPeriodStartPickerValue(normalized);
              setDraftPeriodStart(normalized);
            }
            setPeriodStartPickerVisible(false);
          }}
        />
      ) : null}
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
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.muted,
    marginBottom: spacing.lg,
  },
  heroCard: {
    backgroundColor: colors.cardTeal,
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
  section: {
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    color: colors.text,
  },
  sectionAction: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionActionText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    color: colors.accent,
  },
  sleepRangeCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sleepRangeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sleepRangeLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
  },
  sleepRangeValue: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  sleepTrackWrap: {
    height: 48,
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  sleepTrackBase: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  sleepGradientSegment: {
    flex: 1,
    height: '100%',
  },
  sleepTrackRed: {
    backgroundColor: '#E1002A',
  },
  sleepTrackGreen: {
    backgroundColor: '#4C947A',
  },
  sleepTrackYellow: {
    backgroundColor: '#FFD60A',
  },
  sleepTrackGrid: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  sleepTrackDivider: {
    flex: 1,
    height: 10,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.6)',
  },
  sleepTrackDividerMajor: {
    borderRightWidth: 2,
    borderRightColor: '#FFFFFF',
  },
  sleepTrackTouchLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -12,
    bottom: -12,
    flexDirection: 'row',
  },
  sleepTrackTouchStep: {
    flex: 1,
  },
  sleepTrackThumb: {
    position: 'absolute',
    top: '50%',
    marginTop: -11,
    marginLeft: -2,
    width: 4,
    height: 22,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.surface,
    backgroundColor: colors.text,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  sleepTicksTrack: {
    height: 20,
    position: 'relative',
    marginBottom: spacing.xs,
  },
  sleepTickText: {
    position: 'absolute',
    top: 0,
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.muted,
  },
  sleepTickStart: {
    left: 0,
  },
  sleepTickAt6: {
    left: '25%',
    marginLeft: -4,
  },
  sleepTickAt9: {
    left: '37.5%',
    marginLeft: -4,
  },
  sleepTickEnd: {
    right: 0,
  },
  sleepDragHint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  sleepLegendRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  sleepLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  sleepLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  sleepLegendText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.muted,
  },
  sleepZoneBadge: {
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  sleepZoneBadgeText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    color: colors.muted,
  },
  sleepQualityCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
  },
  sleepQualityLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  sleepQualityRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: spacing.xs,
  },
  sleepQualityOption: {
    flex: 1,
    height: 58,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 3,
    overflow: 'hidden',
  },
  sleepQualityOptionActive: {
    transform: [{ scale: 1.06 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 2,
  },
  sleepQualityStripe: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 7,
  },
  sleepQualityValue: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
  },
  sleepQualityValueActive: {
    color: colors.surface,
  },
  sleepQualityHint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.muted,
    textAlign: 'center',
  },
  levelCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  levelLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  levelOption: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 3,
  },
  levelValue: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
  },
  habitCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  habitLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  habitInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  trainingRow: {
    flexDirection: 'row',
  },
  trainingOption: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  trainingOptionLast: {
    marginRight: 0,
  },
  trainingOptionActive: {
    borderColor: colors.primaryDeep,
    backgroundColor: colors.accentSoft,
  },
  trainingOptionText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    color: colors.muted,
  },
  trainingOptionTextActive: {
    color: colors.text,
  },
  setupCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  setupTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  setupHint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  setupDateRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  setupDateLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
  },
  setupDateValue: {
    marginTop: spacing.xs,
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  setupSecondaryButton: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  setupSecondaryText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  cycleMetaWrap: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  cycleMetaPill: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
  },
  cycleMetaLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.muted,
  },
  cycleMetaValue: {
    marginTop: 2,
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  monthNavButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  monthNavText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    color: colors.accent,
    marginTop: -2,
  },
  monthTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    color: colors.text,
    textTransform: 'capitalize',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  weekDay: {
    width: '13.6%',
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.muted,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  dayWrap: {
    width: '14.28%',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dayPill: {
    width: 40,
    height: 30,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayPillMuted: {
    opacity: 0.35,
  },
  dayPillPeriod: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  dayPillPregnancy: {
    backgroundColor: '#C4B5FD',
    borderColor: '#A78BFA',
  },
  dayPillPredicted: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    borderStyle: 'dashed',
  },
  dayPillToday: {
    borderColor: colors.primaryDeep,
    borderWidth: 2,
  },
  dayPillRangeStart: {
    borderColor: colors.accent,
    borderWidth: 2,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.24,
    shadowRadius: 6,
    elevation: 2,
  },
  dayText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  dayTextMuted: {
    color: colors.muted,
  },
  dayTextOnAccent: {
    color: colors.surface,
  },
  fertileDot: {
    marginTop: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  ovulationDot: {
    marginTop: 3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8B5CF6',
  },
  legendWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
    marginBottom: spacing.xs,
  },
  legendSwatch: {
    width: 16,
    height: 10,
    borderRadius: 6,
    marginRight: spacing.xs,
  },
  legendPeriod: {
    backgroundColor: colors.accent,
  },
  legendPredicted: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginRight: spacing.xs,
  },
  legendOvulation: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8B5CF6',
    marginRight: spacing.xs,
  },
  legendPregnancy: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#A78BFA',
    marginRight: spacing.xs,
  },
  legendText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.muted,
  },
  modeTabs: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  modeTab: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: colors.surfaceAlt,
    marginRight: spacing.xs,
  },
  modeTabActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  modeTabText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    color: colors.muted,
  },
  modeTabTextActive: {
    color: colors.accent,
  },
  rangeHintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  rangeHint: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.muted,
    marginRight: spacing.sm,
  },
  rangeCancel: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.surfaceAlt,
  },
  rangeCancelText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    color: colors.accent,
  },
  smallHint: {
    marginTop: spacing.xs,
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.muted,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  modalAction: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    color: colors.accent,
  },
});
