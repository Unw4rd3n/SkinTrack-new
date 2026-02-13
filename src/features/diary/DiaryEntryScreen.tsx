import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, fontSizes, fonts, radii, spacing } from '../../app/theme';
import { MainStackParamList } from '../../app/navigation/types';
import { Screen } from '../ui/Screen';
import { Card } from '../ui/Card';
import { SelectRow } from '../ui/SelectRow';
import { PrimaryButton } from '../ui/PrimaryButton';
import { Reveal } from '../ui/Reveal';
import { deleteEntryByDate, getEntryByDate, upsertEntry } from '../../data/repos/dailyEntriesRepo';
import { formatRelativeDate, formatShortDate } from '../../services/date';
import { trackEvent } from '../../services/analytics';

type Props = NativeStackScreenProps<MainStackParamList, 'DiaryEntry'>;

type MetricKey = 'dryness' | 'oiliness' | 'acne' | 'stress' | 'sleep' | 'water';

const metrics: {
  key: MetricKey;
  label: string;
  options: number[];
  suffix?: string;
}[] = [
  { key: 'dryness', label: 'Сухость', options: [0, 1, 2, 3, 4, 5] },
  { key: 'oiliness', label: 'Жирность', options: [0, 1, 2, 3, 4, 5] },
  { key: 'acne', label: 'Высыпания', options: [0, 1, 2, 3, 4, 5] },
  { key: 'stress', label: 'Стресс', options: [0, 1, 2, 3, 4, 5] },
  { key: 'sleep', label: 'Сон', options: Array.from({ length: 13 }, (_, i) => i), suffix: 'часов' },
  { key: 'water', label: 'Вода', options: Array.from({ length: 13 }, (_, i) => i), suffix: 'стаканов' },
];

export function DiaryEntryScreen({ route, navigation }: Props) {
  const { entryDate } = route.params;
  const [values, setValues] = useState<Record<MetricKey, number | null>>({
    dryness: null,
    oiliness: null,
    acne: null,
    stress: null,
    sleep: null,
    water: null,
  });
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exists, setExists] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const load = async () => {
      const entry = await getEntryByDate(entryDate);
      if (!entry) {
        setExists(false);
        setValues({
          dryness: null,
          oiliness: null,
          acne: null,
          stress: null,
          sleep: null,
          water: null,
        });
        setNote('');
        setLoaded(true);
        return;
      }

      setExists(true);
      setValues({
        dryness: entry.dryness ?? null,
        oiliness: entry.oiliness ?? null,
        acne: entry.acneLevel ?? null,
        stress: entry.stress ?? null,
        sleep: entry.sleepHours ?? null,
        water: entry.waterIntake ?? null,
      });
      setNote(entry.note ?? '');
      setLoaded(true);
    };

    load();
  }, [entryDate]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const filledCount = metrics.filter(metric => values[metric.key] !== null).length;
  const percentValue = Math.round((filledCount / metrics.length) * 100);
  const dateTitle = useMemo(() => {
    return `${formatRelativeDate(entryDate)} · ${formatShortDate(entryDate)}`;
  }, [entryDate]);

  const setMetric = (key: MetricKey, value: number) => {
    setValues(current => ({ ...current, [key]: value }));
  };

  const onSave = async () => {
    await upsertEntry({
      entryDate,
      dryness: values.dryness ?? undefined,
      oiliness: values.oiliness ?? undefined,
      acneLevel: values.acne ?? undefined,
      stress: values.stress ?? undefined,
      sleepHours: values.sleep ?? undefined,
      waterIntake: values.water ?? undefined,
      note: note.trim() || undefined,
    });
    setExists(true);
    trackEvent('update_diary_entry', { entryDate, filledCount });
    setSaved(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => setSaved(false), 1800);
  };

  const onDelete = () => {
    if (deleting) {
      return;
    }
    Alert.alert('Удалить запись?', 'Действие нельзя отменить.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          await deleteEntryByDate(entryDate);
          trackEvent('delete_diary_entry', { entryDate });
          setDeleting(false);
          navigation.goBack();
        },
      },
    ]);
  };

  if (!loaded) {
    return (
      <Screen scroll>
        <Text style={styles.title}>Загрузка...</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.kicker}>Дневник</Text>
          <Text style={styles.title}>{dateTitle}</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>
        {exists
          ? 'Здесь можно посмотреть запись полностью и изменить значения.'
          : 'Заполни день вручную: после сохранения запись появится в календаре.'}
      </Text>

      <Reveal>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Заполнено</Text>
          <View style={styles.heroRow}>
            <Text style={styles.heroPercent}>{percentValue}%</Text>
            <Text style={styles.heroHint}>{filledCount}/{metrics.length} параметров</Text>
          </View>
        </View>
      </Reveal>

      <Reveal delay={100}>
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Показатели</Text>
          {metrics.map(metric => (
            <SelectRow
              key={metric.key}
              label={metric.label}
              value={values[metric.key]}
              options={metric.options}
              suffix={metric.suffix}
              onChange={value => setMetric(metric.key, value)}
            />
          ))}
        </Card>
      </Reveal>

      <Reveal delay={180}>
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Заметка</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Например: кожа спокойнее после мягкого очищения"
            placeholderTextColor={colors.muted}
            style={styles.note}
            multiline
          />
        </Card>
      </Reveal>

      <Reveal delay={240}>
        <PrimaryButton
          label={
            saved
              ? 'Сохранено'
              : exists
              ? 'Сохранить изменения'
              : 'Сохранить день'
          }
          onPress={onSave}
          icon={saved ? '✓' : '›'}
        />
      </Reveal>
      {exists ? (
        <Reveal delay={300}>
          <Pressable style={styles.deleteButton} onPress={onDelete}>
            <Text style={styles.deleteButtonText}>
              {deleting ? 'Удаляем...' : 'Удалить запись'}
            </Text>
          </Pressable>
        </Reveal>
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
    fontSize: fontSizes.xl,
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
  },
  heroTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroPercent: {
    fontFamily: fonts.heading,
    fontSize: 42,
    color: colors.text,
  },
  heroHint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.muted,
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
  note: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.lg,
    padding: spacing.md,
    minHeight: 90,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    textAlignVertical: 'top',
  },
  deleteButton: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  deleteButtonText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    color: colors.danger,
  },
});
