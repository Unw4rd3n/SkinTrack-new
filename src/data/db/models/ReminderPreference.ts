import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class ReminderPreference extends Model {
  static table = 'reminder_preferences';

  @field('quiet_start') quietStart?: string;
  @field('quiet_end') quietEnd?: string;
}
