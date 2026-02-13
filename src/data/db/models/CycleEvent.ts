import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class CycleEvent extends Model {
  static table = 'cycle_events';

  @field('entry_date') entryDate!: number;
  @field('is_period') isPeriod!: boolean;
  @field('is_pregnancy') isPregnancy?: boolean;
}
