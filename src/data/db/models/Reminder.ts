import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class Reminder extends Model {
  static table = 'reminders';

  @field('slot') slot!: number;
  @field('time') time!: string;
  @field('enabled') enabled!: boolean;
  @field('message_type') messageType?: string;
}
