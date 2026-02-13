import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class WellnessEntry extends Model {
  static table = 'wellness_entries';

  @field('entry_date') entryDate!: number;
  @field('sleep_hours') sleepHours?: number;
  @field('sleep_quality') sleepQuality?: number;
  @field('stress_level') stressLevel?: number;
  @field('irritability') irritability?: number;
  @field('energy') energy?: number;
  @field('cycle_day') cycleDay?: number;
  @field('pms_level') pmsLevel?: number;
  @field('strength_session') strengthSession?: number;
  @field('protein_score') proteinScore?: number;
}
