import { Q } from '@nozbe/watermelondb';
import { database } from '../db';
import { CycleEvent } from '../db/models/CycleEvent';
import { toDayKey } from '../../services/date';

const collection = database.collections.get<CycleEvent>('cycle_events');

function addDaysToDayKey(dayKey: number, days: number) {
  const date = new Date(dayKey);
  date.setDate(date.getDate() + days);
  return toDayKey(date);
}

export async function getCycleEventsInRange(
  startDate: number,
  endDate: number,
) {
  const items = await collection
    .query(
      Q.where('entry_date', Q.gte(startDate)),
      Q.where('entry_date', Q.lte(endDate)),
    )
    .fetch();
  return items.sort((a, b) => a.entryDate - b.entryDate);
}

export async function getAllCycleEvents() {
  const items = await collection.query().fetch();
  return items.sort((a, b) => a.entryDate - b.entryDate);
}

export async function setPeriodDay(entryDate: number, isPeriod: boolean) {
  await database.write(async () => {
    const existing = await collection
      .query(Q.where('entry_date', entryDate))
      .fetch();
    if (existing[0]) {
      await existing[0].update(record => {
        record.isPeriod = isPeriod;
        if (isPeriod) {
          record.isPregnancy = false;
        }
      });
      if (!isPeriod && !existing[0].isPregnancy) {
        await existing[0].markAsDeleted();
        await existing[0].destroyPermanently();
      }
      return;
    }

    if (!isPeriod) {
      return;
    }
    await collection.create(record => {
      record.entryDate = entryDate;
      record.isPeriod = true;
      record.isPregnancy = false;
    });
  });
}

export async function togglePeriodDay(entryDate: number) {
  const existing = await collection
    .query(Q.where('entry_date', entryDate))
    .fetch();
  const next = !(existing[0]?.isPeriod ?? false);
  await setPeriodDay(entryDate, next);
  return next;
}

export async function setPeriodRange(
  startDate: number,
  endDate: number,
  isPeriod = true,
) {
  const from = Math.min(startDate, endDate);
  const to = Math.max(startDate, endDate);

  await database.write(async () => {
    const existing = await collection
      .query(
        Q.where('entry_date', Q.gte(from)),
        Q.where('entry_date', Q.lte(to)),
      )
      .fetch();
    const existingMap = new Map(existing.map(item => [item.entryDate, item]));

    for (
      let timestamp = from;
      timestamp <= to;
      timestamp = addDaysToDayKey(timestamp, 1)
    ) {
      const current = existingMap.get(timestamp);
      if (isPeriod) {
        if (!current) {
          await collection.create(record => {
            record.entryDate = timestamp;
            record.isPeriod = true;
            record.isPregnancy = false;
          });
        } else if (!current.isPeriod) {
          await current.update(record => {
            record.isPeriod = true;
            record.isPregnancy = false;
          });
        }
      } else if (current) {
        await current.update(record => {
          record.isPeriod = false;
        });
        if (!current.isPregnancy) {
          await current.markAsDeleted();
          await current.destroyPermanently();
        }
      }
    }
  });
}

export async function setPregnancyDay(entryDate: number, isPregnancy: boolean) {
  await database.write(async () => {
    const existing = await collection
      .query(Q.where('entry_date', entryDate))
      .fetch();
    if (existing[0]) {
      await existing[0].update(record => {
        record.isPregnancy = isPregnancy;
        if (isPregnancy) {
          record.isPeriod = false;
        }
      });
      if (!isPregnancy && !existing[0].isPeriod) {
        await existing[0].markAsDeleted();
        await existing[0].destroyPermanently();
      }
      return;
    }

    if (!isPregnancy) {
      return;
    }

    await collection.create(record => {
      record.entryDate = entryDate;
      record.isPeriod = false;
      record.isPregnancy = true;
    });
  });
}

export async function togglePregnancyDay(entryDate: number) {
  const existing = await collection
    .query(Q.where('entry_date', entryDate))
    .fetch();
  const next = !(existing[0]?.isPregnancy ?? false);
  await setPregnancyDay(entryDate, next);
  return next;
}
