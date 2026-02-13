import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class SkinDiagnostic extends Model {
  static table = 'skin_diagnostics';

  @field('entry_date') entryDate!: number;
  @field('density') density?: number;
  @field('pigmentation') pigmentation?: number;
  @field('vascular') vascular?: number;
  @field('wrinkles') wrinkles?: number;
  @field('photoaging') photoaging?: number;
}
