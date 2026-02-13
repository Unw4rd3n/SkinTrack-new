import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export class LabResult extends Model {
  static table = 'lab_results';

  @field('entry_date') entryDate!: number;
  @text('name') name!: string;
  @field('value') value!: number;
  @text('unit') unit?: string;
  @field('ref_low') refLow?: number;
  @field('ref_high') refHigh?: number;
  @text('note') note?: string;
}
