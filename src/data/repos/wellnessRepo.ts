import { Q } from '@nozbe/watermelondb';
import { database } from '../db';
import { WellnessEntry } from '../db/models/WellnessEntry';

export type WellnessInput = {
  entryDate: number;
  sleepHours?: number;
  sleepQuality?: number;
  stressLevel?: number;
  irritability?: number;
  energy?: number;
  cycleDay?: number;
  pmsLevel?: number;
  strengthSession?: number;
  proteinScore?: number;
};

const collection = database.collections.get<WellnessEntry>('wellness_entries');

export async function getWellnessEntryByDate(entryDate: number) {
  const items = await collection.query(Q.where('entry_date', entryDate)).fetch();
  return items[0] ?? null;
}

export async function getLatestWellness() {
  const items = await collection.query().fetch();
  return items.sort((a, b) => b.entryDate - a.entryDate)[0] ?? null;
}

export async function upsertWellness(data: WellnessInput) {
  await database.write(async () => {
    const existing = await getWellnessEntryByDate(data.entryDate);
    if (existing) {
      await existing.update(record => {
        record.sleepHours = data.sleepHours;
        record.sleepQuality = data.sleepQuality;
        record.stressLevel = data.stressLevel;
        record.irritability = data.irritability;
        record.energy = data.energy;
        record.cycleDay = data.cycleDay;
        record.pmsLevel = data.pmsLevel;
        record.strengthSession = data.strengthSession;
        record.proteinScore = data.proteinScore;
      });
      return;
    }

    await collection.create(record => {
      record.entryDate = data.entryDate;
      record.sleepHours = data.sleepHours;
      record.sleepQuality = data.sleepQuality;
      record.stressLevel = data.stressLevel;
      record.irritability = data.irritability;
      record.energy = data.energy;
      record.cycleDay = data.cycleDay;
      record.pmsLevel = data.pmsLevel;
      record.strengthSession = data.strengthSession;
      record.proteinScore = data.proteinScore;
    });
  });
}
