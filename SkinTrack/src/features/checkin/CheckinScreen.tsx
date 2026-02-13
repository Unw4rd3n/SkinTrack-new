import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useI18n } from '../../app/localization';
import { colors, fontSizes, fonts, spacing } from '../../app/theme';
import { getEntryByDate, upsertEntry } from '../../data/repos/dailyEntriesRepo';
import { toDayKey } from '../../services/date';
import { trackEvent } from '../../services/analytics';
import { Screen } from '../ui/Screen';
import { CheckinDraft, StepperCheckin } from '../ui/StepperCheckin';

const DEFAULT_DRAFT: CheckinDraft = {
  dryness: null,
  oiliness: null,
  acne: null,
  sleep: null,
  stress: null,
  water: null,
  note: '',
};

export function CheckinScreen() {
  const { t } = useI18n();
  const navigation = useNavigation<any>();
  const [initialDraft, setInitialDraft] = useState<CheckinDraft>(DEFAULT_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const todayKey = useMemo(() => toDayKey(new Date()), []);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const entry = await getEntryByDate(todayKey);
        if (!entry) {
          setInitialDraft(DEFAULT_DRAFT);
          return;
        }

        setInitialDraft({
          dryness: entry.dryness ?? null,
          oiliness: entry.oiliness ?? null,
          acne: entry.acneLevel ?? null,
          sleep: entry.sleepHours ?? null,
          stress: entry.stress ?? null,
          water: entry.waterIntake ?? null,
          note: entry.note ?? '',
        });
      };

      load();
    }, [todayKey]),
  );

  const submit = async (draft: CheckinDraft) => {
    setSubmitting(true);
    await upsertEntry({
      entryDate: todayKey,
      dryness: draft.dryness ?? undefined,
      oiliness: draft.oiliness ?? undefined,
      acneLevel: draft.acne ?? undefined,
      sleepHours: draft.sleep ?? undefined,
      stress: draft.stress ?? undefined,
      waterIntake: draft.water ?? undefined,
      note: draft.note.trim() ? draft.note.trim() : undefined,
    });

    trackEvent('checkin_completed', {
      entryDate: todayKey,
      filled: [
        draft.dryness,
        draft.oiliness,
        draft.acne,
        draft.sleep,
        draft.stress,
        draft.water,
      ].filter(value => value !== null).length,
    });
    setSubmitting(false);
    navigation.navigate('Today');
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{t('checkin.title')}</Text>
      </View>

      <StepperCheckin
        initialValue={initialDraft}
        submitting={submitting}
        onSubmit={submit}
      />
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
});
