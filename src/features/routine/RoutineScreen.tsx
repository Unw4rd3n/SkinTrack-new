import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fontSizes, fonts, radii, spacing } from '../../app/theme';
import { Screen } from '../ui/Screen';
import { Card } from '../ui/Card';
import { PrimaryButton } from '../ui/PrimaryButton';
import { Reveal } from '../ui/Reveal';
import {
  computeRoutineLoad,
  getRoutineProfile,
  upsertRoutineProfile,
} from '../../data/repos/routineRepo';
import { trackEvent } from '../../services/analytics';

const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const RETINOL_STRENGTH_OPTIONS = [
  {
    value: 1,
    label: 'Низкая',
    hint: 'Подходит для старта. Возможна лёгкая сухость в первые 2-3 недели.',
  },
  {
    value: 2,
    label: 'Средняя',
    hint: 'Для кожи с адаптацией к активам. Важны восстановление и SPF.',
  },
  {
    value: 3,
    label: 'Высокая',
    hint: 'Только при хорошей переносимости. Следи за сухостью и стянутостью.',
  },
];

const RETINOL_FREQUENCY_OPTIONS = [1, 2, 3];
const ACID_FREQUENCY_OPTIONS = [0, 1, 2];

const SENSITIVITY_OPTIONS = [
  {
    value: 1,
    emoji: '🙂',
    label: 'Низкая',
    hint: 'Кожа хорошо переносит активы.',
  },
  {
    value: 2,
    emoji: '😐',
    label: 'Средняя',
    hint: 'Нужна постепенная адаптация.',
  },
  {
    value: 3,
    emoji: '😣',
    label: 'Высокая',
    hint: 'Минимум активных компонентов.',
  },
];

type PlanMode = 'gentle' | 'balanced' | 'intense';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getRetinolDays(frequency: number) {
  if (frequency === 1) return [2];
  if (frequency === 2) return [1, 4];
  return [0, 2, 4];
}

function buildWeekPlan(retinolFrequency: number, acidFrequency: number) {
  const retinolDays = new Set(getRetinolDays(retinolFrequency));
  const acidDays = new Set<number>();
  const acidPriority = [6, 3, 5, 1, 2, 0, 4];

  for (const day of acidPriority) {
    if (acidDays.size >= acidFrequency) {
      break;
    }
    if (!retinolDays.has(day)) {
      acidDays.add(day);
    }
  }

  return WEEK_DAYS.map((label, index) => {
    if (retinolDays.has(index)) {
      return { label, type: 'retinol' as const };
    }
    if (acidDays.has(index)) {
      return { label, type: 'acid' as const };
    }
    return { label, type: 'recovery' as const };
  });
}

function getPlanMode(input: {
  retinolStrength: number;
  retinolFrequency: number;
  acidFrequency: number;
  sensitivity: number;
}): PlanMode {
  const sensitivityRisk =
    input.sensitivity === 3 ? 2 : input.sensitivity === 2 ? 1 : 0;
  const score =
    input.retinolStrength * input.retinolFrequency +
    input.acidFrequency * 2 +
    sensitivityRisk;

  if (score >= 9) return 'intense';
  if (score >= 5) return 'balanced';
  return 'gentle';
}

export function RoutineScreen() {
  const [retinolStrength, setRetinolStrength] = useState(1);
  const [retinolFrequency, setRetinolFrequency] = useState(1);
  const [acidFrequency, setAcidFrequency] = useState(0);
  const [sensitivity, setSensitivity] = useState(2);
  const [saved, setSaved] = useState(false);
  const [autoMessage, setAutoMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const profile = await getRoutineProfile();
    if (!profile) return;

    const mappedStrength = clamp(profile.retinolStrength ?? 1, 1, 3);
    const mappedRetinolFrequency = clamp(profile.retinolFrequency ?? 1, 1, 3);
    const mappedAcidFrequency = clamp(profile.acidFrequency ?? 0, 0, 2);
    const mappedSensitivity =
      (profile.sensitivity ?? 2) <= 1
        ? 1
        : (profile.sensitivity ?? 2) <= 3
        ? 2
        : 3;

    setRetinolStrength(mappedStrength);
    setRetinolFrequency(mappedRetinolFrequency);
    setAcidFrequency(mappedAcidFrequency);
    setSensitivity(mappedSensitivity);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    let nextStrength = retinolStrength;
    let nextRetinolFrequency = retinolFrequency;
    let nextAcidFrequency = acidFrequency;
    const messages: string[] = [];

    if (nextRetinolFrequency > 3) {
      nextRetinolFrequency = 3;
    }
    if (nextAcidFrequency > 2) {
      nextAcidFrequency = 2;
    }

    if (nextRetinolFrequency >= 2 && nextAcidFrequency > 1) {
      nextAcidFrequency = 1;
      messages.push(
        'Мы снизили частоту кислот до 1 раза в неделю, чтобы избежать раздражения кожи.',
      );
    }

    if (sensitivity === 3 && nextRetinolFrequency > 1) {
      nextRetinolFrequency = 1;
      messages.push(
        'При высокой чувствительности лучше использовать ретинол 1 раз в неделю.',
      );
    }

    if (sensitivity === 3 && nextStrength === 3) {
      nextStrength = 2;
      messages.push(
        'Для чувствительной кожи безопаснее начать со средней силы ретинола.',
      );
    }

    if (nextStrength !== retinolStrength) {
      setRetinolStrength(nextStrength);
    }
    if (nextRetinolFrequency !== retinolFrequency) {
      setRetinolFrequency(nextRetinolFrequency);
    }
    if (nextAcidFrequency !== acidFrequency) {
      setAcidFrequency(nextAcidFrequency);
    }

    if (messages.length > 0) {
      setAutoMessage(messages[0]);
    }
  }, [retinolStrength, retinolFrequency, acidFrequency, sensitivity]);

  const mode = useMemo(
    () =>
      getPlanMode({
        retinolStrength,
        retinolFrequency,
        acidFrequency,
        sensitivity,
      }),
    [retinolStrength, retinolFrequency, acidFrequency, sensitivity],
  );

  const loadLevel = useMemo(
    () =>
      computeRoutineLoad({
        retinolStrength,
        retinolFrequency,
        acidFrequency,
        sensitivity,
      }),
    [retinolStrength, retinolFrequency, acidFrequency, sensitivity],
  );

  const modeTitle =
    mode === 'gentle'
      ? 'Режим: Бережный'
      : mode === 'balanced'
      ? 'Режим: Сбалансированный'
      : 'Режим: Интенсивный';
  const modeText =
    mode === 'gentle'
      ? 'Коже комфортно: мягкая нагрузка и хороший фокус на восстановление.'
      : mode === 'balanced'
      ? 'Нагрузка умеренная. Сохраняй интервалы между активами и не пропускай SPF.'
      : 'Нагрузка высокая. Добавь больше дней восстановления, если появляется сухость.';

  const heroStyle =
    mode === 'gentle'
      ? styles.heroCardGentle
      : mode === 'balanced'
      ? styles.heroCardBalanced
      : styles.heroCardIntense;

  const retinolStrengthHint =
    RETINOL_STRENGTH_OPTIONS.find(option => option.value === retinolStrength)
      ?.hint ?? RETINOL_STRENGTH_OPTIONS[0].hint;

  const sensitivityHint =
    SENSITIVITY_OPTIONS.find(option => option.value === sensitivity)?.hint ??
    SENSITIVITY_OPTIONS[1].hint;

  const beginnerRecommendation = retinolStrength === 1 || sensitivity >= 2;
  const overloadWarning =
    (retinolStrength === 3 && sensitivity === 3) ||
    (retinolFrequency === 3 && sensitivity >= 2) ||
    (retinolFrequency === 3 && acidFrequency >= 1);

  const weekPlan = useMemo(
    () => buildWeekPlan(retinolFrequency, acidFrequency),
    [retinolFrequency, acidFrequency],
  );

  const onSave = async () => {
    await upsertRoutineProfile({
      retinolStrength,
      retinolFrequency,
      acidFrequency,
      sensitivity,
    });
    trackEvent('save_routine_profile', {
      retinolStrength,
      retinolFrequency,
      acidFrequency,
      sensitivity,
      loadLevel,
      mode,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <Screen scroll>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.kicker}>Уход</Text>
          <Text style={styles.title}>Активы и нагрузка</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>
        Настрой активы на неделю: безопасно, понятно и без перегруза.
      </Text>

      <Reveal>
        <View style={[styles.heroCard, heroStyle]}>
          <Text style={styles.heroTitle}>{modeTitle}</Text>
          <Text style={styles.heroText}>{modeText}</Text>
        </View>
      </Reveal>

      <Reveal delay={70}>
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerTitle}>Правило безопасности</Text>
          <Text style={styles.infoBannerText}>
            Ретинол и кислоты автоматически ставятся в разные дни недели.
          </Text>
        </View>
      </Reveal>

      {autoMessage ? (
        <Reveal delay={90}>
          <View style={styles.autoBanner}>
            <Text style={styles.autoBannerTitle}>Автокоррекция</Text>
            <Text style={styles.autoBannerText}>{autoMessage}</Text>
          </View>
        </Reveal>
      ) : null}

      {overloadWarning ? (
        <Reveal delay={100}>
          <View style={styles.warnBanner}>
            <Text style={styles.warnBannerTitle}>Нагрузка выше комфортной</Text>
            <Text style={styles.warnBannerText}>
              Попробуй уменьшить частоту активов на 1 шаг, чтобы коже было
              спокойнее.
            </Text>
          </View>
        </Reveal>
      ) : null}

      <Reveal delay={120}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Ретинол</Text>
          <View style={styles.pillRow}>
            {RETINOL_STRENGTH_OPTIONS.map(option => {
              const selected = option.value === retinolStrength;
              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.pill,
                    selected && styles.pillActive,
                    styles.equalPill,
                  ]}
                  onPress={() => setRetinolStrength(option.value)}
                >
                  <Text
                    style={[styles.pillText, selected && styles.pillTextActive]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.helperBox}>
            <Text style={styles.helperText}>{retinolStrengthHint}</Text>
          </View>

          <Text style={styles.fieldLabel}>Частота использования</Text>
          <View style={styles.pillRow}>
            {RETINOL_FREQUENCY_OPTIONS.map(option => {
              const selected = option === retinolFrequency;
              const recommended = beginnerRecommendation && option <= 2;
              return (
                <Pressable
                  key={option}
                  style={[
                    styles.pill,
                    styles.equalPill,
                    selected && styles.pillActive,
                    recommended && !selected && styles.pillRecommended,
                  ]}
                  onPress={() => setRetinolFrequency(option)}
                >
                  <Text
                    style={[styles.pillText, selected && styles.pillTextActive]}
                  >
                    {option}× / нед
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {beginnerRecommendation ? (
            <Text style={styles.microHint}>
              Для старта обычно комфортно: 1-2 раза в неделю.
            </Text>
          ) : null}
        </Card>
      </Reveal>

      <Reveal delay={180}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Кислоты / пилинги</Text>
          <View style={styles.pillRow}>
            {ACID_FREQUENCY_OPTIONS.map(option => {
              const selected = option === acidFrequency;
              const disabled = retinolFrequency >= 2 && option > 1;
              return (
                <Pressable
                  key={option}
                  style={[
                    styles.pill,
                    styles.equalPill,
                    selected && styles.pillActive,
                    disabled && styles.pillDisabled,
                  ]}
                  onPress={() => {
                    if (!disabled) {
                      setAcidFrequency(option);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.pillText,
                      selected && styles.pillTextActive,
                      disabled && styles.pillTextDisabled,
                    ]}
                  >
                    {option}× / нед
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.microHint}>
            Не используйте кислоты в один день с ретинолом.
          </Text>
          {retinolFrequency >= 2 ? (
            <Text style={styles.microHintStrong}>
              При ретиноле 2-3 раза в неделю кислоты ограничены до 1 раза.
            </Text>
          ) : null}
        </Card>
      </Reveal>

      <Reveal delay={240}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Чувствительность кожи</Text>
          <View style={styles.pillRow}>
            {SENSITIVITY_OPTIONS.map(option => {
              const selected = option.value === sensitivity;
              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.sensitivityPill,
                    selected && styles.sensitivityPillActive,
                  ]}
                  onPress={() => setSensitivity(option.value)}
                >
                  <Text style={styles.sensitivityEmoji}>{option.emoji}</Text>
                  <Text
                    style={[
                      styles.sensitivityLabel,
                      selected && styles.sensitivityLabelActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.helperBox}>
            <Text style={styles.helperText}>{sensitivityHint}</Text>
          </View>
        </Card>
      </Reveal>

      <Reveal delay={300}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>План недели</Text>
          <View style={styles.weekRow}>
            {weekPlan.map(item => (
              <View
                key={item.label}
                style={[
                  styles.weekChip,
                  item.type === 'retinol'
                    ? styles.weekChipRetinol
                    : item.type === 'acid'
                    ? styles.weekChipAcid
                    : styles.weekChipRecovery,
                ]}
              >
                <Text style={styles.weekChipDay}>{item.label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.weekLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.weekChipRetinol]} />
              <Text style={styles.legendText}>Ретинол</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.weekChipAcid]} />
              <Text style={styles.legendText}>Кислоты</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.weekChipRecovery]} />
              <Text style={styles.legendText}>Восстановление</Text>
            </View>
          </View>
        </Card>
      </Reveal>

      <Reveal delay={360}>
        <PrimaryButton
          label={saved ? 'Сохранено' : 'Сохранить уход'}
          onPress={onSave}
          icon={saved ? '✓' : '›'}
        />
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
  heroCard: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.primaryDeep,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },
  heroCardGentle: {
    backgroundColor: '#E8F7EE',
  },
  heroCardBalanced: {
    backgroundColor: '#FFF1D7',
  },
  heroCardIntense: {
    backgroundColor: '#FFE3E9',
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
  infoBanner: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#DCE9FF',
    backgroundColor: '#EFF5FF',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoBannerTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    color: '#2D4E89',
    marginBottom: 2,
  },
  infoBannerText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: '#355C9A',
  },
  autoBanner: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#CFECDD',
    backgroundColor: '#E9F8F0',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  autoBannerTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    color: '#2D7A5A',
    marginBottom: 2,
  },
  autoBannerText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: '#2D7A5A',
  },
  warnBanner: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#F4D5BE',
    backgroundColor: '#FFF1E4',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  warnBannerTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    color: '#9C5E2C',
    marginBottom: 2,
  },
  warnBannerText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: '#9C5E2C',
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
  fieldLabel: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
  },
  pillRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  pill: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginRight: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equalPill: {
    flex: 1,
    minHeight: 44,
  },
  pillActive: {
    borderColor: colors.primaryDeep,
    backgroundColor: colors.accentSoft,
  },
  pillRecommended: {
    borderColor: '#B9D8C7',
    backgroundColor: '#EDF9F2',
  },
  pillDisabled: {
    opacity: 0.35,
  },
  pillText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  pillTextActive: {
    color: colors.text,
  },
  pillTextDisabled: {
    color: colors.muted,
  },
  helperBox: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  helperText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.muted,
  },
  microHint: {
    marginTop: spacing.xs,
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.muted,
  },
  microHintStrong: {
    marginTop: spacing.xs,
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    color: colors.primaryDeep,
  },
  sensitivityPill: {
    flex: 1,
    minHeight: 70,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    marginRight: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  sensitivityPillActive: {
    borderColor: colors.primaryDeep,
    backgroundColor: colors.accentSoft,
  },
  sensitivityEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  sensitivityLabel: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    color: colors.text,
  },
  sensitivityLabelActive: {
    color: colors.text,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  weekChip: {
    width: '13.2%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderWidth: 1,
  },
  weekChipRetinol: {
    backgroundColor: '#FFE3E9',
    borderColor: '#F2B8C6',
  },
  weekChipAcid: {
    backgroundColor: '#FFF2D9',
    borderColor: '#F1C98A',
  },
  weekChipRecovery: {
    backgroundColor: '#EEF8F3',
    borderColor: '#CBE8D9',
  },
  weekChipDay: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xs,
    color: colors.text,
  },
  weekLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
    marginBottom: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  legendText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.muted,
  },
});
