import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fontSizes, fonts, radii, spacing } from '../../app/theme';
import { Screen } from '../ui/Screen';
import { Card } from '../ui/Card';
import { PrimaryButton } from '../ui/PrimaryButton';
import { Reveal } from '../ui/Reveal';
import { formatShortDate, toDayKey } from '../../services/date';
import { addLabResult, classifyLab, getLabResults } from '../../data/repos/labsRepo';
import { trackEvent } from '../../services/analytics';

const presets = [
  'Ферритин',
  'Витамин D (25-OH)',
  'ТТГ',
  'Эстрадиол',
  'Тестостерон',
  'ДГЭА-С',
  'Пролактин',
  'Витамин B12',
  'Цинк',
];

export function LabsScreen() {
  const todayKey = useMemo(() => toDayKey(new Date()), []);
  const [results, setResults] = useState<
    {
      id: string;
      name: string;
      value: number;
      unit?: string;
      refLow?: number;
      refHigh?: number;
      entryDate: number;
      note?: string;
    }[]
  >([]);
  const [name, setName] = useState(presets[0]);
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');
  const [refLow, setRefLow] = useState('');
  const [refHigh, setRefHigh] = useState('');
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const dateLabel = formatShortDate(todayKey);

  const load = useCallback(async () => {
    const data = await getLabResults();
    setResults(
      data.map(item => ({
        id: item.id,
        name: item.name,
        value: item.value,
        unit: item.unit ?? undefined,
        refLow: item.refLow ?? undefined,
        refHigh: item.refHigh ?? undefined,
        entryDate: item.entryDate,
        note: item.note ?? undefined,
      })),
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onSave = async () => {
    const parsed = Number(value.replace(',', '.'));
    if (!Number.isFinite(parsed)) {
      return;
    }

    await addLabResult({
      entryDate: todayKey,
      name,
      value: parsed,
      unit: unit.trim() || undefined,
      refLow: refLow ? Number(refLow.replace(',', '.')) : undefined,
      refHigh: refHigh ? Number(refHigh.replace(',', '.')) : undefined,
      note: note.trim() || undefined,
    });
    setValue('');
    setUnit('');
    setRefLow('');
    setRefHigh('');
    setNote('');
    setSaved(true);
    trackEvent('save_lab_result', { name, hasRef: Boolean(refLow || refHigh) });
    await load();
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <Screen scroll>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.kicker}>Анализы</Text>
          <Text style={styles.title}>Гормоны и нутриенты</Text>
        </View>
        <View style={styles.datePill}>
          <Text style={styles.dateText}>{dateLabel}</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>
        Добавляй результаты анализов и связывай их с состоянием кожи.
      </Text>

      <Reveal>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Личная лаборатория</Text>
          <Text style={styles.heroText}>
            Всего записей: {results.length}. Добавляй новые значения, чтобы видеть тренд.
          </Text>
        </View>
      </Reveal>

      <Reveal delay={80}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Добавить результат</Text>
          <View style={styles.presetRow}>
            {presets.map(item => (
              <Pressable
                key={item}
                style={[styles.presetChip, name === item && styles.presetChipActive]}
                onPress={() => setName(item)}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    name === item && styles.presetChipTextActive,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.inputRow}>
            <TextInput
              value={value}
              onChangeText={setValue}
              placeholder="Значение"
              placeholderTextColor={colors.muted}
              style={styles.input}
              keyboardType="numeric"
            />
            <TextInput
              value={unit}
              onChangeText={setUnit}
              placeholder="Ед."
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.inputSmall]}
            />
          </View>

          <View style={styles.inputRow}>
            <TextInput
              value={refLow}
              onChangeText={setRefLow}
              placeholder="Нижний реф."
              placeholderTextColor={colors.muted}
              style={styles.input}
              keyboardType="numeric"
            />
            <TextInput
              value={refHigh}
              onChangeText={setRefHigh}
              placeholder="Верхний реф."
              placeholderTextColor={colors.muted}
              style={styles.input}
              keyboardType="numeric"
            />
          </View>

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Заметка: как чувствует себя кожа"
            placeholderTextColor={colors.muted}
            style={styles.note}
            multiline
          />
        </Card>
      </Reveal>

      <Reveal delay={120}>
        <PrimaryButton
          label={saved ? 'Сохранено' : 'Сохранить результат'}
          onPress={onSave}
          icon={saved ? '✓' : '›'}
        />
      </Reveal>

      <Reveal delay={200}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Последние результаты</Text>
          {results.length === 0 ? (
            <Text style={styles.sectionText}>Пока нет сохранённых анализов.</Text>
          ) : (
            results.map(item => {
              const status = classifyLab(item.value, item.refLow, item.refHigh);
              return (
                <View key={item.id} style={styles.resultRow}>
                  <View>
                    <Text style={styles.resultName}>{item.name}</Text>
                    <Text style={styles.resultDate}>{formatShortDate(item.entryDate)}</Text>
                  </View>
                  <View style={styles.resultRight}>
                    <Text style={styles.resultValue}>
                      {item.value} {item.unit ?? ''}
                    </Text>
                    <Text
                      style={[
                        styles.resultStatus,
                        status === 'low' && styles.statusLow,
                        status === 'high' && styles.statusHigh,
                        status === 'normal' && styles.statusNormal,
                      ]}
                    >
                      {status === 'low'
                        ? 'Ниже реф.'
                        : status === 'high'
                        ? 'Выше реф.'
                        : status === 'normal'
                        ? 'В норме'
                        : 'Без реф.'}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </Card>
      </Reveal>

      <Reveal delay={280}>
        <Card style={styles.section} tone="soft">
          <Text style={styles.sectionTitle}>Подсказка</Text>
          <Text style={styles.sectionText}>
            Это не диагноз. Если показатель вне референса, обсуди результат со специалистом и
            отмечай, как меняется кожа — так динамика будет полезнее.
          </Text>
        </Card>
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
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  presetChip: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceAlt,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  presetChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  presetChipText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  presetChipTextActive: {
    color: colors.text,
  },
  inputRow: {
    flexDirection: 'row',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.body,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  inputSmall: {
    flex: 0.6,
    marginRight: 0,
  },
  note: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.sm,
    color: colors.text,
    fontFamily: fonts.body,
    textAlignVertical: 'top',
    backgroundColor: colors.surfaceAlt,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultName: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  resultDate: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  resultRight: {
    alignItems: 'flex-end',
  },
  resultValue: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  resultStatus: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  statusLow: {
    color: colors.danger,
  },
  statusHigh: {
    color: colors.danger,
  },
  statusNormal: {
    color: colors.success,
  },
});
