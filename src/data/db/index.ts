import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { migrations } from './migrations';
import {
  AppSetting,
  DailyEntry,
  Reminder,
  UserProfile,
  SkinDiagnostic,
  LabResult,
  RoutineProfile,
  WellnessEntry,
  ReminderPreference,
  CycleEvent,
  CycleProfile,
} from './models';

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: true,
  onSetUpError: error => {
    console.error('WatermelonDB setup error', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [
    UserProfile,
    DailyEntry,
    Reminder,
    AppSetting,
    SkinDiagnostic,
    LabResult,
    RoutineProfile,
    WellnessEntry,
    ReminderPreference,
    CycleEvent,
    CycleProfile,
  ],
});
