import { getUser } from '@repo/auth/server';
import { flag } from 'flags/next';

export const createFlag = (key: string) =>
  flag({
    key,
    defaultValue: false,
    async decide() {
      try {
        const user = await getUser();

        if (!user?.id) {
          return this.defaultValue as boolean;
        }

        // Feature flags now default to the defaultValue without analytics
        // This can be extended with a different feature flag service if needed
        return this.defaultValue as boolean;
      } catch (_error) {
        return this.defaultValue as boolean;
      }
    },
  });
