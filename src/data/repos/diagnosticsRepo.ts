import { Q } from '@nozbe/watermelondb';
import { database } from '../db';
import { SkinDiagnostic } from '../db/models/SkinDiagnostic';

export type DiagnosticInput = {
  entryDate: number;
  density?: number;
  pigmentation?: number;
  vascular?: number;
  wrinkles?: number;
  photoaging?: number;
};

const collection = database.collections.get<SkinDiagnostic>('skin_diagnostics');

export async function getDiagnostics(): Promise<SkinDiagnostic[]> {
  const items = await collection.query().fetch();
  return items.sort((a, b) => b.entryDate - a.entryDate);
}

export async function getDiagnosticByDate(entryDate: number) {
  const result = await collection.query(Q.where('entry_date', entryDate)).fetch();
  return result[0] ?? null;
}

export async function getLatestDiagnostic() {
  const items = await getDiagnostics();
  return items[0] ?? null;
}

export async function getPreviousDiagnostic(referenceDate: number, daysBack = 30) {
  const items = await getDiagnostics();
  const target = referenceDate - daysBack * 24 * 60 * 60 * 1000;
  const previous = items.find(item => item.entryDate <= target);
  return previous ?? null;
}

export async function upsertDiagnostic(data: DiagnosticInput) {
  await database.write(async () => {
    const existing = await getDiagnosticByDate(data.entryDate);
    if (existing) {
      await existing.update(record => {
        record.density = data.density;
        record.pigmentation = data.pigmentation;
        record.vascular = data.vascular;
        record.wrinkles = data.wrinkles;
        record.photoaging = data.photoaging;
      });
      return;
    }

    await collection.create(record => {
      record.entryDate = data.entryDate;
      record.density = data.density;
      record.pigmentation = data.pigmentation;
      record.vascular = data.vascular;
      record.wrinkles = data.wrinkles;
      record.photoaging = data.photoaging;
    });
  });
}
