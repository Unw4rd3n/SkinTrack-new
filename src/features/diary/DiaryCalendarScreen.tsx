import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../app/navigation/types';
import { useI18n } from '../../app/localization';
import { colors, fontSizes, fonts, spacing } from '../../app/theme';
import { getAllEntries } from '../../data/repos/dailyEntriesRepo';
import { toDayKey } from '../../services/date';
import { Screen } from '../ui/Screen';
import { Card } from '../ui/Card';

function addMonths(base: Date, delta: number) {
  return new Date(base.getFullYear(), base.getMonth() + delta, 1);
}

function buildCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (firstDay.getDay() + 6) % 7;

  const days: { date: Date; inMonth: boolean }[] = [];

  for (let index = firstWeekday - 1; index >= 0; index -= 1) {
    const date = new Date(year, month, -index);
    days.push({ date, inMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({ date: new Date(year, month, day), inMonth: true });
  }

  while (days.length % 7 !== 0 || days.length < 42) {
    const nextDay = new Date(year, month, daysInMonth + (days.length - firstWeekday - daysInMonth) + 1);
    days.push({ date: nextDay, inMonth: false });
  }

  return days;
}

export function DiaryCalendarScreen() {
  const { t } = useI18n();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [monthDate, setMonthDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [entryDays, setEntryDays] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    const entries = await getAllEntries();
    setEntryDays(new Set(entries.map(item => item.entryDate)));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const monthLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('ru-RU', {
        month: 'long',
        year: 'numeric',
      }).format(monthDate);
    } catch {
      return `${monthDate.getMonth() + 1}.${monthDate.getFullYear()}`;
    }
  }, [monthDate]);

  const days = useMemo(() => buildCalendarDays(monthDate), [monthDate]);
  const todayKey = toDayKey(new Date());

  return (
    <Screen scroll>
      <Text style={styles.title}>{t('diary.calendar.title')}</Text>
      <Text style={styles.subtitle}>{t('diary.calendar.subtitle')}</Text>

      <Card style={styles.calendarCard}>
        <View style={styles.headerRow}>
          <Pressable
            style={styles.navButton}
            onPress={() => setMonthDate(current => addMonths(current, -1))}
          >
            <Text style={styles.navButtonText}>‹</Text>
          </Pressable>
          <Text style={styles.monthTitle}>{monthLabel}</Text>
          <Pressable
            style={styles.navButton}
            onPress={() => setMonthDate(current => addMonths(current, 1))}
          >
            <Text style={styles.navButtonText}>›</Text>
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
            <Text key={day} style={styles.weekday}>
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {days.map(({ date, inMonth }) => {
            const dayKey = toDayKey(date);
            const isToday = dayKey === todayKey;
            const hasEntry = entryDays.has(dayKey);
            const dayNumber = date.getDate();
            return (
              <Pressable
                key={`${date.getFullYear()}-${date.getMonth()}-${dayNumber}`}
                style={[
                  styles.dayCell,
                  !inMonth && styles.dayCellMuted,
                  isToday && styles.dayCellToday,
                  hasEntry && styles.dayCellFilled,
                ]}
                onPress={() => navigation.navigate('DiaryEntry', { entryDate: dayKey })}
              >
                <Text
                  style={[
                    styles.dayText,
                    !inMonth && styles.dayTextMuted,
                    hasEntry && styles.dayTextFilled,
                  ]}
                >
                  {dayNumber}
                </Text>
                {hasEntry ? <View style={styles.dayDot} /> : null}
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.hint}>{t('diary.calendar.hint')}</Text>
      </Card>
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
    marginBottom: spacing.lg,
  },
  calendarCard: {
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  navButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  navButtonText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    color: colors.primaryDeep,
  },
  monthTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    color: colors.text,
    textTransform: 'capitalize',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  weekday: {
    width: '14.2%',
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  dayCell: {
    width: '13.5%',
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  dayCellMuted: {
    opacity: 0.45,
  },
  dayCellToday: {
    borderColor: colors.primaryDeep,
  },
  dayCellFilled: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  dayText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  dayTextMuted: {
    color: colors.muted,
  },
  dayTextFilled: {
    color: colors.primaryDeep,
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primaryDeep,
    marginTop: 3,
  },
  hint: {
    marginTop: spacing.md,
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
  },
});
