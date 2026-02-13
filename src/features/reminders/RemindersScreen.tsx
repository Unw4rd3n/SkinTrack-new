import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, fontSizes, fonts, radii, spacing } from '../../app/theme';
import { Screen } from '../ui/Screen';
import { Card } from '../ui/Card';
import {
  ensureDefaultReminderPreferences,
  ensureDefaultReminders,
  getReminderPreferences,
  getReminders,
  upsertReminderPreferences,
  upsertReminders,
} from '../../data/repos/remindersRepo';
import {
  requestNotificationPermissions,
  rescheduleDailyReminders,
} from '../../services/notifications';
import { trackEvent } from '../../services/analytics';

type ReminderState = {
  slot: number;
  time: string;
  enabled: boolean;
};

type PickerTarget =
  | { kind: 'slot'; slot: number }
  | { kind: 'quietStart' }
  | { kind: 'quietEnd' };

export function RemindersScreen() {
  const [reminders, setReminders] = useState<ReminderState[]>([
    { slot: 1, time: '09:00', enabled: true },
    { slot: 2, time: '21:00', enabled: true },
  ]);
  const [quietStart, setQuietStart] = useState('22:30');
  const [quietEnd, setQuietEnd] = useState('07:00');
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isHydrated, setIsHydrated] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [pickerValue, setPickerValue] = useState(new Date());
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const load = async () => {
      await ensureDefaultReminders();
      await ensureDefaultReminderPreferences();
      const [data, preferences] = await Promise.all([
        getReminders(),
        getReminderPreferences(),
      ]);
      setReminders(
        data
          .sort((a, b) => a.slot - b.slot)
          .map(reminder => ({
            slot: reminder.slot,
            time: reminder.time,
            enabled: reminder.enabled,
          })),
      );
      if (preferences?.quietStart) {
        setQuietStart(preferences.quietStart);
      }
      if (preferences?.quietEnd) {
        setQuietEnd(preferences.quietEnd);
      }
      setIsHydrated(true);
    };

    load();

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  const canAddMore = reminders.length < 6;
  const enabledCount = useMemo(
    () => reminders.filter(reminder => reminder.enabled).length,
    [reminders],
  );

  const updateReminder = (slot: number, patch: Partial<ReminderState>) => {
    setReminders(current =>
      current.map(reminder =>
        reminder.slot === slot ? { ...reminder, ...patch } : reminder,
      ),
    );
  };

  const addReminder = () => {
    if (!canAddMore) {
      return;
    }
    const maxSlot = reminders.reduce((max, item) => Math.max(max, item.slot), 0);
    setReminders(current => [
      ...current,
      { slot: maxSlot + 1, time: '13:00', enabled: true },
    ]);
  };

  const removeReminder = (slot: number) => {
    if (reminders.length <= 1) {
      setError('Нужен минимум один активный слот.');
      return;
    }
    setReminders(current => current.filter(reminder => reminder.slot !== slot));
  };

  const isValidTime = (value: string) => {
    if (!/^\d{2}:\d{2}$/.test(value)) {
      return false;
    }
    const [h, m] = value.split(':').map(part => Number(part));
    return (
      Number.isInteger(h) &&
      Number.isInteger(m) &&
      h >= 0 &&
      h <= 23 &&
      m >= 0 &&
      m <= 59
    );
  };

  const formatTimeInput = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) {
      return digits;
    }
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  };

  const toDateFromTime = (value: string) => {
    const date = new Date();
    const [h, m] = value.split(':').map(part => Number(part));
    date.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
    return date;
  };

  const toTimeFromDate = (date: Date) => {
    const h = `${date.getHours()}`.padStart(2, '0');
    const m = `${date.getMinutes()}`.padStart(2, '0');
    return `${h}:${m}`;
  };

  const openPicker = (target: PickerTarget, currentValue: string) => {
    setPickerTarget(target);
    setPickerValue(toDateFromTime(currentValue));
  };

  const confirmPicker = () => {
    if (!pickerTarget) {
      return;
    }
    const formatted = toTimeFromDate(pickerValue);
    if (pickerTarget.kind === 'slot') {
      updateReminder(pickerTarget.slot, { time: formatted });
    } else if (pickerTarget.kind === 'quietStart') {
      setQuietStart(formatted);
    } else {
      setQuietEnd(formatted);
    }
    setPickerTarget(null);
  };

  const reminderHasInvalidTime = useMemo(
    () => reminders.some(reminder => !isValidTime(reminder.time)),
    [reminders],
  );
  const quietWindowInvalid = useMemo(
    () => !isValidTime(quietStart) || !isValidTime(quietEnd),
    [quietStart, quietEnd],
  );

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (reminders.length === 0) {
      setError('Добавь хотя бы один слот напоминания.');
      setSaveStatus('idle');
      return;
    }

    if (reminderHasInvalidTime || quietWindowInvalid) {
      setError('Некорректное время. Используй формат ЧЧ:ММ, например 09:00.');
      setSaveStatus('idle');
      return;
    }

    setError(null);
    setSaveStatus('saving');
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = setTimeout(async () => {
      await upsertReminders(reminders);
      await upsertReminderPreferences({
        quietStart,
        quietEnd,
      });
      await requestNotificationPermissions();

      const enabledReminders = reminders
        .filter(reminder => reminder.enabled)
        .map(reminder => ({
          time: reminder.time,
          messageType: 'care' as const,
        }));

      await rescheduleDailyReminders(enabledReminders, {
        quietStart,
        quietEnd,
      });
      trackEvent('save_reminders', {
        total: reminders.length,
        enabled: enabledReminders.length,
        quietStart,
        quietEnd,
        auto: true,
      });
      setSaveStatus('saved');
    }, 500);
  }, [isHydrated, reminders, quietEnd, quietStart, reminderHasInvalidTime, quietWindowInvalid]);

  return (
    <Screen scroll>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.kicker}>Напоминания</Text>
          <Text style={styles.title}>Гибкая настройка</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>
        Настрой несколько слотов и тихие часы. Сообщения будут в одном понятном стиле.
      </Text>

      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Активно: {enabledCount}</Text>
        <Text style={styles.heroText}>
          Мягкие напоминания в едином тоне: коротко, понятно и с акцентом на заботу о коже.
        </Text>
        <Text style={styles.statusText}>
          {saveStatus === 'saving'
            ? 'Сохраняем изменения...'
            : saveStatus === 'saved'
            ? 'Сохранено автоматически'
            : 'Автосохранение включено'}
        </Text>
      </View>

      {reminders.map(reminder => (
        <Card key={reminder.slot} style={styles.card}>
          <View style={styles.row}>
            <View>
              <Text style={styles.label}>Слот {reminder.slot}</Text>
              <Text style={styles.helperInline}>Стиль: поддерживающий уход</Text>
            </View>
            <Switch
              value={reminder.enabled}
              onValueChange={value =>
                updateReminder(reminder.slot, { enabled: value })
              }
              trackColor={{ true: colors.accent, false: colors.border }}
              thumbColor={colors.surface}
            />
          </View>
          <View style={styles.rowActions}>
            {Platform.OS === 'ios' ? (
              <Pressable
                style={[
                  styles.inputPressable,
                  !isValidTime(reminder.time) && reminder.time.length >= 4 && styles.inputInvalid,
                ]}
                onPress={() => openPicker({ kind: 'slot', slot: reminder.slot }, reminder.time)}
              >
                <Text style={styles.inputPressableText}>{reminder.time}</Text>
              </Pressable>
            ) : (
              <TextInput
                value={reminder.time}
                onChangeText={text =>
                  updateReminder(reminder.slot, { time: formatTimeInput(text) })
                }
                placeholder="09:00"
                placeholderTextColor={colors.muted}
                style={[
                  styles.input,
                  !isValidTime(reminder.time) && reminder.time.length >= 4 && styles.inputInvalid,
                ]}
                keyboardType="number-pad"
              />
            )}
            <Pressable
              style={styles.removeButton}
              onPress={() => removeReminder(reminder.slot)}
            >
              <Text style={styles.removeButtonText}>Удалить</Text>
            </Pressable>
          </View>
          <Text style={styles.helper}>Формат времени: ЧЧ:ММ</Text>
        </Card>
      ))}

      <Pressable
        style={[styles.addButton, !canAddMore && styles.addButtonDisabled]}
        onPress={addReminder}
        disabled={!canAddMore}
      >
        <Text style={styles.addButtonText}>
          {canAddMore ? 'Добавить слот' : 'Максимум 6 слотов'}
        </Text>
      </Pressable>

      <Card style={styles.card}>
        <Text style={styles.label}>Тихие часы</Text>
        <Text style={styles.helperInline}>
          В это время уведомления автоматически переносятся на конец тихого окна.
        </Text>
        <View style={styles.rowActions}>
          {Platform.OS === 'ios' ? (
            <>
              <Pressable
                style={[
                  styles.inputPressable,
                  !isValidTime(quietStart) && quietStart.length >= 4 && styles.inputInvalid,
                ]}
                onPress={() => openPicker({ kind: 'quietStart' }, quietStart)}
              >
                <Text style={styles.inputPressableText}>{quietStart}</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.inputPressable,
                  !isValidTime(quietEnd) && quietEnd.length >= 4 && styles.inputInvalid,
                ]}
                onPress={() => openPicker({ kind: 'quietEnd' }, quietEnd)}
              >
                <Text style={styles.inputPressableText}>{quietEnd}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <TextInput
                value={quietStart}
                onChangeText={text => setQuietStart(formatTimeInput(text))}
                placeholder="22:30"
                placeholderTextColor={colors.muted}
                style={[
                  styles.input,
                  !isValidTime(quietStart) && quietStart.length >= 4 && styles.inputInvalid,
                ]}
                keyboardType="number-pad"
              />
              <TextInput
                value={quietEnd}
                onChangeText={text => setQuietEnd(formatTimeInput(text))}
                placeholder="07:00"
                placeholderTextColor={colors.muted}
                style={[
                  styles.input,
                  !isValidTime(quietEnd) && quietEnd.length >= 4 && styles.inputInvalid,
                ]}
                keyboardType="number-pad"
              />
            </>
          )}
        </View>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {Platform.OS === 'ios' ? (
        <Modal
          visible={Boolean(pickerTarget)}
          transparent
          animationType="slide"
          onRequestClose={() => setPickerTarget(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setPickerTarget(null)}>
                  <Text style={styles.modalAction}>Отмена</Text>
                </Pressable>
                <Text style={styles.modalTitle}>Выбери время</Text>
                <Pressable onPress={confirmPicker}>
                  <Text style={styles.modalAction}>Готово</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={pickerValue}
                mode="time"
                display="spinner"
                onChange={(_, date) => {
                  if (date) {
                    setPickerValue(date);
                  }
                }}
              />
            </View>
          </View>
        </Modal>
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
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.muted,
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.md,
  },
  heroCard: {
    backgroundColor: colors.cardBlueDeep,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
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
  statusText: {
    marginTop: spacing.sm,
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.accent,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  helperInline: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.body,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    marginRight: spacing.sm,
  },
  inputPressable: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceAlt,
    marginRight: spacing.sm,
    justifyContent: 'center',
    minHeight: 44,
  },
  inputPressableText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  helper: {
    marginTop: spacing.xs,
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  addButton: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    color: colors.accent,
  },
  removeButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  removeButtonText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
  },
  inputInvalid: {
    borderColor: colors.danger,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(43,27,35,0.25)',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingBottom: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  modalAction: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    color: colors.accent,
  },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    color: colors.text,
  },
});
