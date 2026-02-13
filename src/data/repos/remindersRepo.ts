import { Q } from '@nozbe/watermelondb';
import { database } from '../db';
import { Reminder } from '../db/models/Reminder';
import { ReminderPreference } from '../db/models/ReminderPreference';

export type ReminderMessageType = 'compliment' | 'care' | 'mixed';

export type ReminderInput = {
  slot: number;
  time: string;
  enabled: boolean;
  messageType?: ReminderMessageType;
};

export type ReminderPreferencesInput = {
  quietStart?: string;
  quietEnd?: string;
};

const collection = database.collections.get<Reminder>('reminders');
const preferencesCollection = database.collections.get<ReminderPreference>('reminder_preferences');

export async function getReminders(): Promise<Reminder[]> {
  const reminders = await collection.query().fetch();
  return reminders.sort((a, b) => a.slot - b.slot);
}

export async function ensureDefaultReminders(): Promise<Reminder[]> {
  const existing = await getReminders();
  if (existing.length >= 2) {
    return existing;
  }

  const defaults: ReminderInput[] = [
    { slot: 1, time: '09:00', enabled: true, messageType: 'mixed' },
    { slot: 2, time: '21:00', enabled: true, messageType: 'mixed' },
  ];

  await upsertReminders(defaults);
  return getReminders();
}

export async function ensureDefaultReminderPreferences() {
  const existing = await preferencesCollection.query().fetch();
  if (existing[0]) {
    return existing[0];
  }

  await database.write(async () => {
    await preferencesCollection.create(record => {
      record.quietStart = '22:30';
      record.quietEnd = '07:00';
    });
  });

  const created = await preferencesCollection.query().fetch();
  return created[0] ?? null;
}

export async function getReminderPreferences() {
  const existing = await preferencesCollection.query().fetch();
  return existing[0] ?? null;
}

export async function upsertReminderPreferences(input: ReminderPreferencesInput) {
  await database.write(async () => {
    const existing = await preferencesCollection.query().fetch();
    if (existing[0]) {
      await existing[0].update(record => {
        record.quietStart = input.quietStart;
        record.quietEnd = input.quietEnd;
      });
      return;
    }

    await preferencesCollection.create(record => {
      record.quietStart = input.quietStart;
      record.quietEnd = input.quietEnd;
    });
  });
}

export async function upsertReminders(reminders: ReminderInput[]) {
  await database.write(async () => {
    const incomingSlots = new Set(reminders.map(item => item.slot));
    const existingAll = await collection.query().fetch();
    for (const existingReminder of existingAll) {
      if (!incomingSlots.has(existingReminder.slot)) {
        await existingReminder.markAsDeleted();
        await existingReminder.destroyPermanently();
      }
    }

    for (const reminder of reminders) {
      const existing = await collection
        .query(Q.where('slot', reminder.slot))
        .fetch();

      if (existing[0]) {
        await existing[0].update(record => {
          record.time = reminder.time;
          record.enabled = reminder.enabled;
          record.messageType = reminder.messageType ?? 'mixed';
        });
      } else {
        await collection.create(record => {
          record.slot = reminder.slot;
          record.time = reminder.time;
          record.enabled = reminder.enabled;
          record.messageType = reminder.messageType ?? 'mixed';
        });
      }
    }
  });
}
