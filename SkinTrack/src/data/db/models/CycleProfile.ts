import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class CycleProfile extends Model {
  static table = 'cycle_profiles';

  @field('cycle_length') cycleLength!: number;
  @field('period_length') periodLength!: number;
  @field('updated_at') updatedAt!: number;
}
