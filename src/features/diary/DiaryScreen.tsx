import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fontSizes, fonts, spacing } from '../../app/theme';
import { Screen } from '../ui/Screen';
import { Card } from '../ui/Card';
import { Reveal } from '../ui/Reveal';
import { getAllEntries } from '../../data/repos/dailyEntriesRepo';
import { formatRelativeDate, toDayKey } from '../../services/date';
import { MainStackParamList } from '../../app/navigation/types';

export function DiaryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [entries, setEntries] = useState<
    { id: string; date: string; summary: string; entryDate: number }[]
  >([]);
  const [summary, setSummary] = useState({ streak: 0, total: 0 });

  const load = useCallback(async () => {
    const data = await getAllEntries();
    const daySet = new Set(data.map(item => item.entryDate));
    const todayKey = toDayKey(new Date());
    let streak = 0;
    for (let offset = 0; offset < 365; offset += 1) {
      const key = todayKey - offset * 24 * 60 * 60 * 1000;
      if (daySet.has(key)) {
        streak += 1;
      } else {
        break;
      }
    }
    setSummary({ streak, total: data.length });

    const mapped = data.map(item => {
      const parts = [];
      if (item.dryness !== undefined) parts.push(`Сухость ${item.dryness}`);
      if (item.acneLevel !== undefined) parts.push(`Высыпания ${item.acneLevel}`);
      if (item.sleepHours !== undefined) parts.push(`Сон ${item.sleepHours}ч`);
      if (item.waterIntake !== undefined) parts.push(`Вода ${item.waterIntake}`);
      const entrySummary = parts.length > 0 ? parts.join(' · ') : 'Запись без метрик';
      return {
        id: item.id,
        date: formatRelativeDate(item.entryDate),
        summary: entrySummary,
        entryDate: item.entryDate,
      };
    });
    setEntries(mapped);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <Screen scroll>
      <Text style={styles.title}>Журнал кожи</Text>
      <Text style={styles.subtitle}>Лента твоих ежедневных чек-инов.</Text>
      <Pressable
        style={styles.calendarButton}
        onPress={() => navigation.navigate('DiaryCalendar')}
      >
        <Text style={styles.calendarButtonText}>Открыть календарь записей</Text>
      </Pressable>

      <Reveal>
        <Card style={styles.summaryCard} tone="soft">
          <Text style={styles.summaryTitle}>Моя серия</Text>
          <Text style={styles.summarySubtitle}>
            Маленькие ритуалы каждый день дают заметный результат.
          </Text>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryValue}>{summary.streak}</Text>
              <Text style={styles.summaryHint}>дней подряд</Text>
            </View>
            <View>
              <Text style={styles.summaryValue}>{summary.total}</Text>
              <Text style={styles.summaryHint}>всего записей</Text>
            </View>
          </View>
        </Card>
      </Reveal>

      {entries.length === 0 ? (
        <Reveal delay={120}>
          <Card>
            <Text style={styles.cardTitle}>Пока нет записей</Text>
            <Text style={styles.cardText}>Заполни чек‑ин на вкладке “Сегодня”.</Text>
          </Card>
        </Reveal>
      ) : (
        entries.map((entry, index) => (
          <Reveal key={entry.id} delay={120 + index * 40}>
            <Pressable
              onPress={() => navigation.navigate('DiaryEntry', { entryDate: entry.entryDate })}
              style={styles.cardPressable}
            >
              <Card style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <View style={styles.dot} />
                    <Text style={styles.cardTitle}>{entry.date}</Text>
                  </View>
                  <Text style={styles.cardChevron}>›</Text>
                </View>
                <Text style={styles.cardText}>{entry.summary}</Text>
                <Text style={styles.cardHint}>Нажми, чтобы открыть и отредактировать</Text>
              </Card>
            </Pressable>
          </Reveal>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xl,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  calendarButton: {
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  calendarButtonText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    color: colors.primaryDeep,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardPressable: {
    borderRadius: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    marginRight: spacing.sm,
  },
  cardTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.muted,
  },
  cardChevron: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    color: colors.accent,
    marginTop: -2,
  },
  cardHint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.muted,
    marginTop: spacing.sm,
  },
  summaryCard: {
    marginBottom: spacing.md,
  },
  summaryTitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  summarySubtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  summaryValue: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xl,
    color: colors.text,
  },
  summaryHint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
});
