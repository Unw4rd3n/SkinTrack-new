import { Q } from '@nozbe/watermelondb';
import { database } from '../db';
import { DailyEntry } from '../db/models/DailyEntry';

export type DailyEntryInput = {
  entryDate: number;
  dryness?: number;
  oiliness?: number;
  acneLevel?: number;
  stress?: number;
  sleepHours?: number;
  waterIntake?: number;
  note?: string;
};

const collection = database.collections.get<DailyEntry>('daily_entries');

export async function getEntryByDate(entryDate: number) {
  const result = await collection
    .query(Q.where('entry_date', entryDate))
    .fetch();
  return result[0] ?? null;
}

export async function getAllEntries() {
  const entries = await collection.query().fetch();
  return entries.sort((a, b) => b.entryDate - a.entryDate);
}

export async function getRecentEntries(days: number) {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const entries = await collection
    .query(Q.where('entry_date', Q.gte(since)))
    .fetch();
  return entries.sort((a, b) => a.entryDate - b.entryDate);
}

export async function upsertEntry(data: DailyEntryInput) {
  await database.write(async () => {
    const existing = await getEntryByDate(data.entryDate);
    if (existing) {
      await existing.update(record => {
        record.dryness = data.dryness;
        record.oiliness = data.oiliness;
        record.acneLevel = data.acneLevel;
        record.stress = data.stress;
        record.sleepHours = data.sleepHours;
        record.waterIntake = data.waterIntake;
        record.note = data.note;
      });
      return;
    }

    await collection.create(record => {
      record.entryDate = data.entryDate;
      record.dryness = data.dryness;
      record.oiliness = data.oiliness;
      record.acneLevel = data.acneLevel;
      record.stress = data.stress;
      record.sleepHours = data.sleepHours;
      record.waterIntake = data.waterIntake;
      record.note = data.note;
    });
  });
}

export async function deleteEntryByDate(entryDate: number) {
  await database.write(async () => {
    const existing = await getEntryByDate(entryDate);
    if (!existing) {
      return;
    }
    await existing.markAsDeleted();
    await existing.destroyPermanently();
  });
}

export async function incrementWaterForDate(
  entryDate: number,
  delta = 1,
  max = 12,
) {
  let nextValue = 0;

  await database.write(async () => {
    const existing = await getEntryByDate(entryDate);
    if (existing) {
      const current = existing.waterIntake ?? 0;
      nextValue = Math.max(0, Math.min(max, current + delta));
      await existing.update(record => {
        record.waterIntake = nextValue;
      });
      return;
    }

    nextValue = Math.max(0, Math.min(max, delta));
    await collection.create(record => {
      record.entryDate = entryDate;
      record.waterIntake = nextValue;
    });
  });

  return nextValue;
}
