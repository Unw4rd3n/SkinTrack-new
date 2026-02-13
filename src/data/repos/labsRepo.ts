import { Q } from '@nozbe/watermelondb';
import { database } from '../db';
import { LabResult } from '../db/models/LabResult';

export type LabInput = {
  entryDate: number;
  name: string;
  value: number;
  unit?: string;
  refLow?: number;
  refHigh?: number;
  note?: string;
};

const collection = database.collections.get<LabResult>('lab_results');

export function classifyLab(value: number, refLow?: number, refHigh?: number) {
  if (refLow === undefined && refHigh === undefined) {
    return 'unknown';
  }
  if (refLow !== undefined && value < refLow) {
    return 'low';
  }
  if (refHigh !== undefined && value > refHigh) {
    return 'high';
  }
  return 'normal';
}

export async function getLabResults() {
  const items = await collection.query().fetch();
  return items.sort((a, b) => b.entryDate - a.entryDate);
}

export async function getLatestLabResultsByName(name: string) {
  const items = await collection.query(Q.where('name', name)).fetch();
  return items.sort((a, b) => b.entryDate - a.entryDate)[0] ?? null;
}

export async function addLabResult(data: LabInput) {
  await database.write(async () => {
    await collection.create(record => {
      record.entryDate = data.entryDate;
      record.name = data.name;
      record.value = data.value;
      record.unit = data.unit ?? '';
      record.refLow = data.refLow ?? undefined;
      record.refHigh = data.refHigh ?? undefined;
      record.note = data.note ?? '';
    });
  });
}
