import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 9,
  tables: [
    tableSchema({
      name: 'user_profiles',
      columns: [
        { name: 'skin_type', type: 'string', isOptional: true },
        { name: 'goals', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'daily_entries',
      columns: [
        { name: 'entry_date', type: 'number' },
        { name: 'dryness', type: 'number', isOptional: true },
        { name: 'oiliness', type: 'number', isOptional: true },
        { name: 'acne_level', type: 'number', isOptional: true },
        { name: 'stress', type: 'number', isOptional: true },
        { name: 'sleep_hours', type: 'number', isOptional: true },
        { name: 'water_intake', type: 'number', isOptional: true },
        { name: 'note', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'reminders',
      columns: [
        { name: 'slot', type: 'number' },
        { name: 'time', type: 'string' },
        { name: 'enabled', type: 'boolean' },
        { name: 'message_type', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'app_settings',
      columns: [
        { name: 'units', type: 'string', isOptional: true },
        { name: 'first_day_of_week', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'skin_diagnostics',
      columns: [
        { name: 'entry_date', type: 'number' },
        { name: 'density', type: 'number', isOptional: true },
        { name: 'pigmentation', type: 'number', isOptional: true },
        { name: 'vascular', type: 'number', isOptional: true },
        { name: 'wrinkles', type: 'number', isOptional: true },
        { name: 'photoaging', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'lab_results',
      columns: [
        { name: 'entry_date', type: 'number' },
        { name: 'name', type: 'string' },
        { name: 'value', type: 'number' },
        { name: 'unit', type: 'string', isOptional: true },
        { name: 'ref_low', type: 'number', isOptional: true },
        { name: 'ref_high', type: 'number', isOptional: true },
        { name: 'note', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'routine_profiles',
      columns: [
        { name: 'retinol_strength', type: 'number', isOptional: true },
        { name: 'retinol_frequency', type: 'number', isOptional: true },
        { name: 'acid_frequency', type: 'number', isOptional: true },
        { name: 'sensitivity', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'wellness_entries',
      columns: [
        { name: 'entry_date', type: 'number' },
        { name: 'sleep_hours', type: 'number', isOptional: true },
        { name: 'sleep_quality', type: 'number', isOptional: true },
        { name: 'stress_level', type: 'number', isOptional: true },
        { name: 'irritability', type: 'number', isOptional: true },
        { name: 'energy', type: 'number', isOptional: true },
        { name: 'cycle_day', type: 'number', isOptional: true },
        { name: 'pms_level', type: 'number', isOptional: true },
        { name: 'strength_session', type: 'number', isOptional: true },
        { name: 'protein_score', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'reminder_preferences',
      columns: [
        { name: 'quiet_start', type: 'string', isOptional: true },
        { name: 'quiet_end', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'cycle_events',
      columns: [
        { name: 'entry_date', type: 'number' },
        { name: 'is_period', type: 'boolean' },
        { name: 'is_pregnancy', type: 'boolean', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'cycle_profiles',
      columns: [
        { name: 'cycle_length', type: 'number' },
        { name: 'period_length', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
