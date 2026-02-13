import { database } from '../db';
import { RoutineProfile } from '../db/models/RoutineProfile';

export type RoutineInput = {
  retinolStrength?: number;
  retinolFrequency?: number;
  acidFrequency?: number;
  sensitivity?: number;
};

const collection = database.collections.get<RoutineProfile>('routine_profiles');

export async function getRoutineProfile() {
  const items = await collection.query().fetch();
  return items[0] ?? null;
}

export async function upsertRoutineProfile(data: RoutineInput) {
  await database.write(async () => {
    const existing = await getRoutineProfile();
    if (existing) {
      await existing.update(record => {
        record.retinolStrength = data.retinolStrength;
        record.retinolFrequency = data.retinolFrequency;
        record.acidFrequency = data.acidFrequency;
        record.sensitivity = data.sensitivity;
      });
      return;
    }

    await collection.create(record => {
      record.retinolStrength = data.retinolStrength;
      record.retinolFrequency = data.retinolFrequency;
      record.acidFrequency = data.acidFrequency;
      record.sensitivity = data.sensitivity;
    });
  });
}

export function computeRoutineLoad(input: RoutineInput) {
  const strength = input.retinolStrength ?? 0;
  const retinol = input.retinolFrequency ?? 0;
  const acids = input.acidFrequency ?? 0;
  const sensitivity = input.sensitivity ?? 0;

  const retinolScore = strength * retinol;
  const acidScore = acids * 1.5;
  const raw = retinolScore + acidScore - sensitivity * 0.6;

  if (raw >= 14) return 'high';
  if (raw >= 7) return 'medium';
  return 'low';
}
