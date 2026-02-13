import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useI18n } from '../../app/localization';
import { colors, fontSizes, fonts, radii, spacing } from '../../app/theme';

export type CheckinDraft = {
  dryness: number | null;
  oiliness: number | null;
  acne: number | null;
  sleep: number | null;
  stress: number | null;
  water: number | null;
  note: string;
};

type StepperCheckinProps = {
  initialValue: CheckinDraft;
  onSubmit: (draft: CheckinDraft) => Promise<void> | void;
  submitting?: boolean;
};

const TOTAL_STEPS = 3;
const SLEEP_COLORS = [
  '#E8124A',
  '#EC2A58',
  '#F14067',
  '#F55775',
  '#F96F84',
  '#FC8693',
  '#FCA0A9',
  '#3FA37A',
  '#57B286',
  '#6DC091',
  '#F3CD17',
  '#F2D743',
  '#F5E17D',
];

function NumberScaleRow(props: {
  label: string;
  options: number[];
  value: number | null;
  onChange: (value: number) => void;
}) {
  const { label, options, value, onChange } = props;

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.valueGrid}>
        {options.map(option => {
          const active = value === option;
          return (
            <Pressable
              key={`${label}-${option}`}
              style={[styles.valueCircle, active && styles.valueCircleActive]}
              onPress={() => onChange(option)}
            >
              <Text
                style={[styles.valueText, active && styles.valueTextActive]}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function getSleepZoneKey(value: number | null) {
  if (value === null) {
    return null;
  }
  if (value <= 6) {
    return 'checkin.sleep.zone.low';
  }
  if (value <= 9) {
    return 'checkin.sleep.zone.ok';
  }
  return 'checkin.sleep.zone.high';
}

function SleepRangeRow(props: {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
}) {
  const { t } = useI18n();
  const { label, value, onChange } = props;
  const [trackWidth, setTrackWidth] = useState(0);
  const zoneKey = getSleepZoneKey(value);
  const maxValue = SLEEP_COLORS.length - 1;

  const updateValueFromTouch = useCallback(
    (locationX: number) => {
      if (trackWidth <= 0) {
        return;
      }

      const horizontalInset = 4;
      const availableWidth = Math.max(1, trackWidth - horizontalInset * 2);
      const clamped = Math.min(
        availableWidth,
        Math.max(0, locationX - horizontalInset),
      );
      const ratio = clamped / availableWidth;
      const nextValue = Math.round(ratio * maxValue);
      onChange(nextValue);
    },
    [maxValue, onChange, trackWidth],
  );

  return (
    <View style={styles.field}>
      <View style={styles.sleepHeader}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.sleepValue}>
          {value === null ? '—' : `${value} ч`}
        </Text>
      </View>

      <View
        style={styles.sleepTrackWrap}
        onLayout={event => {
          setTrackWidth(event.nativeEvent.layout.width);
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={event => {
          updateValueFromTouch(event.nativeEvent.locationX);
        }}
        onResponderMove={event => {
          updateValueFromTouch(event.nativeEvent.locationX);
        }}
        onResponderRelease={event => {
          updateValueFromTouch(event.nativeEvent.locationX);
        }}
      >
        {SLEEP_COLORS.map((color, index) => {
          const selected = value !== null && index <= value;
          const segmentColorStyle = selected
            ? { backgroundColor: color }
            : styles.sleepSegmentInactive;
          const edgeStyle =
            index === 0
              ? styles.sleepSegmentLeft
              : index === SLEEP_COLORS.length - 1
              ? styles.sleepSegmentRight
              : null;
          return (
            <View
              key={`sleep-${index}`}
              style={[styles.sleepSegment, segmentColorStyle, edgeStyle]}
            />
          );
        })}
      </View>

      <View style={styles.sleepTicks}>
        <Text style={[styles.sleepTick, styles.sleepTickStart]}>0</Text>
        <Text style={[styles.sleepTick, styles.sleepTickAt6]}>6</Text>
        <Text style={[styles.sleepTick, styles.sleepTickAt9]}>9</Text>
        <Text style={[styles.sleepTick, styles.sleepTickEnd]}>12</Text>
      </View>

      <Text style={styles.sleepDragHint}>{t('checkin.sleep.dragHint')}</Text>

      <View style={styles.sleepZoneWrap}>
        <Text style={styles.sleepZoneText}>
          {zoneKey ? t(zoneKey) : t('checkin.sleep')}
        </Text>
      </View>
    </View>
  );
}

function stressPalette(value: number) {
  if (value <= 2) {
    return { border: '#34A66A', fill: '#DDF7E8', text: '#2D8758' };
  }
  if (value === 3) {
    return { border: '#E4B600', fill: '#FFF4BF', text: '#AD8300' };
  }
  if (value === 4) {
    return { border: '#E98900', fill: '#FFE8C7', text: '#C26C00' };
  }
  return { border: '#E7345F', fill: '#FCE6EC', text: '#E7345F' };
}

function getStressLevelKey(value: number) {
  if (value === 1) {
    return 'checkin.stress.level.1' as const;
  }
  if (value === 2) {
    return 'checkin.stress.level.2' as const;
  }
  if (value === 3) {
    return 'checkin.stress.level.3' as const;
  }
  if (value === 4) {
    return 'checkin.stress.level.4' as const;
  }
  return 'checkin.stress.level.5' as const;
}

function StressRow(props: {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
}) {
  const { t } = useI18n();
  const { label, value, onChange } = props;
  const levelText =
    value === null ? t('checkin.stress.empty') : t(getStressLevelKey(value));

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.stressHint}>{t('checkin.stress.scaleHint')}</Text>
      <View style={styles.stressRow}>
        {[1, 2, 3, 4, 5].map(option => {
          const palette = stressPalette(option);
          const selected = value === option;
          return (
            <Pressable
              key={`stress-${option}`}
              style={[
                styles.stressButton,
                {
                  borderColor: palette.border,
                  backgroundColor: selected ? palette.fill : colors.surface,
                },
              ]}
              onPress={() => onChange(option)}
            >
              <Text
                style={[
                  styles.stressValue,
                  { color: selected ? palette.text : palette.border },
                ]}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.stressSelected}>{levelText}</Text>
    </View>
  );
}

function WaterCounter(props: {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
}) {
  const { t } = useI18n();
  const { label, value, onChange } = props;
  const current = value ?? 0;

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.waterCard}>
        <View>
          <Text style={styles.waterValue}>{current}</Text>
          <Text style={styles.waterLabel}>{t('checkin.water')}</Text>
        </View>
        <View style={styles.waterActions}>
          <Pressable
            style={[
              styles.waterActionBtn,
              current === 0 && styles.actionDisabled,
            ]}
            onPress={() => onChange(Math.max(0, current - 1))}
            disabled={current === 0}
          >
            <Text style={styles.waterActionText}>-1</Text>
          </Pressable>
          <Pressable
            style={[
              styles.waterActionBtn,
              current >= 12 && styles.actionDisabled,
            ]}
            onPress={() => onChange(Math.min(12, current + 1))}
            disabled={current >= 12}
          >
            <Text style={styles.waterActionText}>+1</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function StepperCheckin({
  initialValue,
  onSubmit,
  submitting = false,
}: StepperCheckinProps) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<CheckinDraft>(initialValue);

  useEffect(() => {
    setDraft(initialValue);
    setStep(0);
  }, [initialValue]);

  const canGoNext = useMemo(() => {
    if (step === 0) {
      return (
        draft.dryness !== null && draft.oiliness !== null && draft.acne !== null
      );
    }
    if (step === 1) {
      return (
        draft.sleep !== null && draft.stress !== null && draft.water !== null
      );
    }
    return true;
  }, [step, draft]);

  const onNext = () => {
    if (step >= TOTAL_STEPS - 1 || !canGoNext) {
      return;
    }
    setStep(current => current + 1);
  };

  const onBack = () => {
    if (step === 0) {
      return;
    }
    setStep(current => current - 1);
  };

  const submit = async () => {
    await onSubmit(draft);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.progressText}>
        {t('checkin.progress', { step: step + 1, total: TOTAL_STEPS })}
      </Text>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${((step + 1) / TOTAL_STEPS) * 100}%` },
          ]}
        />
      </View>

      {step === 0 ? (
        <View>
          <Text style={styles.stepTitle}>{t('checkin.step.skin')}</Text>
          <NumberScaleRow
            label={t('checkin.dryness')}
            options={[0, 1, 2, 3, 4, 5]}
            value={draft.dryness}
            onChange={value =>
              setDraft(current => ({ ...current, dryness: value }))
            }
          />
          <NumberScaleRow
            label={t('checkin.oiliness')}
            options={[0, 1, 2, 3, 4, 5]}
            value={draft.oiliness}
            onChange={value =>
              setDraft(current => ({ ...current, oiliness: value }))
            }
          />
          <NumberScaleRow
            label={t('checkin.acne')}
            options={[0, 1, 2, 3, 4, 5]}
            value={draft.acne}
            onChange={value =>
              setDraft(current => ({ ...current, acne: value }))
            }
          />
        </View>
      ) : null}

      {step === 1 ? (
        <View>
          <Text style={styles.stepTitle}>{t('checkin.step.wellness')}</Text>
          <SleepRangeRow
            label={t('checkin.sleep')}
            value={draft.sleep}
            onChange={value =>
              setDraft(current => ({ ...current, sleep: value }))
            }
          />
          <StressRow
            label={t('checkin.stress')}
            value={draft.stress}
            onChange={value =>
              setDraft(current => ({ ...current, stress: value }))
            }
          />
          <WaterCounter
            label={t('checkin.water.quick')}
            value={draft.water}
            onChange={value =>
              setDraft(current => ({ ...current, water: value }))
            }
          />
        </View>
      ) : null}

      {step === 2 ? (
        <View>
          <Text style={styles.stepTitle}>
            {t('checkin.step.note')} ({t('common.optional')})
          </Text>
          <Text style={styles.noteLabel}>{t('checkin.noteLabel')}</Text>
          <TextInput
            value={draft.note}
            onChangeText={value =>
              setDraft(current => ({ ...current, note: value }))
            }
            placeholder={t('checkin.notePlaceholder')}
            placeholderTextColor={colors.muted}
            style={styles.noteInput}
            multiline
          />
        </View>
      ) : null}

      <View style={styles.footerRow}>
        <Pressable
          style={[styles.footerButton, step === 0 && styles.footerButtonGhost]}
          onPress={onBack}
        >
          <Text
            style={[
              styles.footerButtonText,
              step === 0 && styles.footerButtonTextGhost,
            ]}
          >
            {t('common.back')}
          </Text>
        </Pressable>

        {step < TOTAL_STEPS - 1 ? (
          <Pressable
            style={[
              styles.footerButton,
              !canGoNext && styles.footerButtonDisabled,
            ]}
            disabled={!canGoNext}
            onPress={onNext}
          >
            <Text style={styles.footerButtonText}>{t('common.next')}</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[
              styles.footerButton,
              submitting && styles.footerButtonDisabled,
            ]}
            onPress={submit}
            disabled={submitting}
          >
            <Text style={styles.footerButtonText}>
              {submitting ? t('checkin.saved') : t('checkin.finish')}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  progressText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.muted,
  },
  progressTrack: {
    marginTop: spacing.xs,
    height: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.secondary,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primaryDeep,
  },
  stepTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  field: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  valueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  valueCircle: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  valueCircleActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  valueText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  valueTextActive: {
    color: colors.primaryDeep,
    fontFamily: fonts.heading,
  },
  sleepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sleepValue: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    color: colors.text,
  },
  sleepTrackWrap: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.text,
    borderRadius: radii.lg,
    padding: 4,
    flexDirection: 'row',
    gap: 2,
  },
  sleepSegment: {
    flex: 1,
    height: 14,
  },
  sleepSegmentInactive: {
    backgroundColor: '#F5E8EE',
  },
  sleepSegmentLeft: {
    borderTopLeftRadius: radii.md,
    borderBottomLeftRadius: radii.md,
  },
  sleepSegmentRight: {
    borderTopRightRadius: radii.md,
    borderBottomRightRadius: radii.md,
  },
  sleepTicks: {
    marginTop: spacing.xs,
    position: 'relative',
    height: 18,
  },
  sleepTick: {
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
    left: '50%',
    transform: [{ translateX: -4 }],
  },
  sleepTickAt9: {
    left: '75%',
    transform: [{ translateX: -4 }],
  },
  sleepTickEnd: {
    right: 0,
  },
  sleepZoneWrap: {
    marginTop: spacing.xs,
    borderRadius: radii.lg,
    backgroundColor: '#FBE7EE',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  sleepDragHint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  sleepZoneText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    color: colors.primaryDeep,
  },
  stressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  stressHint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  stressButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stressValue: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md,
  },
  stressSelected: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  waterCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  waterValue: {
    fontFamily: fonts.heading,
    fontSize: 34,
    color: colors.text,
    lineHeight: 38,
  },
  waterLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.muted,
  },
  waterActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  waterActionBtn: {
    minWidth: 72,
    minHeight: 38,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  actionDisabled: {
    opacity: 0.4,
  },
  waterActionText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    color: colors.primaryDeep,
  },
  noteLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  noteInput: {
    minHeight: 96,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    textAlignVertical: 'top',
  },
  footerRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  footerButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDeep,
  },
  footerButtonGhost: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footerButtonDisabled: {
    opacity: 0.5,
  },
  footerButtonText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    color: colors.surface,
  },
  footerButtonTextGhost: {
    color: colors.text,
  },
});
