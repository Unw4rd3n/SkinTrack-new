import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class RoutineProfile extends Model {
  static table = 'routine_profiles';

  @field('retinol_strength') retinolStrength?: number;
  @field('retinol_frequency') retinolFrequency?: number;
  @field('acid_frequency') acidFrequency?: number;
  @field('sensitivity') sensitivity?: number;
}
