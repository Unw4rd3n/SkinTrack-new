import { database } from '../db';

export async function resetAllData() {
  await database.write(async () => {
    await database.collections.get('daily_entries').query().destroyAllPermanently();
    await database.collections.get('reminders').query().destroyAllPermanently();
    await database.collections.get('user_profiles').query().destroyAllPermanently();
    await database.collections.get('app_settings').query().destroyAllPermanently();
    await database.collections.get('skin_diagnostics').query().destroyAllPermanently();
    await database.collections.get('lab_results').query().destroyAllPermanently();
    await database.collections.get('routine_profiles').query().destroyAllPermanently();
    await database.collections.get('wellness_entries').query().destroyAllPermanently();
    await database.collections.get('reminder_preferences').query().destroyAllPermanently();
    await database.collections.get('cycle_events').query().destroyAllPermanently();
    await database.collections.get('cycle_profiles').query().destroyAllPermanently();
  });
}
