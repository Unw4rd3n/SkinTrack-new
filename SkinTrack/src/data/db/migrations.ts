import {
  schemaMigrations,
  createTable,
} from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        createTable({
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
      ],
    },
    {
      toVersion: 3,
      steps: [
        createTable({
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
      ],
    },
    {
      toVersion: 4,
      steps: [
        createTable({
          name: 'routine_profiles',
          columns: [
            { name: 'retinol_strength', type: 'number', isOptional: true },
            { name: 'retinol_frequency', type: 'number', isOptional: true },
            { name: 'acid_frequency', type: 'number', isOptional: true },
            { name: 'sensitivity', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 5,
      steps: [
        createTable({
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
      ],
    },
    {
      toVersion: 6,
      steps: [
        {
          type: 'add_columns',
          table: 'reminders',
          columns: [{ name: 'message_type', type: 'string', isOptional: true }],
        },
        createTable({
          name: 'reminder_preferences',
          columns: [
            { name: 'quiet_start', type: 'string', isOptional: true },
            { name: 'quiet_end', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 7,
      steps: [
        createTable({
          name: 'cycle_events',
          columns: [
            { name: 'entry_date', type: 'number' },
            { name: 'is_period', type: 'boolean' },
          ],
        }),
      ],
    },
    {
      toVersion: 8,
      steps: [
        createTable({
          name: 'cycle_profiles',
          columns: [
            { name: 'cycle_length', type: 'number' },
            { name: 'period_length', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
    {
      toVersion: 9,
      steps: [
        {
          type: 'add_columns',
          table: 'cycle_events',
          columns: [
            { name: 'is_pregnancy', type: 'boolean', isOptional: true },
          ],
        },
      ],
    },
  ],
});
