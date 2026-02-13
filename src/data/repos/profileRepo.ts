import { database } from '../db';
import { UserProfile } from '../db/models/UserProfile';

export type ProfileInput = {
  skinType?: string | null;
  goals?: string | null;
};

const collection = database.collections.get<UserProfile>('user_profiles');

export async function getProfile() {
  const profiles = await collection.query().fetch();
  return profiles[0] ?? null;
}

export async function upsertProfile(data: ProfileInput) {
  await database.write(async () => {
    const existing = await getProfile();
    if (existing) {
      await existing.update(record => {
        record.skinType = data.skinType ?? undefined;
        record.goals = data.goals ?? undefined;
      });
      return;
    }

    await collection.create(record => {
      record.skinType = data.skinType ?? undefined;
      record.goals = data.goals ?? undefined;
      record.createdAt = new Date();
    });
  });
}
