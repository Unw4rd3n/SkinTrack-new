import { Model } from '@nozbe/watermelondb';
import { date, field } from '@nozbe/watermelondb/decorators';

export class UserProfile extends Model {
  static table = 'user_profiles';

  @field('skin_type') skinType?: string;
  @field('goals') goals?: string;
  @date('created_at') createdAt!: Date;
}
