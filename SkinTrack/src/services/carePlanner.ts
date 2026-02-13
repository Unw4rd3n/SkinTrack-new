export type CareSensitivity = 1 | 2 | 3;

export type CareInput = {
  retinolStrength: number;
  retinolFrequency: number;
  acidFrequency: number;
  sensitivity: CareSensitivity;
};

export type CareWarningKey =
  | 'care.warning.autofix'
  | 'care.warning.sensitiveRetinol'
  | 'care.warning.sensitiveStrength'
  | 'care.warning.overload';

export type CareDayType = 'retinol' | 'acid' | 'recovery';

export type CareDayPlan = {
  dayIndex: number;
  type: CareDayType;
};

export type CareResolved = {
  values: CareInput;
  warnings: CareWarningKey[];
  overload: boolean;
  weekPlan: CareDayPlan[];
};

const WEEK_SIZE = 7;
const RETINOL_MAX = 3;
const ACID_MAX = 2;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getRetinolDays(frequency: number) {
  if (frequency <= 1) return [1];
  if (frequency === 2) return [1, 4];
  return [0, 2, 4];
}

function buildWeekPlan(
  retinolFrequency: number,
  acidFrequency: number,
): CareDayPlan[] {
  const retinolDays = new Set(getRetinolDays(retinolFrequency));
  const acidDays = new Set<number>();
  const acidPriority = [6, 3, 5, 1, 2, 0, 4];

  for (const dayIndex of acidPriority) {
    if (acidDays.size >= acidFrequency) {
      break;
    }
    if (!retinolDays.has(dayIndex)) {
      acidDays.add(dayIndex);
    }
  }

  return Array.from({ length: WEEK_SIZE }, (_, dayIndex) => {
    if (retinolDays.has(dayIndex)) {
      return { dayIndex, type: 'retinol' as const };
    }
    if (acidDays.has(dayIndex)) {
      return { dayIndex, type: 'acid' as const };
    }
    return { dayIndex, type: 'recovery' as const };
  });
}

function isOverloaded(values: CareInput) {
  const score =
    values.retinolStrength * values.retinolFrequency +
    values.acidFrequency * 2 +
    (values.sensitivity === 3 ? 2 : values.sensitivity === 2 ? 1 : 0);
  return score >= 9;
}

export function resolveCarePlan(input: CareInput): CareResolved {
  let retinolStrength = clamp(input.retinolStrength, 1, 3);
  let retinolFrequency = clamp(input.retinolFrequency, 1, RETINOL_MAX);
  let acidFrequency = clamp(input.acidFrequency, 0, ACID_MAX);
  const warnings: CareWarningKey[] = [];

  if (retinolFrequency >= 2 && acidFrequency > 1) {
    acidFrequency = 1;
    warnings.push('care.warning.autofix');
  }

  if (input.sensitivity === 3 && retinolFrequency > 1) {
    retinolFrequency = 1;
    warnings.push('care.warning.sensitiveRetinol');
  }

  if (input.sensitivity === 3 && retinolStrength > 2) {
    retinolStrength = 2;
    warnings.push('care.warning.sensitiveStrength');
  }

  const values: CareInput = {
    retinolStrength,
    retinolFrequency,
    acidFrequency,
    sensitivity: input.sensitivity,
  };

  const overload = isOverloaded(values);
  if (overload) {
    warnings.push('care.warning.overload');
  }

  return {
    values,
    warnings: [...new Set(warnings)],
    overload,
    weekPlan: buildWeekPlan(retinolFrequency, acidFrequency),
  };
}
