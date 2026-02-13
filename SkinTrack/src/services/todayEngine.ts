import { DailyEntry } from '../data/db/models/DailyEntry';
import { SkinSummary } from './skinEngine';

export type PriorityCode = 'balance' | 'hydration' | 'calm' | 'sleep';

export type TodaySnapshot = {
  filledCount: number;
  totalCount: number;
  skinIndex: number;
  priority: PriorityCode;
};

const TOTAL = 6;

function getFilledCount(entry: DailyEntry | null) {
  if (!entry) {
    return 0;
  }

  return [
    entry.dryness,
    entry.oiliness,
    entry.acneLevel,
    entry.sleepHours,
    entry.stress,
    entry.waterIntake,
  ].filter(value => value !== undefined && value !== null).length;
}

function resolvePriority(entry: DailyEntry | null): PriorityCode {
  if (!entry) {
    return 'balance';
  }

  if ((entry.dryness ?? 0) >= 4 || (entry.waterIntake ?? 0) <= 3) {
    return 'hydration';
  }

  if ((entry.acneLevel ?? 0) >= 3 || (entry.stress ?? 0) >= 4) {
    return 'calm';
  }

  if ((entry.sleepHours ?? 8) < 6) {
    return 'sleep';
  }

  return 'balance';
}

export function buildTodaySnapshot(
  entry: DailyEntry | null,
  summary: SkinSummary,
): TodaySnapshot {
  return {
    filledCount: getFilledCount(entry),
    totalCount: TOTAL,
    skinIndex: Math.round(summary.index),
    priority: resolvePriority(entry),
  };
}
