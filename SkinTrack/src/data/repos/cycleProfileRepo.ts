import { database } from '../db';
import { CycleProfile } from '../db/models/CycleProfile';

const collection = database.collections.get<CycleProfile>('cycle_profiles');

export type CycleProfileInput = {
  cycleLength: number;
  periodLength: number;
};

export async function getCycleProfile() {
  const items = await collection.query().fetch();
  return items[0] ?? null;
}

export async function upsertCycleProfile(input: CycleProfileInput) {
  await database.write(async () => {
    const items = await collection.query().fetch();
    if (items[0]) {
      await items[0].update(record => {
        record.cycleLength = input.cycleLength;
        record.periodLength = input.periodLength;
        record.updatedAt = Date.now();
      });
      return;
    }

    await collection.create(record => {
      record.cycleLength = input.cycleLength;
      record.periodLength = input.periodLength;
      record.updatedAt = Date.now();
    });
  });
}
