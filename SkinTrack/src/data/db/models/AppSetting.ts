import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class AppSetting extends Model {
  static table = 'app_settings';

  @field('units') units?: string;
  @field('first_day_of_week') firstDayOfWeek?: number;
}
