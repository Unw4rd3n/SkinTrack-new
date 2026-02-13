import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export class DailyEntry extends Model {
  static table = 'daily_entries';

  @field('entry_date') entryDate!: number;
  @field('dryness') dryness?: number;
  @field('oiliness') oiliness?: number;
  @field('acne_level') acneLevel?: number;
  @field('stress') stress?: number;
  @field('sleep_hours') sleepHours?: number;
  @field('water_intake') waterIntake?: number;
  @text('note') note?: string;
}
